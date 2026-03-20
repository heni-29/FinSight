import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createTransaction, getCategories } from '../api/transactions'

export default function AddTransactionModal({ onClose }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    merchant_name: '',
    raw_name: '',
    category_id: '',
  })
  const [error, setError] = useState('')

  // Fetch real categories from DB (with real UUIDs)
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  })

  const mutation = useMutation({
    mutationFn: (data) =>
      createTransaction({
        ...data,
        amount: parseFloat(data.amount),
        date: new Date(data.date).toISOString(),
        category_id: data.category_id || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
      onClose()
    },
    onError: (err) => {
      setError(err.response?.data?.detail || 'Failed to add transaction')
    },
  })

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      setError('Please enter a valid amount')
      return
    }
    mutation.mutate(form)
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">Add Transaction</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Amount (positive = expense, negative = income)</label>
            <input
              className="form-input"
              type="number"
              step="0.01"
              name="amount"
              placeholder="e.g. 49.99"
              value={form.amount}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              className="form-input"
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Merchant Name</label>
            <input
              className="form-input"
              type="text"
              name="merchant_name"
              placeholder="e.g. Whole Foods"
              value={form.merchant_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Raw Name</label>
            <input
              className="form-input"
              type="text"
              name="raw_name"
              placeholder="e.g. WHOLEFDS #1234"
              value={form.raw_name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Category (optional)</label>
            <select
              className="form-input"
              name="category_id"
              value={form.category_id}
              onChange={handleChange}
            >
              <option value="">Select category</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="error-text">{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <><div className="spinner" style={{ width: 16, height: 16 }} /> Adding...</>
              ) : (
                'Add Transaction'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
