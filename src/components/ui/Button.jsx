import { Icon } from './Icon.jsx'
import { Link } from './Link.jsx'

/* With `to`, a link styled as a button - a crawlable href to another page.
   Without it, a real <button> for an action on this page. */
export function Button({ children, onClick, to, variant = 'primary' }) {
  const content = <>{children}<Icon name="arrow" size={17}/></>
  return to
    ? <Link to={to} onClick={onClick} className={`button ${variant}`}>{content}</Link>
    : <button onClick={onClick} className={`button ${variant}`}>{content}</button>
}
