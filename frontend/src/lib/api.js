// Talks ONLY to the Ballerina gateway (:9000) — never to FastAPI directly.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:9000'
const API_KEY = import.meta.env.VITE_API_KEY || 'demo-secret-key-123'

export class ApiError extends Error {
  constructor(status, code, detail) {
    super(detail || code)
    this.status = status
    this.code = code
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include', // sends/receives the HttpOnly session cookie
      headers: {
        'x-api-key': API_KEY,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  } catch (err) {
    throw new ApiError(0, 'CONNECTION_FAILED', err.message)
  }

  let data = null
  try {
    data = await res.json()
  } catch {
    // response had no JSON body
  }

  if (!res.ok) {
    const detail = data && (data.detail || data.message)
    if (res.status === 401) throw new ApiError(401, 'UNAUTHORIZED', detail)
    if (res.status === 400 || res.status === 422) throw new ApiError(res.status, 'BAD_REQUEST', detail)
    if (res.status === 502 || res.status === 503) throw new ApiError(res.status, 'BACKEND_OFFLINE', detail)
    throw new ApiError(res.status, 'REQUEST_FAILED', detail)
  }
  return data
}

export const api = {
  health: () => request('/health'),
  predict: (message) => request('/predict', { method: 'POST', body: { message } }),
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),
  scans: () => request('/scans'),
  deleteScan: (id) => request(`/scans/${id}`, { method: 'DELETE' }),
  clearScans: () => request('/scans', { method: 'DELETE' }),
  saveScan: (id) => request(`/scans/${id}/save`, { method: 'POST' }),
  unsaveScan: (id) => request(`/scans/${id}/save`, { method: 'DELETE' }),
  stats: () => request('/stats'),
  model: () => request('/model'),
}
