// Anonymous/demo-mode scan history. Lives only in this browser — never sent
// to the backend. Logged-in users get PostgreSQL-backed history instead
// (see api.scans / ScanHistory's account mode).
const KEY = 'sms-classifier-local-history'
const MAX_ENTRIES = 50

export function loadLocalHistory() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function addLocalScan({ message, classification, spam_probability }) {
  try {
    const entry = {
      id: crypto.randomUUID(),
      preview: message.length > 60 ? `${message.slice(0, 60)}…` : message,
      classification,
      spam_probability,
      created_at: new Date().toISOString(),
    }
    const history = [entry, ...loadLocalHistory()].slice(0, MAX_ENTRIES)
    localStorage.setItem(KEY, JSON.stringify(history))
    return entry
  } catch {
    return null
  }
}

export function clearLocalHistory() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // storage unavailable — nothing to clear
  }
}

export function computeStats(history) {
  const total = history.length
  const spam = history.filter((h) => h.classification === 'spam').length
  const avg = total ? history.reduce((sum, h) => sum + h.spam_probability, 0) / total : 0
  return {
    total,
    spam,
    ham: total - spam,
    spamRate: total ? (spam / total) * 100 : 0,
    avgScore: avg * 100,
  }
}
