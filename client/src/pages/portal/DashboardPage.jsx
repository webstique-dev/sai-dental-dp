import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  UserPlus,
  CalendarPlus,
  UserCheck,
  CreditCard,
  BarChart2,
  Users,
  DollarSign,
  Clock,
  IndianRupee,
  Package,
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import { getReceptionistSummary, getDashboardAnalytics } from '../../services/reportsService'
import { LineChartCard, BarChartCard, PieChartCard } from '../../components/reports/charts'
import { formatCurrency, formatNumber } from '../../utils/chartTheme'

const PERIODS = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
]

export default function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('30d')
  const [data, setData] = useState(null)
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [error, setError] = useState('')

  const isReceptionistOrAdmin = user.role === 'receptionist' || user.role === 'admin'

  useEffect(() => {
    if (isReceptionistOrAdmin) {
      setLoading(true)
      getReceptionistSummary()
        .then((res) => setSummary(res.summary))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [isReceptionistOrAdmin])

  const fetchAnalytics = useCallback(() => {
    setAnalyticsLoading(true)
    setError('')
    getDashboardAnalytics({ period })
      .then((res) => setData(res.data))
      .catch((err) => setError(err?.message || 'Failed to load analytics'))
      .finally(() => setAnalyticsLoading(false))
  }, [period])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const footfall = summary?.footfall || { total: 0, walkIn: 0, appointmentCheckIn: 0 }
  const revenue = summary?.revenue || { totalRupees: 0 }
  const apts = summary?.appointments || { byStatus: { total: 0, completed: 0 } }

  const s = data?.summary || {}
  const series = data?.series || {}
  const salesLabels = (series.salesTrend || []).map((r) => r.label)
  const purchaseLabels = (series.purchaseTrend || []).map((r) => r.label)

  const summaryCards = [
    { label: 'Revenue', value: formatCurrency(s.revenue), icon: <IndianRupee size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Orders', value: formatNumber(s.orders), icon: <CreditCard size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Gross Profit', value: formatCurrency(s.profit), icon: <TrendingUp size={18} />, tint: 'rgba(244,211,94,0.2)', color: '#d98200' },
    { label: 'Avg Order', value: formatCurrency(s.avgOrderValue), icon: <BarChart2 size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Patients', value: formatNumber(s.totalPatients), icon: <Users size={18} />, tint: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)' },
    { label: 'Consultations', value: formatNumber(s.consultations), icon: <Activity size={18} />, tint: 'rgba(255,140,105,0.15)', color: '#d95f43' },
    { label: 'Inventory Value', value: formatCurrency(s.inventoryValue), icon: <Package size={18} />, tint: 'rgba(244,211,94,0.2)', color: '#d98200' },
    { label: 'Low Stock', value: formatNumber(s.lowStockCount), icon: <AlertTriangle size={18} />, tint: 'rgba(217,67,67,0.1)', color: '#d94343' },
  ]

  const activityIcon = { payment: '₹', dispensing: 'P', appointment: 'A' }

  return (
    <div className="portal-page">
      <div className="portal-heading">
        <h1>Welcome back, {user.name}</h1>
        <p>
          You are signed in as <strong>{user.roleLabel || user.role}</strong>. Clinic Platform & Analytics are live.
        </p>
      </div>

      {isReceptionistOrAdmin && (
        <>
          {/* Quick Action Shortcuts */}
          <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h2 className="card-title" style={{ margin: '0 0 16px 0', fontSize: '16px' }}>Quick Receptionist Actions</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              <Link to="/portal/patients" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto' }}>
                <UserPlus size={18} color="#0284c7" /> Register New Patient
              </Link>
              <Link to="/portal/appointments" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto' }}>
                <CalendarPlus size={18} color="#7c3aed" /> Book Appointment
              </Link>
              <Link to="/portal/check-in" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto' }}>
                <UserCheck size={18} color="#059669" /> Check-in Queue & Token
              </Link>
              <Link to="/portal/billing" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', height: 'auto' }}>
                <CreditCard size={18} color="#d97706" /> Billing & Payments
              </Link>
            </div>
          </div>

          {/* Daily Clinic Overview Stats */}
          <div className="stat-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <span className="stat-label" style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={14} /> Today's Footfall
              </span>
              <span className="stat-value" style={{ fontSize: '28px', fontWeight: '800' }}>
                {loading ? '…' : footfall.total}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {footfall.walkIn} Walk-ins • {footfall.appointmentCheckIn} Appts
              </span>
            </div>

            <div className="stat-card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
              <span className="stat-label" style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DollarSign size={14} /> Today's Collections
              </span>
              <span className="stat-value" style={{ fontSize: '28px', fontWeight: '800', color: '#059669' }}>
                {loading ? '…' : `₹${revenue.totalRupees ? revenue.totalRupees.toLocaleString('en-IN') : '0'}`}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Total Revenue Collected</span>
            </div>

            <div className="stat-card" style={{ background: '#fff', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
              <span className="stat-label" style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={14} /> Appointments Today
              </span>
              <span className="stat-value" style={{ fontSize: '28px', fontWeight: '800' }}>
                {loading ? '…' : apts.byStatus?.total || 0}
              </span>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {apts.byStatus?.completed || 0} Completed
              </span>
            </div>
          </div>
        </>
      )}

      {/* ---- Dashboard Analytics ---- */}
      <div className="card mb-6" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 className="card-title" style={{ margin: 0, fontSize: '16px' }}>Clinic Analytics</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Revenue, profit and operations for the selected period
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div className="period-toggle" style={{ display: 'flex', background: 'var(--color-paper-soft)', borderRadius: '2px', padding: '3px' }}>
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  className={`btn btn-sm ${period === p.value ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ minWidth: '44px' }}
                  onClick={() => setPeriod(p.value)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button type="button" className="btn btn-sm btn-outline" onClick={fetchAnalytics} aria-label="Refresh analytics">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4" role="alert">{error}</div>}

      {/* Summary cards */}
      <div className="stat-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {summaryCards.map((c) => (
          <div className="stat-card" key={c.label} style={{ background: '#fff', padding: '16px', borderRadius: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: c.tint, color: c.color, flexShrink: 0 }}>
                {c.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <span className="stat-label" style={{ fontSize: '11px', color: '#64748b', display: 'block' }}>{c.label}</span>
                <span className="stat-value" style={{ fontSize: '22px', fontWeight: '800', color: c.color, lineHeight: 1.2 }}>
                  {analyticsLoading ? '…' : c.value}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Trend charts */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <LineChartCard
          title="Sales Trend"
          subtitle="Revenue collected over time"
          labels={salesLabels}
          series={[{ name: 'Revenue', data: (series.salesTrend || []).map((r) => r.revenue), color: 'var(--color-forest)' }]}
          loading={analyticsLoading}
          error={error}
          onRetry={fetchAnalytics}
          yLabel="Revenue"
        />
        <LineChartCard
          title="Profit Trend"
          subtitle="Revenue minus dispensed COGS"
          labels={(series.profitTrend || []).map((r) => r.label)}
          series={[
            { name: 'Revenue', data: (series.profitTrend || []).map((r) => r.revenue), color: 'var(--color-forest)' },
            { name: 'Cost', data: (series.profitTrend || []).map((r) => r.cost), color: '#d98200' },
            { name: 'Profit', data: (series.profitTrend || []).map((r) => r.profit), color: 'var(--color-coral)' },
          ]}
          loading={analyticsLoading}
          error={error}
          onRetry={fetchAnalytics}
          yLabel="Amount"
        />
      </div>

      {/* Sales vs Purchases + Inventory pie */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <BarChartCard
          title="Sales vs Purchases"
          subtitle="Revenue collected vs stock purchased"
          labels={purchaseLabels}
          series={[
            { name: 'Sales', data: (series.salesPurchases || []).map((r) => r.revenue), color: 'var(--color-forest)' },
            { name: 'Purchases', data: (series.salesPurchases || []).map((r) => r.purchases), color: 'var(--color-coral)' },
          ]}
          loading={analyticsLoading}
          error={error}
          onRetry={fetchAnalytics}
          yLabel="Amount"
          stacked={false}
        />
        <PieChartCard
          title="Inventory by Category"
          subtitle="Current retail value of stock-on-hand"
          data={(data?.inventoryByCategory || []).map((c) => ({ id: c.category, label: c.label, value: c.sellValue }))}
          loading={analyticsLoading}
          error={error}
          onRetry={fetchAnalytics}
        />
      </div>

      {/* Top products + Low stock + Recent activity */}
      <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h3 className="card-title" style={{ margin: '0 0 14px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart2 size={18} color="#059669" /> Top Dispensed Products
          </h3>
          {(data?.topProducts || []).length === 0 ? (
            <p className="text-sm text-muted">No medicine dispensing recorded in period.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Product</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Revenue</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.topProducts || []).slice(0, 8).map((p, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{p.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatNumber(p.quantity)}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{formatCurrency(p.revenue)}</td>
                      <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{formatCurrency(p.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
          <h3 className="card-title" style={{ margin: '0 0 14px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="#d97706" /> Low Stock Alerts
          </h3>
          {(data?.lowStock || []).length === 0 ? (
            <p className="text-sm text-muted">All medicine stock levels are optimal.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#fffbeb', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Medicine</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Stock</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Reorder</th>
                    <th style={{ padding: '8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.lowStock || []).slice(0, 8).map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #fef3c7' }}>
                      <td style={{ padding: '8px', fontWeight: 600 }}>{m.name}</td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, color: m.quantity === 0 ? '#dc2626' : '#d97706' }}>{m.quantity}</td>
                      <td style={{ padding: '8px', textAlign: 'right' }}>{m.reorderLevel}</td>
                      <td style={{ padding: '8px' }}>
                        <span className={`badge ${m.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                          {m.quantity === 0 ? 'Out' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
        <h3 className="card-title" style={{ margin: '0 0 14px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={18} color="#0284c7" /> Recent Activity (last 14 days)
        </h3>
        {(data?.recentActivity || []).length === 0 ? (
          <p className="text-sm text-muted">No recent activity recorded.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {(data?.recentActivity || []).slice(0, 10).map((item) => (
              <div key={`${item.type}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: 'var(--color-paper)', borderRadius: '8px' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'rgba(26,60,43,0.08)', color: 'var(--color-forest)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                  {activityIcon[item.type] || '•'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--color-forest)' }}>{item.title}</div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{item.detail}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-forest)' }}>
                    {item.type === 'payment' ? formatCurrency(item.amount) : ''}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    {new Date(item.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <h2 className="card-title">System Status</h2>
        <p className="card-body-text">
          Patient Registration, Appointments Scheduling, Check-in Queue with Daily Tokens, Billing & Payments, Pharmacy, and full reporting & analytics are operational.
        </p>
      </div>
    </div>
  )
}
