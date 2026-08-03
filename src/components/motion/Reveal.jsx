import { useInView } from './useInView.js'

export function Reveal({ as: Tag = 'div', delay = 0, className = '', style, children, ...rest }) {
  const [ref, inView] = useInView()
  return <Tag ref={ref} className={['reveal', inView && 'in', className].filter(Boolean).join(' ')} style={{ transitionDelay: `${delay}ms`, ...style }} {...rest}>{children}</Tag>
}
