import { useQuery } from '@tanstack/react-query'
import ChatInterface from '../components/ChatInterface.jsx'
import SpendingChart from '../components/SpendingChart.jsx'
import { getSummary } from '../api/transactions'

export default function Advisor() {
  const now = new Date()

  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['summary', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => getSummary({ year: now.getFullYear(), month: now.getMonth() + 1 }),
    select: (res) => res.data,
  })

  return (
    <>
      <header className="topbar">
        <h1 className="topbar-title">AI Advisor</h1>
        <div className="topbar-actions">
          <span className="badge badge-primary">🤖 Powered by GPT-4o</span>
        </div>
      </header>

      <main className="page">
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Your AI advisor has access to your real transaction data and can answer questions about your spending, identify anomalies, and give personalized recommendations.
        </p>

        <div className="advisor-layout">
          <ChatInterface />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <SpendingChart summary={summaryData} loading={isLoading} />

            <div className="card">
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem' }}>
                💡 Try asking...
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {[
                  'What did I spend the most on this month?',
                  'Compare my food spending to last month',
                  'Find any unusual transactions in my account',
                  'How can I reduce my monthly expenses?',
                  'What categories am I overspending in?',
                ].map((suggestion, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '0.625rem 0.875rem',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      color: 'var(--color-text-muted)',
                      cursor: 'default',
                    }}
                  >
                    "{suggestion}"
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
