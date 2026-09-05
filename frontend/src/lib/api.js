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

async function request(path, { method = 'GET', body, formData } = {}) {
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include', // sends/receives the HttpOnly session cookie
      headers: {
        'x-api-key': API_KEY,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: formData ? formData : body ? JSON.stringify(body) : undefined,
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
    if (res.status === 404) throw new ApiError(404, 'NOT_FOUND', detail)
    if (res.status === 409) throw new ApiError(409, 'CONFLICT', detail)
    if (res.status === 400 || res.status === 422) throw new ApiError(res.status, 'BAD_REQUEST', detail)
    if (res.status === 502 || res.status === 503) throw new ApiError(res.status, 'BACKEND_OFFLINE', detail)
    throw new ApiError(res.status, 'REQUEST_FAILED', detail)
  }
  return data
}

function queryString(params) {
  const usp = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.set(k, v)
  })
  const s = usp.toString()
  return s ? `?${s}` : ''
}

export const api = {
  health: () => request('/health'),
  predict: (message) => request('/predict', { method: 'POST', body: { message } }),
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  me: () => request('/auth/me'),

  // Messages — the persisted, searchable store that replaced /scans.
  createMessage: (message) => request('/messages', { method: 'POST', body: { message } }),
  listMessages: (params) => request(`/messages${queryString(params)}`),
  getMessage: (id) => request(`/messages/${id}`),
  updateMessage: (id, message) => request(`/messages/${id}`, { method: 'PUT', body: { message } }),
  deleteMessage: (id) => request(`/messages/${id}`, { method: 'DELETE' }),

  // Feedback
  submitFeedback: (id, payload) => request(`/messages/${id}/feedback`, { method: 'POST', body: payload }),
  getFeedback: (id) => request(`/messages/${id}/feedback`),
  listFeedback: () => request('/feedback'),

  // Batch CSV
  uploadBatch: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/batch', { method: 'POST', formData })
  },
  exportBatch: async (batchId) => {
    const res = await fetch(`${API_URL}/batch/${batchId}/export`, {
      credentials: 'include',
      headers: { 'x-api-key': API_KEY },
    })
    if (!res.ok) throw new ApiError(res.status, 'REQUEST_FAILED', 'could not export batch')
    return res.blob()
  },

  dashboard: () => request('/dashboard'),
  model: () => request('/model'),

  adminStats: () => request('/admin/stats'),
  adminUsers: () => request('/admin/users'),
  adminDeleteUser: (id) => request(`/admin/users/${id}`, { method: 'DELETE' }),
  adminMessages: () => request('/admin/messages'),
}
