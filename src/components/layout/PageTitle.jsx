import { Eyebrow } from '../ui/Eyebrow.jsx'

export function PageTitle({ eyebrow, title, accent, copy, mark }) {
  return (
    <section className="page-title">
      {mark && <span className="title-mark" aria-hidden="true">{mark}</span>}
      <div className="container">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1>{title} <em>{accent}</em></h1>
        {copy && <p>{copy}</p>}
      </div>
    </section>
  )
}
