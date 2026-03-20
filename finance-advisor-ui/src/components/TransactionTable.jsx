const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function TransactionTable({ transactions = [], loading, onDelete, compact = false }) {
  if (loading) {
    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Merchant</th>
              <th>Category</th>
              <th>Amount</th>
              {!compact && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i}>
                <td><div className="skeleton" style={{ height: 14, width: 80 }} /></td>
                <td><div className="skeleton" style={{ height: 14, width: 140 }} /></td>
                <td><div className="skeleton" style={{ height: 20, width: 90 }} /></td>
                <td><div className="skeleton" style={{ height: 14, width: 70 }} /></td>
                {!compact && <td><div className="skeleton" style={{ height: 28, width: 60 }} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!transactions.length) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">💳</div>
        <p>No transactions found</p>
        <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', color: 'var(--color-text-dim)' }}>
          Add a transaction manually or connect your bank account
        </p>
      </div>
    )
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Merchant</th>
            <th>Category</th>
            <th>Amount</th>
            {!compact && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {transactions.map((txn) => {
            const isExpense = txn.amount > 0
            return (
              <tr key={txn.id}>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
                  {formatDate(txn.date)}
                </td>
                <td>
                  <div>
                    <span style={{ fontWeight: 500 }}>
                      {txn.merchant_name || txn.raw_name || 'Unknown'}
                    </span>
                    {txn.is_anomaly && (
                      <span className="badge badge-warning" style={{ marginLeft: 8 }}>⚠ Anomaly</span>
                    )}
                  </div>
                </td>
                <td>
                  {txn.category ? (
                    <span className="badge badge-primary">{txn.category.name}</span>
                  ) : (
                    <span className="badge" style={{ background: 'rgba(100,116,139,0.15)', color: 'var(--color-text-dim)', border: '1px solid rgba(100,116,139,0.2)' }}>
                      Uncategorized
                    </span>
                  )}
                </td>
                <td>
                  <span className={isExpense ? 'amount-negative' : 'amount-positive'}>
                    {isExpense ? '-' : '+'}{formatter.format(Math.abs(txn.amount))}
                  </span>
                </td>
                {!compact && onDelete && (
                  <td>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => onDelete(txn.id)}
                    >
                      Delete
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
