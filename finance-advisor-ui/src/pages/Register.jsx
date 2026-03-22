import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { register } from '../api/auth'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '', confirm: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: ({ email, password }) => register({ email, password }),
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.access_token)
      navigate('/dashboard')
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Registration failed')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirm) {
      setError('Passwords do not match')
      return
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    mutation.mutate(form)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💎</div>
          <span className="auth-logo-text">FinSight</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start managing your finances with AI</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="reg-email"
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="reg-password"
              className="form-input"
              type="password"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              id="reg-confirm"
              className="form-input"
              type="password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={(e) => setForm((p) => ({ ...p, confirm: e.target.value }))}
              required
              autoComplete="new-password"
            />
          </div>

          {error && <p className="error-text">⚠ {error}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%', justifyContent: 'center' }}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <><div className="spinner" /> Creating account...</>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account?{' '}
          <Link to="/login">Sign in →</Link>
        </div>
      </div>
    </div>
  )
}
