import './Text.css'

interface TextProps {
  children: React.ReactNode
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl'
  weight?: 'light' | 'normal' | 'medium' | 'semibold' | 'bold'
  color?: 'black' | 'gray' | 'green' | 'red'
  as?: 'p' | 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  className?: string
}

function Text({ 
  children, 
  size = 'base',
  weight = 'normal',
  color = 'black',
  as: Component = 'p',
  className = ''
}: TextProps) {
  return (
    <Component className={`text text-${size} text-${weight} text-${color} ${className}`}>
      {children}
    </Component>
  )
}

export default Text
