import { useState } from 'react'

export default function AdminLoginPage({ auth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  const onSubmit = async (event) => {
    event.preventDefault()
    setBusy(true)
    await auth.login(email.trim(), password)
    setBusy(false)
  }

  return (
    <div className="admin-auth">
      <form className="admin-auth-card" onSubmit={onSubmit}>
        <h1>Solstice admin</h1>
        <p className="admin-auth-lede">Sign in to manage the product catalogue.</p>

        <label className="admin-field">
          <span>Email</span>
          <input
            type="email" name="email" autoComplete="username" required autoFocus
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className="admin-field">
          <span>Password</span>
          <input
            type="password" name="password" autoComplete="current-password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        {/* role=alert so the failure is announced, not just painted - a screen
            reader user gets no feedback from a colour change alone. */}
        {auth.error && <p className="admin-error" role="alert">{auth.error}</p>}

        <button className="admin-btn admin-btn-primary" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
