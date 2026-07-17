import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { domainCreateSchemasByCollection, domainPatchSchemasByCollection, domainSchemasByCollection } from '../../src/domains/schemas.js'

const MAX_BODY_BYTES = 32 * 1024
const UPSTREAM_TIMEOUT_MS = 10000
const SAFE_UPSTREAM_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429])
const FORWARDED_RESPONSE_HEADERS = new Set(['cache-control', 'content-type', 'etag', 'last-modified', 'location', 'www-authenticate'])
const COLLECTIONS = ['user-preferences', 'tasks', 'projects', 'subtasks', 'routines', 'routine-steps', 'routine-sessions', 'housework-tasks', 'housework-completions', 'inbox-items']

const identifierSchema = z.string().min(1).max(200).regex(/^[A-Za-z0-9._-]+$/)
const collectionSchema = z.enum(COLLECTIONS)
const emptyQuerySchema = z.object({}).strict()
const dataQuerySchema = z.object({
  user_id: identifierSchema.optional(),
  routine_id: identifierSchema.optional(),
  task_id: identifierSchema.optional(),
  status: z.enum(['in_progress', 'completed', 'cancelled']).optional()
}).strict()
const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(256)
}).strict()
const sessionUserSchema = z.object({ id: z.union([identifierSchema, z.number().int().nonnegative()]) }).passthrough()

// This is intentionally an explicit API contract, rather than a path proxy.
const ROUTES = Object.freeze({
  auth: [
    { path: ['sign-up', 'email'], query: emptyQuerySchema, methods: { POST: credentialsSchema } },
    { path: ['sign-in', 'email'], query: emptyQuerySchema, methods: { POST: credentialsSchema } },
    { path: ['sign-out'], query: emptyQuerySchema, methods: { POST: z.undefined() } },
    { path: ['get-session'], query: emptyQuerySchema, methods: { GET: z.undefined() } }
  ],
  data: [
    { path: [collectionSchema], query: dataQuerySchema, methods: { GET: z.undefined(), POST: null } },
    { path: [collectionSchema, identifierSchema], query: dataQuerySchema, methods: { GET: z.undefined(), PATCH: null, DELETE: z.undefined() } }
  ]
})

const apiError = (res, status, code, correlationId) => {
  res.setHeader('X-Correlation-Id', correlationId)
  return res.status(status).json({ error: { code, correlationId } })
}

const normalizePath = (value) => (Array.isArray(value) ? value : typeof value === 'string' ? value.split('/') : []).filter(Boolean)
const findRoute = (scope, path) => ROUTES[scope].find((route) => route.path.length === path.length && route.path.every((segment, index) => typeof segment === 'string' ? segment === path[index] : segment.safeParse(path[index]).success))

const requestOrigin = (req) => {
  const forwardedProto = req.headers['x-forwarded-proto']
  const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto?.split(',')[0]?.trim()
  return `${protocol || (req.socket?.encrypted ? 'https' : 'http')}://${req.headers.host}`
}

const isSameOrigin = (req, value) => {
  try { return new URL(value).origin === requestOrigin(req) } catch { return false }
}

const hasValidRequestContext = (req, method) => {
  const origin = req.headers.origin
  if (origin && !isSameOrigin(req, origin)) return { code: 'NCB_CROSS_ORIGIN_REJECTED' }
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return {}
  // State-changing cookie requests must include an origin that we can verify.
  if (!origin || !isSameOrigin(req, origin)) return { code: 'NCB_CSRF_REJECTED' }
  const referer = req.headers.referer
  if (referer && !isSameOrigin(req, referer)) return { code: 'NCB_CSRF_REJECTED' }
  return {}
}

const readJsonBody = (req) => new Promise((resolve, reject) => {
  const declaredLength = Number(req.headers['content-length'])
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    reject({ code: 'NCB_BODY_TOO_LARGE' })
    return
  }
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try { resolve(JSON.parse(req.body)) } catch { reject({ code: 'NCB_INVALID_JSON' }) }
    } else if (Buffer.isBuffer(req.body)) {
      try { resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(req.body))) } catch { reject({ code: 'NCB_INVALID_JSON' }) }
    } else resolve(req.body)
    return
  }
  let size = 0
  const chunks = []
  let failed = false
  req.on('data', (chunk) => {
    if (failed) return
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      failed = true
      reject({ code: 'NCB_BODY_TOO_LARGE' })
      req.resume()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    if (failed || size === 0) return resolve(undefined)
    try {
      resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))))
    } catch {
      reject({ code: 'NCB_INVALID_JSON' })
    }
  })
  req.on('error', () => reject({ code: 'NCB_INVALID_JSON' }))
})

const requestSchema = (scope, route, path, method) => {
  if (scope !== 'data' || !['POST', 'PATCH'].includes(method)) return route.methods[method]
  return method === 'POST' ? domainCreateSchemasByCollection[path[0]] : domainPatchSchemasByCollection[path[0]]
}

// The proxy is also a trust boundary for responses.  Do not relay a record the
// browser would later reject into component state; return a stable API error
// with the request correlation id instead.
const hasValidDataResponse = (path, method, responseBody) => {
  if (method === 'DELETE') return true
  const schema = domainSchemasByCollection[path[0]]
  if (!schema) return false
  let parsed
  try { parsed = JSON.parse(responseBody.toString('utf8')) } catch { return false }
  const data = parsed?.data ?? parsed
  return (path.length === 1 && method === 'GET' ? z.array(schema) : schema).safeParse(data).success
}

const getUpstreamUrl = (scope, path, query) => {
  if (!process.env.NCB_API_BASE_URL || !process.env.NCB_SECRET_KEY) return null
  try {
    const base = new URL(process.env.NCB_API_BASE_URL)
    if (!['http:', 'https:'].includes(base.protocol)) return null
    const prefix = scope === 'data' ? 'data/' : ''
    const target = new URL(`${base.pathname.replace(/\/$/, '')}/${prefix}${path.map(encodeURIComponent).join('/')}`, base.origin)
    for (const [key, value] of Object.entries(query)) target.searchParams.set(key, value)
    return target
  } catch {
    return null
  }
}

const sessionUserFromResponse = (responseBody) => {
  let payload
  try { payload = JSON.parse(responseBody.toString('utf8')) } catch { return null }
  const user = payload?.user ?? payload?.data?.user ?? payload?.data?.session?.user ?? payload?.session?.user ?? null
  const parsed = sessionUserSchema.safeParse(user)
  return parsed.success ? String(parsed.data.id) : null
}

const getAuthenticatedUserId = async (req, correlationId) => {
  const target = getUpstreamUrl('auth', ['get-session'], {})
  if (!target) return { code: 'NCB_SERVICE_UNAVAILABLE', status: 503 }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const headers = { Authorization: `Bearer ${process.env.NCB_SECRET_KEY}`, Accept: 'application/json', 'X-Correlation-Id': correlationId }
    if (req.headers.cookie) headers.Cookie = req.headers.cookie
    const upstream = await fetch(target, { method: 'GET', headers, signal: controller.signal, redirect: 'manual' })
    if (!upstream.ok) return { code: 'NCB_AUTH_REQUIRED', status: 401 }
    const userId = sessionUserFromResponse(Buffer.from(await upstream.arrayBuffer()))
    return userId ? { userId } : { code: 'NCB_AUTH_REQUIRED', status: 401 }
  } catch {
    return { code: 'NCB_UPSTREAM_UNAVAILABLE', status: 502 }
  } finally {
    clearTimeout(timeout)
  }
}

const constrainDataRequestToUser = (query, body, method, userId) => {
  if (query.user_id !== undefined && query.user_id !== userId) return { code: 'NCB_USER_ID_MISMATCH' }
  if (method === 'POST' && body?.user_id !== undefined && String(body.user_id) !== userId) return { code: 'NCB_USER_ID_MISMATCH' }
  return {
    query: { ...query, user_id: userId },
    body: method === 'POST' ? { ...body, user_id: userId } : body
  }
}

const forwardSetCookies = (upstream, res) => {
  const cookies = typeof upstream.headers.getSetCookie === 'function'
    ? upstream.headers.getSetCookie()
    : upstream.headers.get('set-cookie') ? [upstream.headers.get('set-cookie')] : []
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
}

export const createNcbHandler = (scope) => async (req, res) => {
  const correlationId = randomUUID()
  const path = normalizePath(req.query?.path)
  const route = findRoute(scope, path)
  const method = req.method?.toUpperCase()

  if (!route) return apiError(res, 404, 'NCB_ROUTE_NOT_FOUND', correlationId)
  if (!method || !Object.hasOwn(route.methods, method)) return apiError(res, 405, 'NCB_METHOD_NOT_ALLOWED', correlationId)
  const context = hasValidRequestContext(req, method)
  if (context.code) return apiError(res, 403, context.code, correlationId)

  const { path: ignoredPath, ...query } = req.query ?? {}
  const parsedQuery = route.query.safeParse(query)
  if (!parsedQuery.success) return apiError(res, 400, 'NCB_INVALID_REQUEST', correlationId)

  const contentType = req.headers['content-type']
  if (contentType && !contentType.toLowerCase().startsWith('application/json')) return apiError(res, 400, 'NCB_INVALID_JSON', correlationId)
  let body
  try { body = await readJsonBody(req) } catch (error) { return apiError(res, error.code === 'NCB_BODY_TOO_LARGE' ? 413 : 400, error.code ?? 'NCB_INVALID_JSON', correlationId) }
  if (scope === 'data') {
    // The browser cache is not an authority. Resolve ownership from the
    // upstream session before an allowlisted data endpoint is ever contacted.
    const identity = await getAuthenticatedUserId(req, correlationId)
    if (identity.code) return apiError(res, identity.status, identity.code, correlationId)
    const constrained = constrainDataRequestToUser(parsedQuery.data, body, method, identity.userId)
    if (constrained.code) return apiError(res, 403, constrained.code, correlationId)
    body = constrained.body
    parsedQuery.data = constrained.query
  }
  const schema = requestSchema(scope, route, path, method)
  const parsedBody = schema?.safeParse(body)
  if (!parsedBody?.success) return apiError(res, 400, 'NCB_INVALID_REQUEST', correlationId)

  const target = getUpstreamUrl(scope, path, parsedQuery.data)
  if (!target) return apiError(res, 503, 'NCB_SERVICE_UNAVAILABLE', correlationId)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    // Do not copy browser-controlled headers. The secret is owned by this runtime.
    const headers = { Authorization: `Bearer ${process.env.NCB_SECRET_KEY}`, Accept: 'application/json', 'X-Correlation-Id': correlationId }
    if (req.headers.cookie) headers.Cookie = req.headers.cookie
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const upstream = await fetch(target, { method, headers, body: body === undefined ? undefined : JSON.stringify(parsedBody.data), signal: controller.signal, redirect: 'manual' })
    const responseBody = Buffer.from(await upstream.arrayBuffer())
    forwardSetCookies(upstream, res)
    if (!upstream.ok) return apiError(res, SAFE_UPSTREAM_STATUSES.has(upstream.status) ? upstream.status : 502, 'NCB_UPSTREAM_REQUEST_FAILED', correlationId)
    if (scope === 'data' && !hasValidDataResponse(path, method, responseBody)) return apiError(res, 502, 'NCB_INVALID_RESPONSE', correlationId)
    upstream.headers.forEach((value, key) => { if (FORWARDED_RESPONSE_HEADERS.has(key.toLowerCase())) res.setHeader(key, value) })
    res.setHeader('X-Correlation-Id', correlationId)
    return res.status(upstream.status).send(responseBody)
  } catch {
    return apiError(res, 502, 'NCB_UPSTREAM_UNAVAILABLE', correlationId)
  } finally {
    clearTimeout(timeout)
  }
}
