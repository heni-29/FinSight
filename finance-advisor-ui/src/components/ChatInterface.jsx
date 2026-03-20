import { useState, useRef, useEffect } from 'react'
import { streamChat } from '../api/advisor'

const WELCOME = {
  role: 'ai',
  content:
    "Hi! I'm your FinSight AI advisor 💎. I have access to your real transaction data and can help you understand your spending, identify patterns, and give personalized advice. What would you like to know?",
}

/** Render message content: turn newlines into <br> elements */
function MessageContent({ content }) {
  if (!content) return null
  const parts = content.split('\n')
  return (
    <>
      {parts.map((part, i) => (
        <span key={i}>
          {part}
          {i < parts.length - 1 && <br />}
        </span>
      ))}
    </>
  )
}

export default function ChatInterface() {
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: text }])
    setIsStreaming(true)

    // Add empty AI message that will be filled via streaming
    setMessages((prev) => [...prev, { role: 'ai', content: '' }])

    streamChat(
      text,
      (chunk) => {
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'ai') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk }
          }
          return updated
        })
      },
      () => {
        setIsStreaming(false)
      },
      (err) => {
        setIsStreaming(false)
        setMessages((prev) => {
          const updated = [...prev]
          const last = updated[updated.length - 1]
          if (last.role === 'ai' && !last.content) {
            updated[updated.length - 1] = {
              ...last,
              content: '⚠️ Sorry, I encountered an error. Please try again.',
            }
          }
          return updated
        })
      }
    )
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="chat-wrapper">
      <div className="chat-header">
        <div className="chat-avatar">🤖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>FinSight AI Advisor</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-success)' }}>
            {isStreaming ? '⚡ Analyzing your data...' : '● Online'}
          </div>
        </div>
        {messages.length > 1 && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => setMessages([WELCOME])}
            title="Clear conversation"
          >
            Clear
          </button>
        )}
      </div>

      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <div className="message-avatar">
              {msg.role === 'ai' ? '🤖' : '👤'}
            </div>
            <div className="message-bubble">
              {msg.content ? (
                <MessageContent content={msg.content} />
              ) : isStreaming && i === messages.length - 1 ? (
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <textarea
          ref={inputRef}
          className="chat-input"
          placeholder="Ask me about your spending, budget goals, or financial advice..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={isStreaming}
        />
        <button
          id="chat-send-btn"
          className="btn btn-primary"
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
          style={{ flexShrink: 0 }}
        >
          {isStreaming ? <div className="spinner" style={{ width: 18, height: 18 }} /> : '↑ Send'}
        </button>
      </div>
    </div>
  )
}
