import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { usePlaidLink } from 'react-plaid-link'
import { getSummary, getTransactions } from '../api/transactions'
import { createLinkToken, exchangeToken, syncTransactions } from '../api/plaid'
import SummaryCards from '../components/SummaryCards.jsx'
import SpendingChart from '../components/SpendingChart.jsx'
import TransactionTable from '../components/TransactionTable.jsx'

function ConnectBankButton({ onConnected }) {
  const [linkToken, setLinkToken] = useState(null)
  const [status, setStatus] = useState('')

  const fetchTokenMutation = useMutation({
    mutationFn: createLinkToken,
    onSuccess: (res) => setLinkToken(res.data.link_token),
    onError: () => setStatus('Failed to initialize Plaid. Check your API keys.'),
  })

  const exchangeMutation = useMutation({
    mutationFn: ({ public_token, institution }) =>
      exchangeToken({ public_token, institution_name: institution, account_name: 'Checking' }),
    onSuccess: () => syncMutation.mutate(),
    onError: () => setStatus('Failed to connect bank account'),
  })

  const syncMutation = useMutation({
    mutationFn: syncTransactions,
    onSuccess: (res) => {
      setStatus(`✅ Synced ${res.data.synced} transactions!`)
      onConnected?.()
    },
    onError: () => setStatus('Failed to sync transactions'),
  })

  const onSuccess = useCallback(
    (public_token, metadata) => {
      exchangeMutation.mutate({
        public_token,
        institution: metadata?.institution?.name || 'Unknown Bank',
      })
    },
    [exchangeMutation]
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
  })

  // Auto-open Plaid Link once the token is fetched and the widget is ready
  useEffect(() => {
    if (linkToken && ready) {
      open()
    }
  }, [linkToken, ready, open])

  const handleConnect = () => {
    if (linkToken && ready) {
      open()
    } else {
      fetchTokenMutation.mutate()
    }
  }

  const isLoading =
    fetchTokenMutation.isPending || exchangeMutation.isPending || syncMutation.isPending

  return (
    <div>
      <button
        id="connect-bank-btn"
        className="btn btn-primary"
        onClick={handleConnect}
        disabled={isLoading}
      >
        {isLoading ? (
          <><div className="spinner" style={{ width: 16, height: 16 }} /> Connecting...</>
        ) : (
          'Connect Bank Account'
        )}
      </button>
      {status && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
          {status}
        </p>
      )}
    </div>
  )
}

export default function Dashboard() {
  const queryClient = useQueryClient()
  const now = new Date()

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => getSummary({ year: now.getFullYear(), month: now.getMonth() + 1 }),
    select: (res) => res.data,
  })

  const { data: txnData, isLoading: txnLoading } = useQuery({
    queryKey: ['transactions', { page: 1, page_size: 5 }],
    queryFn: () => getTransactions({ page: 1, page_size: 5 }),
    select: (res) => res.data,
  })

  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">Dashboard</h1>
        <div className="topbar-actions">
          <ConnectBankButton
            onConnected={() => {
              queryClient.invalidateQueries({ queryKey: ['transactions'] })
              queryClient.invalidateQueries({ queryKey: ['summary'] })
            }}
          />
        </div>
      </header>

      <main className="page">
        <SummaryCards summary={summaryData} loading={summaryLoading} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem', alignItems: 'start' }}>
          {/* Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <SpendingChart summary={summaryData} loading={summaryLoading} />

            {/* Top Categories Card */}
            <div className="card" style={{ minHeight: '300px' }}>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '1rem' }}>Top Categories</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {summaryData?.by_category &&
                  Object.entries(summaryData.by_category)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 6)
                    .map(([cat, amount]) => (
                      <div key={cat} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.825rem', color: 'var(--color-text-muted)' }}>{cat}</span>
                        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--color-danger)' }}>
                          ${Number(amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                {!summaryData?.by_category && (
                  <p style={{ color: 'var(--color-text-dim)', fontSize: '0.875rem' }}>No data yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Recent Transactions */}
            <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', minHeight: '320px' }}>
              <div style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)' }}>
                <h2 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Recent Transactions</h2>
                <Link to="/transactions" style={{ fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>
                  View all →
                </Link>
              </div>
              <div style={{ padding: '1rem 1.5rem', flex: 1 }}>
                <TransactionTable
                  transactions={txnData?.items ?? []}
                  loading={txnLoading}
                  compact
                />
              </div>
            </div>

            {/* AI Advisor CTA */}
            <div className="card" style={{ background: 'var(--gradient-card)', borderColor: 'rgba(99,102,241,0.25)', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem' }}>AI Finance Advisor</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                Get personalized insights based on your spending patterns.
              </p>
              <Link to="/advisor" className="btn btn-primary btn-sm">
                Start Chat →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
