import { Icon } from '../../components/ui/Icon.jsx'

// Import / Export direction switch.
//
// Two toggle buttons in a labelled group with aria-pressed, not a tablist. The
// grid below is filtered content on the same page rather than a set of swapped
// panels, so tab semantics would owe the user arrow-key roving and a tabpanel
// that does not exist here. aria-pressed states the same thing honestly with
// nothing left unimplemented.
//
// The database has no entry for this pattern - searched, no match - so the
// keyboard and ARIA choices above are reasoned, not sourced from it.
const DIRECTIONS = [
  { id: 'export', label: 'Export', icon: 'ship', hint: 'Sourced in India, shipped out' },
  { id: 'import', label: 'Import', icon: 'box', hint: 'Sourced abroad, brought in' }
]

export function TradeSwitch({ value, onChange }) {
  return (
    <div className="trade-switch" role="group" aria-label="Trade direction">
      {DIRECTIONS.map(direction => (
        <button
          key={direction.id}
          type="button"
          className={value === direction.id ? 'trade-option active' : 'trade-option'}
          aria-pressed={value === direction.id}
          onClick={() => onChange(direction.id)}
        >
          <Icon name={direction.icon} size={17}/>
          <span className="trade-option-label">{direction.label}</span>
          <span className="trade-option-hint">{direction.hint}</span>
        </button>
      ))}
    </div>
  )
}
