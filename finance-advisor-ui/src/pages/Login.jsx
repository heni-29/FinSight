import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login } from '../api/auth'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.access_token)
      navigate('/dashboard')
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Invalid credentials')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💎</div>
          <span className="auth-logo-text">FinSight</span>
        </div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your AI finance advisor</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="email"
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
              id="password"
              className="form-input"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              required
              autoComplete="current-password"
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
              <><div className="spinner" /> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one →</Link>
        </div>
      </div>
    </div>
  )
}
