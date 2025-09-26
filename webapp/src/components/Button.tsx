import './Button.css'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'default' | 'large'
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  className?: string
  style?: React.CSSProperties
}

function Button({ 
  children, 
  variant = 'primary',
  size = 'default',
  onClick, 
  type = 'button',
  disabled = false,
  className = '',
  style
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`btn btn-${variant} ${size !== 'default' ? `btn-${size}` : ''} ${className}`}
    >
      {children}
    </button>
  )
}

export default Button
