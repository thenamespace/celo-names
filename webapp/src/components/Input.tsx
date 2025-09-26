import { Loader2 } from 'lucide-react'
import { type ReactNode } from 'react'
import './Input.css'

interface InputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  suffix?: string | ReactNode
  loading?: boolean
  disabled?: boolean
  error?: string
  className?: string
  type?: 'text' | 'email' | 'password' | 'number'
  autoFocus?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

function Input({
  value,
  onChange,
  placeholder = '',
  suffix,
  loading = false,
  disabled = false,
  error,
  className = '',
  type = 'text',
  autoFocus = false,
  onFocus,
  onBlur
}: InputProps) {
  const isDisabled = disabled || loading

  return (
    <div className={`input-wrapper ${className}`}>
      <div className="input-with-suffix">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isDisabled}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
          className={`input-field ${error ? 'error' : ''} ${isDisabled ? 'disabled' : ''} ${suffix ? 'has-suffix' : ''} ${loading ? 'has-loading' : ''}`}
        />
        {suffix && (
          <span className="input-suffix">
            {suffix}
          </span>
        )}
        {loading && (
          <div className="input-loading">
            <Loader2 className="loading-spinner" />
          </div>
        )}
      </div>
      {error && (
        <div className="input-error">
          {error}
        </div>
      )}
    </div>
  )
}

export default Input
