import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { login, demoLogin } from '../api/auth'

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

  const demoMutation = useMutation({
    mutationFn: demoLogin,
    onSuccess: (res) => {
      localStorage.setItem('token', res.data.access_token)
      navigate('/dashboard')
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to initialize demo')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    mutation.mutate(form)
  }

  const handleDemoLogin = () => {
    setError('')
    demoMutation.mutate()
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
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
            disabled={mutation.isPending || demoMutation.isPending}
          >
            {mutation.isPending ? (
              <><div className="spinner" /> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
          <span style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '500' }}>or</span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
        </div>

        <button
          type="button"
          onClick={handleDemoLogin}
          className="btn btn-lg"
          style={{
            width: '100%',
            justifyContent: 'center',
            backgroundColor: '#f3f4f6',
            color: '#1f2937',
            border: '1px solid #d1d5db',
            cursor: demoMutation.isPending ? 'not-allowed' : 'pointer',
            opacity: demoMutation.isPending ? 0.7 : 1,
          }}
          disabled={mutation.isPending || demoMutation.isPending}
        >
          {demoMutation.isPending ? (
            <><div className="spinner" /> Loading demo...</>
          ) : (
            'Try Demo — No signup needed'
          )}
        </button>

        <div className="auth-footer">
          Don&apos;t have an account?{' '}
          <Link to="/register">Create one →</Link>
        </div>
      </div>
    </div>
  )
}

