import { useEffect, useState } from 'react'

/**
 * The title and description a page gets in a search result.
 *
 * Deliberately NOT a section. Sections are content, they go through
 * draft-save-publish, and they render to a visitor. These two fields render to
 * nobody: the prerenderer reads the row directly, so a "draft page title" would
 * be a state with no meaning. Its own Save button, its own endpoint.
 *
 * The counts are guidance, not limits. Google truncates around 60 and 155
 * characters, but that is a pixel width dressed up as a character count and it
 * moves - so going over is a warning the editor can ignore, never a refusal.
 * The server caps at 200/400, far above anything intentional, purely so the
 * field cannot be used to store a page's worth of text.
 */
const LIMITS = { title: 60, description: 155 }

function Counter ({ value, soft }) {
  const n = value.trim().length
  const over = n > soft
  return (
    <span className={over ? 'admin-hint admin-count is-over' : 'admin-hint admin-count'}>
      {n} / {soft}{over ? ' — likely to be cut short in search results' : ''}
    </span>
  )
}

export function PageSeoFields ({ slug, pageTitle, seoTitle, seoDescription, onSave, onSaved }) {
  const [title, setTitle] = useState(seoTitle)
  const [description, setDescription] = useState(seoDescription)
  const [state, setState] = useState('idle')   // idle | saving | saved
  const [error, setError] = useState('')

  // Re-seed when the page reloads underneath, or a save's own reload would
  // leave the inputs holding pre-save text.
  useEffect(() => { setTitle(seoTitle); setDescription(seoDescription) }, [slug, seoTitle, seoDescription])

  const dirty = title !== seoTitle || description !== seoDescription

  const submit = async (e) => {
    e.preventDefault()
    setState('saving'); setError('')
    try {
      await onSave(slug, { seoTitle: title, seoDescription: description })
      await onSaved()
      setState('saved')
    } catch (err) {
      setError(err.message); setState('idle')
    }
  }

  return (
    <form className="admin-section-card" onSubmit={submit} aria-labelledby={`seo-${slug}`}>
      <div className="admin-section-head">
        <h3 id={`seo-${slug}`}>Search results</h3>
        <p className="admin-hint">
          What this page looks like on Google. Leave either blank and the site falls back to
          “{pageTitle} | Solstice Trading International LLP” with no description — which works,
          but a written description is what makes a buyer click.
        </p>
      </div>

      <label className="admin-field">
        <span>Title</span>
        <input type="text" value={title} maxLength={200} disabled={state === 'saving'}
               placeholder={`${pageTitle} | Solstice Trading International LLP`}
               onChange={(e) => { setTitle(e.target.value); setState('idle') }}/>
        <Counter value={title} soft={LIMITS.title}/>
      </label>

      <label className="admin-field">
        <span>Description</span>
        <textarea rows={3} value={description} maxLength={400} disabled={state === 'saving'}
                  placeholder="One or two sentences a buyer would recognise this page by."
                  onChange={(e) => { setDescription(e.target.value); setState('idle') }}/>
        <Counter value={description} soft={LIMITS.description}/>
      </label>

      {error && <p className="admin-error" role="alert">{error}</p>}

      <div className="admin-section-actions">
        <button type="submit" className="admin-btn" disabled={!dirty || state === 'saving'}>
          {state === 'saving' ? 'Saving…' : 'Save search details'}
        </button>
        {state === 'saved' && !dirty &&
          <span className="admin-hint admin-ok" role="status">
            Saved. The static copy of this page rebuilds on the next run.
          </span>}
      </div>
    </form>
  )
}
