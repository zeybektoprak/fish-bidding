const BASE_URL = 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Bir hata oluştu' }))
    throw new Error(err.detail || 'Bir hata oluştu')
  }
  return res.json()
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  initAdmin: (data) => request('/auth/init-admin', { method: 'POST', body: JSON.stringify(data) }),
  me: () => request('/auth/me'),

  // Members
  getMembers: () => request('/members'),
  createMember: (data) => request('/members', { method: 'POST', body: JSON.stringify(data) }),
  deleteMember: (id) => request(`/members/${id}`, { method: 'DELETE' }),

  // Auctions
  getSessions: () => request('/auctions'),
  createSession: (data) => request('/auctions', { method: 'POST', body: JSON.stringify(data) }),
  getSession: (id) => request(`/auctions/${id}`),
  startAuction: (id) => request(`/auctions/${id}/start`, { method: 'PATCH' }),
  completeAuction: (id) => request(`/auctions/${id}/complete`, { method: 'PATCH' }),

  // Lots
  getLots: (sessionId) => request(`/auctions/${sessionId}/lots`),
  addLot: (sessionId, data) =>
    request(`/auctions/${sessionId}/lots`, { method: 'POST', body: JSON.stringify(data) }),
  deleteLot: (id) => request(`/lots/${id}`, { method: 'DELETE' }),
  activateLot: (id) => request(`/lots/${id}/activate`, { method: 'PATCH' }),
  sellLot: (id) => request(`/lots/${id}/sell`, { method: 'PATCH' }),
  markUnsold: (id) => request(`/lots/${id}/unsold`, { method: 'PATCH' }),

  // Bids
  getBids: (lotId) => request(`/lots/${lotId}/bids`),
  placeBid: (lotId, amount) =>
    request(`/lots/${lotId}/bids`, { method: 'POST', body: JSON.stringify({ amount }) }),

  // Payments
  getPayments: (sessionId) => request(`/auctions/${sessionId}/payments`),
}

export function createWebSocket(sessionId) {
  return new WebSocket(`ws://localhost:8000/ws/auction/${sessionId}`)
}
