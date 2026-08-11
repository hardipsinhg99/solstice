import { useEffect, useRef } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Icon } from '../ui/Icon.jsx'
import { uploadAsset } from '../../features/admin/useMediaAssets.js'

/**
 * TipTap. The one frontend dependency this phase adds, and the one the blueprint
 * always named as the exception - deferred until Pages arrived, which is now.
 *
 * The toolbar is deliberately short. A rich-text field on a marketing site needs
 * emphasis, a couple of heading levels, lists, a link and an image; everything
 * beyond that is a way for an editor to break the type scale the design system
 * spent a phase establishing. StarterKit's own heading levels are clamped to
 * h2-h4 for the same reason - a section body must not emit an <h1>.
 *
 * Whatever this produces is sanitized server-side against an allowlist anyway
 * (common/sanitize.ts). The editor is the convenience; the endpoint is the
 * control, because an attacker POSTs to the endpoint and never opens the editor.
 */
const BUTTONS = [
  { cmd: (e) => e.chain().focus().toggleBold().run(), active: 'bold', label: 'Bold', text: 'B' },
  { cmd: (e) => e.chain().focus().toggleItalic().run(), active: 'italic', label: 'Italic', text: 'I' },
  { cmd: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), active: 'heading', args: { level: 3 }, label: 'Heading', text: 'H3' },
  { cmd: (e) => e.chain().focus().toggleBulletList().run(), active: 'bulletList', label: 'Bulleted list', text: '• List' },
  { cmd: (e) => e.chain().focus().toggleBlockquote().run(), active: 'blockquote', label: 'Quote', text: '❞' }
]

export function RichTextEditor({ value, onChange, id, describedBy }) {
  const fileRef = useRef(null)
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false, autolink: false })
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'admin-rte-surface',
        // The editable region needs a name and a role a screen reader can
        // announce; TipTap gives it contenteditable and nothing else.
        role: 'textbox',
        'aria-multiline': 'true',
        ...(id ? { id } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {})
      }
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML())
  })

  // Reset the document when the caller swaps in different content - switching
  // between two repeater rows reuses this component instance, and without this
  // the second row would open showing the first row's text.
  useEffect(() => {
    if (!editor) return
    if ((value || '') !== editor.getHTML()) editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  if (!editor) return <div className="admin-rte" aria-busy="true"/>

  const insertImage = async (file) => {
    if (!file) return
    try {
      // Straight through the Phase 1b pipeline - magic bytes, sharp, EXIF
      // stripped, StorageService. No second upload path for editor images.
      const asset = await uploadAsset(file, '')
      editor.chain().focus().setImage({ src: asset.url, alt: asset.altText || '' }).run()
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert(`Could not add that image: ${err.message}`)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="admin-rte">
      <div className="admin-rte-bar" role="toolbar" aria-label="Text formatting">
        {BUTTONS.map((b) => (
          <button
            key={b.label} type="button"
            className={editor.isActive(b.active, b.args) ? 'admin-rte-btn is-on' : 'admin-rte-btn'}
            aria-pressed={editor.isActive(b.active, b.args)}
            aria-label={b.label}
            // preventDefault on mousedown, not just onClick: pressing a button
            // moves focus out of the contenteditable and collapses the
            // selection, so by the time click fires there is nothing selected
            // and toggleBold() is a no-op on an empty range. Keyboard
            // activation is unaffected - it fires click without a mousedown.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => b.cmd(editor)}
          >
            {b.text}
          </button>
        ))}
        <button type="button" className="admin-rte-btn" aria-label="Insert an image"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => fileRef.current?.click()}>
          <Icon name="image" size={14}/>
        </button>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp"
               className="admin-visually-hidden" tabIndex={-1} aria-hidden="true"
               onChange={(e) => insertImage(e.target.files?.[0])}/>
      </div>
      <EditorContent editor={editor}/>
    </div>
  )
}
