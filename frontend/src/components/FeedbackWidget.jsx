import { useEffect, useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useToast } from './Toast'

// "Was this correct?" — Yes closes the loop immediately; No reveals a
// Spam/Not Spam pick before submitting. Used both right after a live
// classify (ScanResult) and from the message history detail view.
export default function FeedbackWidget({ messageId, existing, onSubmitted }) {
  const toast = useToast()
  const [feedback, setFeedback] = useState(existing ?? null)
  const [checking, setChecking] = useState(existing === undefined)
  const [showActualPicker, setShowActualPicker] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (existing !== undefined) {
      setFeedback(existing)
      setChecking(false)
      return
    }
    let cancelled = false
    api
      .getFeedback(messageId)
      .then((f) => !cancelled && setFeedback(f))
      .catch(() => {})
      .finally(() => !cancelled && setChecking(false))
    return () => {
      cancelled = true
    }
  }, [messageId, existing])

  const submit = async (isCorrect, actualClassification) => {
    setSubmitting(true)
    try {
      const result = await api.submitFeedback(messageId, {
        is_correct: isCorrect,
        actual_classification: actualClassification ?? null,
      })
      setFeedback(result)
      setShowActualPicker(false)
      toast.success('Thanks — feedback saved.')
      onSubmitted?.(result)
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message || 'Could not save feedback.' : 'Could not save feedback.')
    } finally {
      setSubmitting(false)
    }
  }

  if (checking) return null

  if (feedback) {
    return (
      <p className="feedback-done mono">
        FEEDBACK RECORDED: {feedback.is_correct ? 'CORRECT' : `INCORRECT — ACTUAL: ${feedback.actual_classification?.toUpperCase()}`}
      </p>
    )
  }

  return (
    <div className="feedback-widget">
      <p className="panel-subtitle mono">WAS THIS PREDICTION CORRECT?</p>
      {!showActualPicker ? (
        <div className="feedback-buttons">
          <button type="button" className="btn-ghost" onClick={() => submit(true)} disabled={submitting}>
            YES
          </button>
          <button type="button" className="btn-ghost" onClick={() => setShowActualPicker(true)} disabled={submitting}>
            NO
          </button>
        </div>
      ) : (
        <div className="feedback-buttons">
          <span className="text-faint mono">ACTUAL CLASSIFICATION:</span>
          <button type="button" className="btn-ghost" onClick={() => submit(false, 'spam')} disabled={submitting}>
            SPAM
          </button>
          <button type="button" className="btn-ghost" onClick={() => submit(false, 'ham')} disabled={submitting}>
            NOT SPAM
          </button>
        </div>
      )}
    </div>
  )
}
