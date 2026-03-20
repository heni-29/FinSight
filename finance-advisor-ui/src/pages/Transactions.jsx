import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTransactions, deleteTransaction, getCategories } from '../api/transactions'
import TransactionTable from '../components/TransactionTable.jsx'
import AddTransactionModal from '../components/AddTransactionModal.jsx'

export default function Transactions() {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [filters, setFilters] = useState({
    category_id: '',
    start_date: '',
    end_date: '',
    page: 1,
    page_size: 20,
  })

  // Fetch real categories with UUIDs for the filter dropdown
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => getCategories(),
    select: (res) => res.data,
    staleTime: 5 * 60 * 1000,
  })

  const queryParams = {
    ...filters,
    category_id: filters.category_id || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', queryParams],
    queryFn: () => getTransactions(queryParams),
    select: (res) => res.data,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }))
  }

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }))
  }

  const { items = [], total = 0, page = 1, pages = 1 } = data ?? {}

  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">Transactions</h1>
        <div className="topbar-actions">
          <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
            {total} total
          </span>
          <button
            id="add-txn-btn"
            className="btn btn-primary"
            onClick={() => setShowModal(true)}
          >
            + Add Transaction
          </button>
        </div>
      </header>

      <main className="page">
        {/* Filters */}
        <div className="filters-bar">
          <div className="filter-group">
            <label className="filter-label">Category</label>
            <select
              className="form-input"
              style={{ width: 180 }}
              value={filters.category_id}
              onChange={(e) => handleFilterChange('category_id', e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Start Date</label>
            <input
              className="form-input"
              type="date"
              style={{ width: 160 }}
              value={filters.start_date}
              onChange={(e) => handleFilterChange('start_date', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">End Date</label>
            <input
              className="form-input"
              type="date"
              style={{ width: 160 }}
              value={filters.end_date}
              onChange={(e) => handleFilterChange('end_date', e.target.value)}
            />
          </div>

          {(filters.category_id || filters.start_date || filters.end_date) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: '1.25rem' }}
              onClick={() => setFilters({ category_id: '', start_date: '', end_date: '', page: 1, page_size: 20 })}
            >
              ✕ Clear filters
            </button>
          )}
        </div>

        <TransactionTable
          transactions={items}
          loading={isLoading}
          onDelete={(id) => {
            if (confirm('Delete this transaction?')) {
              deleteMutation.mutate(id)
            }
          }}
        />

        {/* Pagination */}
        {pages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
            >
              ‹
            </button>

            {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  className={`page-btn ${page === p ? 'active' : ''}`}
                  onClick={() => handlePageChange(p)}
                >
                  {p}
                </button>
              )
            })}

            <button
              className="page-btn"
              disabled={page >= pages}
              onClick={() => handlePageChange(page + 1)}
            >
              ›
            </button>
          </div>
        )}
      </main>

      {showModal && <AddTransactionModal onClose={() => setShowModal(false)} />}
    </>
  )
}
