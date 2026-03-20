import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

const COLORS = [
  '#6366f1', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#14b8a6',
]

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        boxShadow: 'var(--shadow-lg)',
      }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 4 }}>{label}</p>
        <p style={{ color: 'var(--color-primary-light)', fontWeight: 700 }}>
          ${Number(payload[0].value).toFixed(2)}
        </p>
      </div>
    )
  }
  return null
}

export default function SpendingChart({ summary, loading }) {
  const data = summary?.by_category
    ? Object.entries(summary.by_category)
        .map(([name, total]) => ({ name, total: Number(total) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8)
    : []

  if (loading) {
    return (
      <div className="chart-container">
        <div className="chart-title">Spending by Category</div>
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="chart-container">
        <div className="chart-title">Spending by Category</div>
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p>No spending data for this month</p>
        </div>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <div className="chart-title">
        <span>Spending by Category</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>
          This month
        </span>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-25}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${v}`}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
