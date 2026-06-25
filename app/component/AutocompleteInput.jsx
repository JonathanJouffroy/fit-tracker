'use client'
import { useState, useRef, useEffect } from 'react'

export default function AutocompleteInput({ value, onChange, suggestions = [], placeholder, className }) {
  const [ouvert, setOuvert] = useState(false)
  const ref = useRef(null)

  const filtrees = suggestions.filter(
    (s) => s.toLowerCase().includes(value.toLowerCase()) && s.toLowerCase() !== value.toLowerCase()
  ).slice(0, 6)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOuvert(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOuvert(true) }}
        onFocus={() => setOuvert(true)}
        placeholder={placeholder}
        className={className || 'input'}
        autoComplete="off"
      />
      {ouvert && filtrees.length > 0 && (
        <div className="absolute z-20 left-0 right-0 top-full mt-1 rounded-xl shadow-lg border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          {filtrees.map((s) => (
            <button
              key={s} type="button"
              onClick={() => { onChange(s); setOuvert(false) }}
              className="w-full text-left px-3 py-2.5 text-sm hover:opacity-80 border-b last:border-0"
              style={{ color: 'var(--text)', borderColor: 'var(--border)' }}>
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
