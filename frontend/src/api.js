const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080/api'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || `Request failed (${response.status})`)
  return body
}

export const api = {
  health: () => request('/health'),
  accounts: () => request('/accounts'),
  transactions: () => request('/transactions'),
  alerts: () => request('/alerts'),
  createAccount: (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) }),
  deposit: (id, data) => request(`/accounts/${id}/deposit`, { method: 'POST', body: JSON.stringify(data) }),
  withdraw: (id, data) => request(`/accounts/${id}/withdraw`, { method: 'POST', body: JSON.stringify(data) }),
  transfer: (data, key) => request('/transfers', { method: 'POST', headers: { 'Idempotency-Key': key }, body: JSON.stringify(data) }),
  reviewAlert: (id, note) => request(`/alerts/${id}/review`, { method: 'PATCH', body: JSON.stringify({ note }) })
}
