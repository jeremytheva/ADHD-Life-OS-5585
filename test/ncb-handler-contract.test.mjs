/* global Buffer, Response, process */

import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import test from 'node:test'
import { createNcbHandler } from '../api/ncb/handler.js'

const originalFetch = globalThis.fetch
const originalBaseUrl = process.env.NCB_API_BASE_URL
const originalSecret = process.env.NCB_SECRET_KEY

const makeRequest = ({ method = 'GET', path = [], query = {}, headers = {}, body } = {}) => {
  const request = Readable.from(body === undefined ? [] : [Buffer.from(body)])
  request.method = method
  request.query = { path, ...query }
  request.headers = { host: 'app.example.test', ...headers }
  request.socket = {}
  return request
}

const makeResponse = () => ({
  headers: new Map(),
  statusCode: null,
  payload: null,
  setHeader(name, value) { this.headers.set(name.toLowerCase(), value) },
  status(status) { this.statusCode = status; return this },
  json(payload) { this.payload = payload; return this },
  send(payload) { this.payload = payload; return this }
})

test.after(() => {
  globalThis.fetch = originalFetch
  if (originalBaseUrl === undefined) delete process.env.NCB_API_BASE_URL
  else process.env.NCB_API_BASE_URL = originalBaseUrl
  if (originalSecret === undefined) delete process.env.NCB_SECRET_KEY
  else process.env.NCB_SECRET_KEY = originalSecret
})

test('rejects routes, methods, CSRF failures, and malformed bodies before fetch', async () => {
  process.env.NCB_API_BASE_URL = 'https://ncb.example.test/v1'
  process.env.NCB_SECRET_KEY = 'server-secret'
  let calls = 0
  globalThis.fetch = async () => { calls += 1; throw new Error('must not be called') }
  const handler = createNcbHandler('auth')

  for (const request of [
    makeRequest({ path: ['not-allowed'] }),
    makeRequest({ method: 'DELETE', path: ['get-session'] }),
    makeRequest({ method: 'POST', path: ['sign-out'] }),
    makeRequest({ method: 'POST', path: ['sign-in', 'email'], headers: { origin: 'https://app.example.test', 'content-type': 'application/json' }, body: '{bad' })
  ]) {
    const response = makeResponse()
    await handler(request, response)
    assert.ok([400, 403, 404, 405].includes(response.statusCode))
    assert.match(response.payload.error.code, /^NCB_/)
    assert.match(response.payload.error.correlationId, /^[0-9a-f-]{36}$/)
  }
  assert.equal(calls, 0)
})

test('forwards only approved request data and preserves upstream cookies', async () => {
  process.env.NCB_API_BASE_URL = 'https://ncb.example.test/v1'
  process.env.NCB_SECRET_KEY = 'server-secret'
  let captured
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/get-session')) {
      return new Response(JSON.stringify({ data: { user: { id: 'user-1' } } }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    captured = { url: String(url), options }
    return new Response(JSON.stringify({ data: { id: 'task-1', user_id: 'user-1', title: 'Write tests', description: '', due_date: null, estimated_duration: 30, is_essential: false, completed: false, project_id: null, category: null, tags: [] } }), {
      status: 200,
      headers: { 'content-type': 'application/json', 'set-cookie': 'ncb_session=abc; HttpOnly' }
    })
  }
  const request = makeRequest({
    method: 'POST',
    path: ['tasks'],
    headers: { origin: 'https://app.example.test', 'x-forwarded-proto': 'https', cookie: 'ncb_session=old', 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: 'user-1', title: 'Write tests' })
  })
  const response = makeResponse()
  await createNcbHandler('data')(request, response)

  assert.equal(response.statusCode, 200)
  assert.equal(captured.url, 'https://ncb.example.test/v1/data/tasks?user_id=user-1')
  assert.equal(captured.options.headers.Authorization, 'Bearer server-secret')
  assert.equal(captured.options.headers.Cookie, 'ncb_session=old')
  assert.equal(captured.options.headers.Origin, undefined)
  assert.equal(JSON.parse(captured.options.body).user_id, 'user-1')
  assert.equal(response.headers.get('set-cookie')[0], 'ncb_session=abc; HttpOnly')
})

test('rejects malformed upstream domain records with a structured proxy error', async () => {
  process.env.NCB_API_BASE_URL = 'https://ncb.example.test/v1'
  process.env.NCB_SECRET_KEY = 'server-secret'
  globalThis.fetch = async (url) => new Response(JSON.stringify(String(url).endsWith('/get-session')
    ? { data: { user: { id: 'user-1' } } }
    : { data: { id: 'task-1', title: 42 } }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  })
  const response = makeResponse()
  await createNcbHandler('data')(makeRequest({
    method: 'GET',
    path: ['tasks', 'task-1'],
    headers: { origin: 'https://app.example.test', 'x-forwarded-proto': 'https' }
  }), response)

  assert.equal(response.statusCode, 502)
  assert.equal(response.payload.error.code, 'NCB_INVALID_RESPONSE')
  assert.match(response.payload.error.correlationId, /^[0-9a-f-]{36}$/)
})

test('rejects cross-user data attempts after session verification without data upstream requests', async () => {
  process.env.NCB_API_BASE_URL = 'https://ncb.example.test/v1'
  process.env.NCB_SECRET_KEY = 'server-secret'
  const calls = []
  globalThis.fetch = async (url) => {
    calls.push(String(url))
    assert.match(String(url), /\/get-session$/)
    return new Response(JSON.stringify({ data: { user: { id: 'user-1' } } }), { status: 200, headers: { 'content-type': 'application/json' } })
  }
  const handler = createNcbHandler('data')
  const crossUserRequests = [
    makeRequest({ path: ['tasks'], query: { user_id: 'user-2' }, headers: { origin: 'https://app.example.test', 'x-forwarded-proto': 'https' } }),
    makeRequest({ method: 'POST', path: ['tasks'], headers: { origin: 'https://app.example.test', 'x-forwarded-proto': 'https', 'content-type': 'application/json' }, body: JSON.stringify({ user_id: 'user-2', title: 'Attempt cross-user create' }) }),
    makeRequest({ path: ['tasks', 'task-2'], query: { user_id: 'user-2' }, headers: { origin: 'https://app.example.test', 'x-forwarded-proto': 'https' } }),
    makeRequest({ method: 'PATCH', path: ['tasks', 'task-2'], query: { user_id: 'user-2' }, headers: { origin: 'https://app.example.test', 'x-forwarded-proto': 'https', 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Attempt cross-user update' }) }),
    makeRequest({ method: 'DELETE', path: ['tasks', 'task-2'], query: { user_id: 'user-2' }, headers: { origin: 'https://app.example.test', 'x-forwarded-proto': 'https' } })
  ]

  for (const request of crossUserRequests) {
    const response = makeResponse()
    await handler(request, response)
    assert.equal(response.statusCode, 403)
    assert.equal(response.payload.error.code, 'NCB_USER_ID_MISMATCH')
  }
  assert.equal(calls.length, crossUserRequests.length)
  assert.ok(calls.every((url) => !url.includes('/data/')))
})
