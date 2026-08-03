import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../components/ui/Icon.jsx'
import { chatFaq } from '../../data/faqs.js'
import { useNavigate } from '../../app/navigation.js'

export function ChatWidget() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hi! Ask about fresh fruits, vegetables, or how to start a buyer enquiry.' }])
  const [typing, setTyping] = useState(false)
  const [asked, setAsked] = useState([])
  const listRef = useRef(null)

  useEffect(() => {
    if (!listRef.current) return
    listRef.current.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const ask = (item) => {
    setMessages(m => [...m, { from: 'user', text: item.q }])
    setAsked(a => [...a, item.q])
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages(m => [...m, { from: 'bot', text: item.a, cta: item.cta }])
    }, 600)
  }

  const remaining = chatFaq.filter(f => !asked.includes(f.q))

  return <>
    <div className={open ? 'chat-panel visible' : 'chat-panel'}>
      <div className="chat-head">
        <span className="online-dot"/>
        <div><b>Solstice team</b><small>Usually replies within a day</small></div>
        <button onClick={() => setOpen(false)} aria-label="Close chat"><Icon name="close" size={16}/></button>
      </div>
      <div className="chat-messages" ref={listRef}>
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
        {typing && <div className="chat-bubble bot chat-typing"><i/><i/><i/></div>}
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
    <button className="chat-button" onClick={() => setOpen(!open)} aria-label="Open chat">
      <Icon name={open ? 'close' : 'chat'} size={22}/>
    </button>
  </>
}
