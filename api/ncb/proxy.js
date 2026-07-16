import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { domainCreateSchemasByCollection, domainPatchSchemasByCollection } from '../../src/domains/schemas.js'

const MAX_BODY_BYTES = 32 * 1024
const UPSTREAM_TIMEOUT_MS = 10000
const HOP_BY_HOP_HEADERS = new Set(['connection', 'content-encoding', 'content-length', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade'])
const FORWARDED_RESPONSE_HEADERS = new Set(['content-type', 'cache-control', 'etag', 'last-modified', 'location', 'www-authenticate'])
const objectPayload = z.object({}).passthrough()
const dataPayloadSchema = (path, method) => {
  const schema = method === 'POST' ? domainCreateSchemasByCollection[path[0]] : domainPatchSchemasByCollection[path[0]]
  return schema ?? objectPayload
}
const credentialsPayload = z.object({ email: z.string().email().max(254), password: z.string().min(8).max(256) }).strict()
const id = z.string().min(1).max(200).regex(/^[A-Za-z0-9._-]+$/)
const collection = z.enum(['user-preferences', 'tasks', 'projects', 'subtasks', 'routines', 'routine-steps', 'routine-sessions', 'housework-tasks', 'housework-completions', 'inbox-items'])
const dataQuery = z.object({ user_id: z.string().min(1).max(200).optional(), routine_id: id.optional(), task_id: id.optional(), status: z.enum(['in_progress', 'completed', 'cancelled']).optional() }).strict()
const emptyQuery = z.object({}).strict()

const routes = {
  auth: [
    { path: ['sign-up', 'email'], query: emptyQuery, methods: { POST: credentialsPayload } },
    { path: ['sign-in', 'email'], query: emptyQuery, methods: { POST: credentialsPayload } },
    { path: ['sign-out'], query: emptyQuery, methods: { POST: z.undefined() } },
    { path: ['get-session'], query: emptyQuery, methods: { GET: z.undefined() } }
  ],
  data: [
    { path: [collection], query: dataQuery, methods: { GET: z.undefined(), POST: objectPayload } },
    { path: [collection, id], query: dataQuery, methods: { GET: z.undefined(), PATCH: objectPayload, DELETE: z.undefined() } }
  ]
}

const apiError = (res, status, code, correlationId) => {
  res.setHeader('X-Correlation-Id', correlationId)
  res.status(status).json({ error: { code, correlationId } })
}

const getPath = (path) => (Array.isArray(path) ? path : typeof path === 'string' ? path.split('/') : []).filter(Boolean)

const findRoute = (scope, path) => routes[scope].find((route) =>
  route.path.length === path.length && route.path.every((segment, index) => typeof segment === 'string' ? segment === path[index] : segment.safeParse(path[index]).success)
)

const readJsonBody = (req) => new Promise((resolve, reject) => {
  let size = 0
  const chunks = []
  let rejected = false
  req.on('data', (chunk) => {
    if (rejected) return
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      rejected = true
      reject(Object.assign(new Error('body too large'), { code: 'BODY_TOO_LARGE' }))
      req.resume()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    if (size === 0) return resolve(undefined)
    try {
      resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')))
    } catch {
      reject(Object.assign(new Error('invalid JSON'), { code: 'INVALID_JSON' }))
    }
  })
  req.on('error', reject)
})

const requestOrigin = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto']
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : (forwardedProto?.split(',')[0] || (req.socket?.encrypted ? 'https' : 'http'))
  return `${protocol}://${req.headers.host}`
}

const isSameOrigin = (req) => {
  const origin = req.headers.origin
  if (!origin) return true
  try { return new URL(origin).origin === requestOrigin(req) } catch { return false }
}

const hasValidCsrfContext = (req) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true
  const origin = req.headers.origin
  if (!origin || !isSameOrigin(req)) return false
  const referer = req.headers.referer
  if (!referer) return true
  try { return new URL(referer).origin === requestOrigin(req) } catch { return false }
}

const upstreamUrl = (scope, path, query) => {
  const base = process.env.NCB_API_BASE_URL
  if (!base || !process.env.NCB_SECRET_KEY) return null
  const url = new URL(`${base.replace(/\/$/, '')}/${scope === 'data' ? 'data/' : ''}${path.map(encodeURIComponent).join('/')}`)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === 'string') url.searchParams.set(key, value)
  }
  return url
}

const copySetCookies = (response, res) => {
  const cookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
}

export const createNcbHandler = (scope) => async (req, res) => {
  const correlationId = randomUUID()
  const path = getPath(req.query?.path)
  const route = findRoute(scope, path)
  const method = req.method?.toUpperCase()

  if (!route) return apiError(res, 404, 'NCB_ROUTE_NOT_FOUND', correlationId)
  if (!method || !Object.hasOwn(route.methods, method)) return apiError(res, 405, 'NCB_METHOD_NOT_ALLOWED', correlationId)
  if (!isSameOrigin(req)) return apiError(res, 403, 'NCB_CROSS_ORIGIN_REJECTED', correlationId)
  if (!hasValidCsrfContext(req)) return apiError(res, 403, 'NCB_CSRF_REJECTED', correlationId)

  const { path: _path, ...query } = req.query ?? {}
  const parsedQuery = route.query.safeParse(query)
  if (!parsedQuery.success) return apiError(res, 400, 'NCB_INVALID_REQUEST', correlationId)

  let body
  try {
    body = ['GET', 'HEAD'].includes(method) ? undefined : await readJsonBody(req)
  } catch (error) {
    return apiError(res, error.code === 'BODY_TOO_LARGE' ? 413 : 400, error.code === 'BODY_TOO_LARGE' ? 'NCB_BODY_TOO_LARGE' : 'NCB_INVALID_JSON', correlationId)
  }

  const schema = scope === 'data' && ['POST', 'PATCH'].includes(method) ? dataPayloadSchema(path, method) : route.methods[method]
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(res, 400, 'NCB_INVALID_REQUEST', correlationId)

  const target = upstreamUrl(scope, path, parsedQuery.data)
  if (!target) return apiError(res, 503, 'NCB_SERVICE_UNAVAILABLE', correlationId)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const headers = { Authorization: `Bearer ${process.env.NCB_SECRET_KEY}`, Accept: 'application/json', 'X-Correlation-Id': correlationId }
    if (req.headers.cookie) headers.Cookie = req.headers.cookie
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const upstream = await fetch(target, { method, headers, body: body === undefined ? undefined : JSON.stringify(parsed.data), signal: controller.signal, redirect: 'manual' })
    const upstreamBody = Buffer.from(await upstream.arrayBuffer())
    copySetCookies(upstream, res)
    if (!upstream.ok) {
      const safeStatus = [400, 401, 403, 404, 409, 422, 429].includes(upstream.status) ? upstream.status : 502
      return apiError(res, safeStatus, 'NCB_UPSTREAM_REQUEST_FAILED', correlationId)
    }
    upstream.headers.forEach((value, key) => { if (FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase()) && !HOP_BY_HOP_HEADERS.has(key.toLowerCase())) res.setHeader(key, value) })
    res.setHeader('X-Correlation-Id', correlationId)
    return res.status(upstream.status).send(upstreamBody)
  } catch {
    return apiError(res, 502, 'NCB_UPSTREAM_UNAVAILABLE', correlationId)
  } finally {
    clearTimeout(timeout)
  }
}
