import { useEffect, useRef } from 'react'

// Category chips. On phones and tablets they sit on one horizontally scrolling
// row (the product grid below stays two-up); from 1024px they wrap. The active
// chip is kept in view, so a selection made before a resize or a reload of the
// same state is never scrolled off the row's edge.
export function ProductFilter({ options, value, onChange }) {
  const rowRef = useRef(null)

  useEffect(() => {
    const row = rowRef.current
    const active = row?.querySelector('[aria-pressed="true"]')
    if (!row || !active || row.scrollWidth <= row.clientWidth) return
    // Scroll the row only - scrollIntoView would also move the page.
    const left = active.offsetLeft - (row.clientWidth - active.offsetWidth) / 2
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    row.scrollTo({ left: Math.max(0, left), behavior: still ? 'auto' : 'smooth' })
  }, [value])

  return (
    <div className="product-filters" ref={rowRef} role="group" aria-label="Filter products by category">
      {options.map(item => (
        <button key={item} type="button" aria-pressed={value === item} onClick={() => onChange(item)}
                className={value === item ? 'active' : ''}>{item}</button>
      ))}
    </div>
  )
}
