// Transparent, client-side pattern checks — NOT the ML model's reasoning.
// The API only returns {label, spam_probability}; it has no feature-level
// explanation, so these are surfaced separately and clearly labeled as
// heuristic indicators, never as "why the model flagged this".

const CHECKS = [
  { id: 'url', label: 'URL DETECTED', test: /(https?:\/\/|www\.)\S+/i },
  { id: 'phone', label: 'PHONE NUMBER DETECTED', test: /(\+?\d[\d\s-]{7,}\d)/ },
  { id: 'currency', label: 'CURRENCY AMOUNT', test: /[$£€]\s?\d|\b\d+\s?(usd|gbp|eur|dollars|pounds)\b/i },
  {
    id: 'promo',
    label: 'PROMOTIONAL LANGUAGE',
    test: /\b(winner|won|win|prize|free|claim|congratulations|reward|bonus|offer|discount|cash)\b/i,
  },
  { id: 'urgency', label: 'URGENCY LANGUAGE', test: /\b(urgent|immediately|hurry|expires?|act now|limited time|last chance)\b/i },
  { id: 'punct', label: 'EXCESSIVE PUNCTUATION', test: /([!?]){2,}/ },
  { id: 'repeat', label: 'REPEATED CHARACTERS', test: /([a-z])\1{3,}/i },
]

export function analyzePatterns(message) {
  return CHECKS.filter((check) => check.test.test(message)).map(({ id, label }) => ({ id, label }))
}
