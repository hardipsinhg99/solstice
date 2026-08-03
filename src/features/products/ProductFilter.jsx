export function ProductFilter({ options, value, onChange }) {
  return (
    <div className="product-filters">
      {options.map(item => (
        <button key={item} onClick={() => onChange(item)} className={value === item ? 'active' : ''}>{item}</button>
      ))}
    </div>
  )
}
