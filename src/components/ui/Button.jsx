import { Icon } from './Icon.jsx'

export function Button({ children, onClick, variant = 'primary' }) {
  return <button onClick={onClick} className={`button ${variant}`}>{children}<Icon name="arrow" size={17}/></button>
}
