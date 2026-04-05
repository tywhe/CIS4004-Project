const KEYS = ['userId', 'role', 'portfolioId']

export function clearSession() {
  for (const k of KEYS) {
    localStorage.removeItem(k)
  }
}

export function getSessionUserId() {
  return localStorage.getItem('userId')
}

export function getSessionRole() {
  return localStorage.getItem('role')
}

export function isAdminSession() {
  return String(getSessionRole() || '').trim().toLowerCase() === 'admin'
}

export function hasSession() {
  return Boolean(getSessionUserId())
}
