import { NoCodeBackendError } from './errors'

const DATA_PROXY_URL = import.meta.env.VITE_DATA_PROXY_URL ?? '/api/ncb/data'

const parsePayload = async (response) => {
  const contentType = response.headers.get('content-type') ?? ''
  return contentType.includes('application/json') ? response.json() : response.text()
}

const unwrap = (payload) => payload?.data ?? payload

export const requestDataEndpoint = async (path, { method = 'GET', body } = {}) => {
  let response
  try {
    response = await fetch(`${DATA_PROXY_URL}/${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch (cause) {
    throw new NoCodeBackendError('Could not reach the NoCodeBackend data endpoint.', {
      code: 'NCB_NETWORK_ERROR', cause
    })
  }

  const payload = await parsePayload(response)
  if (!response.ok) {
    throw new NoCodeBackendError(
      typeof payload === 'string' ? payload : payload?.message ?? payload?.error ?? 'NoCodeBackend data request failed.',
      { code: payload?.code ?? 'NCB_REQUEST_FAILED', status: response.status, details: payload }
    )
  }

  return unwrap(payload)
}
