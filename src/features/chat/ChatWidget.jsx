import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { chatFaq } from '../../data/faqs.js'
import { useNavigate } from '../../app/navigation.js'

const GREETING = { from: 'bot', text: 'Hi! Ask about fresh fruits, vegetables, or how to start a buyer enquiry.' }

export function ChatWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [typing, setTyping] = useState(false)
  const [asked, setAsked] = useState([])
  const listRef = useRef(null)
  const panelRef = useRef(null)
  const launcherRef = useRef(null)
  const replyTimer = useRef(0)

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  // Escape closes and hands focus back to the launcher; opening moves focus into
  // the panel. Without this the panel was reachable only by tabbing forward past
  // the entire footer, and dismissing it needed the mouse.
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      launcherRef.current?.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  // The scripted reply is the one async path here; leaving it uncancelled meant
  // a navigation away mid-reply resolved into an unmounted component.
  useEffect(() => () => clearTimeout(replyTimer.current), [])

  const ask = (item) => {
    setMessages(m => [...m, { from: 'user', text: item.q }])
    setAsked(a => [...a, item.q])
    setTyping(true)
    clearTimeout(replyTimer.current)
    replyTimer.current = setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { from: 'bot', text: item.a, cta: item.cta }])
    }, 600)
  }

  const remaining = chatFaq.filter(f => !asked.includes(f.q))

  return <>
    {/* aria-hidden + the CSS visibility:hidden pair is what actually removes the
        closed panel from both the a11y tree and the tab order. It was previously
        only opacity:0 / pointer-events:none, so keyboard focus disappeared into
        five invisible controls before reaching the launcher. */}
    <div
      ref={panelRef}
      id="chat-panel"
      className={open ? 'chat-panel visible' : 'chat-panel'}
      role="dialog"
      aria-label="Chat with the Solstice team"
      aria-hidden={open ? undefined : 'true'}
      tabIndex={-1}
    >
      <div className="chat-head">
        <span className="online-dot"/>
        <div><b>Solstice team</b><small>Usually replies within a day</small></div>
        <button onClick={() => { setOpen(false); launcherRef.current?.focus() }} aria-label="Close chat"><Icon name="close" size={16}/></button>
      </div>
      {/* Replies arrive on a timer with no focus change, so without a live region
          a screen-reader user is never told an answer appeared. */}
      <div className="chat-messages" ref={listRef} role="log" aria-live="polite" aria-atomic="false">
        {messages.map((message, index) => (
          <div key={index} className={`chat-bubble ${message.from}`}>
            <p>{message.text}</p>
            {message.cta && (
              <button className="chat-bubble-cta" onClick={() => { navigate(message.cta[1]); setOpen(false) }}>
                {message.cta[0]} <Icon name="arrow" size={13}/>
              </button>
            )}
          </div>
        ))}
        {typing && <div className="chat-bubble bot chat-typing" aria-label="Typing"><i/><i/><i/></div>}
      </div>
      {remaining.length > 0 ? (
        <div className="chat-quick">
          {remaining.slice(0, 3).map(item => <button key={item.q} onClick={() => ask(item)}>{item.q}</button>)}
        </div>
      ) : (
        <div className="chat-quick">
          <button className="chat-enquire" onClick={() => { navigate('contact'); setOpen(false) }}>Start an enquiry <Icon name="arrow" size={14}/></button>
        </div>
      )}
    </div>
    <button
      ref={launcherRef}
      className="chat-button"
      onClick={() => setOpen(o => !o)}
      aria-label={open ? 'Close chat' : 'Open chat'}
      aria-expanded={open}
      aria-controls="chat-panel"
    >
      <Icon name={open ? 'close' : 'chat'} size={22}/>
    </button>
  </>
}
