// The whole card is the control, not the arrow drawn inside it. role + tabIndex +
// Enter/Space makes it keyboard-operable (SC 2.1.1); the arrow is rendered as a
// non-focusable cue so each card stays a single tab stop.
//
// This is a prop factory rather than a <Card> component because the three card
// markups it serves (feature, list, related) share behaviour but no structure.
// Wrapping them in a common element would change the DOM. See report.
export const cardProps = (onActivate, label) => ({
  role: 'button',
  tabIndex: 0,
  'aria-label': label,
  onClick: onActivate,
  onKeyDown: (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onActivate() }
  }
})
