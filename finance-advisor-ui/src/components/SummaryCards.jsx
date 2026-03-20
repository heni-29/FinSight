const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

export default function SummaryCards({ summary, loading }) {
  if (loading) {
    return (
      <div className="summary-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="summary-card">
            <div className="skeleton" style={{ height: 14, width: 80, marginBottom: 12 }} />
            <div className="skeleton" style={{ height: 36, width: 140 }} />
          </div>
        ))}
      </div>
    )
  }

  const cards = [
    {
      cls: 'income',
      label: '💰 Income',
      key: 'income',
      amountCls: 'income',
    },
    {
      cls: 'expense',
      label: '📉 Expenses',
      key: 'expenses',
      amountCls: 'expense',
    },
    {
      cls: 'net',
      label: '✨ Net',
      key: 'net',
      amountCls: 'net',
    },
  ]

  return (
    <div className="summary-grid">
      {cards.map((card) => {
        const val = summary?.[card.key] ?? 0
        return (
          <div key={card.key} className={`summary-card ${card.cls}`}>
            <div className="summary-card-label">{card.label}</div>
            <div className={`summary-card-amount ${card.amountCls}`}>
              {formatter.format(Math.abs(val))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
