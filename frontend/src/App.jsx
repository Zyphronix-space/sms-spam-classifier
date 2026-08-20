import { useState } from 'react'
import './App.css'

const EXAMPLES = [
  'Hey, are we still on for lunch tomorrow?',
  'WINNER!! You have been selected to receive a $1000 cash prize. Call now to claim!',
]

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [message, setMessage] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!message.trim()) {
      setError('Please enter a message to classify.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      if (!res.ok) throw new Error(`Server responded with ${res.status}`)
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(`Could not reach the prediction API: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page">
      <h1>SMS Spam Classifier</h1>
      <p className="subtitle">
        Paste a text message and a Naive Bayes model (trained on 5,500+ labeled
        SMS messages with TF-IDF features) predicts whether it's spam or a
        normal message.
      </p>

      <form onSubmit={handleSubmit} className="form">
        <label className="field">
          <span>Message</span>
          <textarea
            rows={5}
            placeholder="e.g. Congratulations! You've won a free prize, click here to claim..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>

        <div className="examples">
          <span>Try:</span>
          {EXAMPLES.map((example) => (
            <button
              type="button"
              key={example}
              className="example-chip"
              onClick={() => setMessage(example)}
            >
              {example.length > 40 ? `${example.slice(0, 40)}…` : example}
            </button>
          ))}
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Check Message'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}
      {result && (
        <p className={`result ${result.label}`}>
          Prediction: <strong>{result.label === 'spam' ? 'Spam' : 'Not Spam'}</strong>
          {' — '}
          {(result.spam_probability * 100).toFixed(1)}% spam probability
        </p>
      )}
    </main>
  )
}

export default App
