import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const COMMANDS = [
  { label: 'Analyze Message', to: '/app/analyze' },
  { label: 'Batch Analysis', to: '/app/batch' },
  { label: 'History', to: '/app/history' },
  { label: 'Analytics', to: '/app/analytics' },
  { label: 'Model Performance', to: '/app/model-performance' },
  { label: 'Feedback', to: '/app/feedback' },
  { label: 'Settings', to: '/app/settings' },
  { label: 'Dashboard', to: '/app/dashboard' },
]

// Ctrl/Cmd+K anywhere in the authenticated shell opens this. Hand-rolled
// (no cmdk/kbar dependency) — substring filter + arrow-key nav is all this
// project needs.
export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return COMMANDS
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(q))
  }, [query])

  useEffect(() => {
    function onKeyDown(e) {
      const isToggle = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'
      if (isToggle) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  if (!open) return null

  const choose = (command) => {
    setOpen(false)
    if (command) navigate(command.to)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[activeIndex])
    }
  }

  return (
    <div className="command-palette-backdrop" role="presentation" onClick={() => setOpen(false)}>
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="command-palette-input"
          placeholder="Jump to a page…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="Search commands"
        />
        {results.length === 0 ? (
          <p className="command-palette-empty">No matching page.</p>
        ) : (
          <ul className="command-palette-list" role="listbox">
            {results.map((c, i) => (
              <li key={c.to}>
                <button
                  type="button"
                  className={`command-palette-item ${i === activeIndex ? 'command-palette-item--active' : ''}`}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => choose(c)}
                  role="option"
                  aria-selected={i === activeIndex}
                >
                  {c.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="command-palette-hint mono">↑↓ NAVIGATE · ENTER SELECT · ESC CLOSE</p>
      </div>
    </div>
  )
}
