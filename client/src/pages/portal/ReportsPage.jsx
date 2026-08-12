import { useState, useEffect } from 'react'
import { Calendar, TrendingUp, Users, DollarSign, RefreshCw, Clock, CreditCard, Pill, AlertTriangle, PackageCheck, BarChart3, Stethoscope } from 'lucide-react'
import { getReceptionistSummary, getPharmacySummary, getAnalyticsSeries, getInventoryReport, getProfitReport } from '../../services/reportsService'
import { getExecutiveAnalytics } from '../../services/settingsService'
import { listUsers } from '../../services/userService'
import { LineChartCard, BarChartCard, PieChartCard } from '../../components/reports/charts'
import { formatNumber, formatCurrency } from '../../utils/chartTheme'

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('receptionist') // 'receptionist' | 'pharmacy' | 'analytics'
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0])
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [doctorIdFilter, setDoctorIdFilter] = useState('')
  const [doctorsList, setDoctorsList] = useState([])

  const [summary, setSummary] = useState(null)
  const [pharmacyReport, setPharmacyReport] = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [profitData, setProfitData] = useState(null)
  const [studioTrend, setStudioTrend] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    listUsers({ role: 'doctor' })
      .then((res) => setDoctorsList(res.users || []))
      .catch(() => {})
  }, [])

  const fetchSummary = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'receptionist') {
        const res = await getReceptionistSummary({ date: reportDate })
        setSummary(res.summary)
      } else if (activeTab === 'pharmacy') {
        const [pharm, inv] = await Promise.all([
          getPharmacySummary({ date: reportDate }),
          getInventoryReport(),
        ])
        setPharmacyReport(pharm.summary)
        setInventoryData(inv.data)
      } else if (activeTab === 'analytics') {
        const [exec, trend, profit] = await Promise.all([
          getExecutiveAnalytics({ startDate, endDate, doctorId: doctorIdFilter }),
          getAnalyticsSeries({ startDate, endDate }),
          getProfitReport({ startDate, endDate }),
        ])
        setAnalyticsData(exec.analytics)
        setStudioTrend(trend.data)
        setProfitData(profit.data)
      }
    } catch (err) {
      setError(err.message || 'Failed to load report summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSummary()
  }, [reportDate, activeTab, startDate, endDate, doctorIdFilter])

  const footfall = summary?.footfall || { total: 0, walkIn: 0, appointmentCheckIn: 0, byStatus: {} }
  const revenue = summary?.revenue || { totalRupees: 0, byMethod: {}, paymentCount: 0 }
  const apts = summary?.appointments || { byStatus: {}, bySource: {} }

  const pDispensing = pharmacyReport?.dispensing || { totalEvents: 0, totalUnits: 0, records: [] }
  const pInventory = pharmacyReport?.inventorySummary || { totalMedicines: 0, totalBatches: 0, totalStockQuantity: 0, totalCostValue: 0, totalRetailValue: 0 }
  const pLowStock = pharmacyReport?.lowStock || { count: 0, items: [] }
  const pExpiring = pharmacyReport?.expiringBatches || { count: 0, items: [] }

  const execRev = analyticsData?.revenue || { totalRupees: 0, byMethodRupees: {}, paymentCount: 0 }
  const execConsult = analyticsData?.consultations || { total: 0, completed: 0, inProgress: 0 }
  const execTopProc = analyticsData?.topProcedures || []
  const execDocPerf = analyticsData?.doctorPerformance || []

  // Chart data transforms
  const revenueByMethodData = Object.entries(revenue.byMethod || {})
    .filter(([, v]) => Number(v) !== 0)
    .map(([method, v]) => ({
      id: method,
      label: method.charAt(0).toUpperCase() + method.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2'),
      value: Number(v) || 0,
    }))

  const appointmentStatusData = Object.entries(apts.byStatus || {})
    .filter(([k, v]) => k !== 'total' && Number(v) !== 0)
    .map(([status, count]) => ({
      id: status,
      label: status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' '),
      value: Number(count) || 0,
    }))

  const inventoryCategoryData = (inventoryData?.byCategory || []).map((c) => ({
    id: c.category,
    label: c.label,
    value: c.sellValue,
  }))

  const execByMethodData = Object.entries(execRev.byMethodRupees || {})
    .filter(([, v]) => Number(v) !== 0)
    .map(([method, v]) => ({
      id: method,
      label: method.charAt(0).toUpperCase() + method.slice(1).replace(/([a-z])([A-Z])/g, '$1 $2'),
      value: Number(v) || 0,
    }))

  const returnBtnClass = 'btn btn-sm btn-outline'

  return (
    <div className="portal-page">
      <div className="portal-heading flex justify-between items-center flex-wrap gap-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Clinic Performance & Operational Reports</h1>
          <p>Daily receptionist footfall, revenue summary, pharmacy inventory reports, and executive analytics</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {activeTab !== 'analytics' ? (
            <input
              type="date"
              className="form-control"
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
            />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="date"
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <span style={{ fontSize: '12px', color: '#64748b' }}>to</span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <select
                className="form-control"
                style={{ padding: '6px 10px', fontSize: '13px' }}
                value={doctorIdFilter}
                onChange={(e) => setDoctorIdFilter(e.target.value)}
              >
                <option value="">All Doctors</option>
                {doctorsList.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}
          <button type="button" className="btn btn-secondary" onClick={fetchSummary}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className={`btn ${activeTab === 'receptionist' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('receptionist')}
        >
          <Users size={16} className="mr-1 inline" /> Receptionist & Revenue Summary
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'pharmacy' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('pharmacy')}
        >
          <Pill size={16} className="mr-1 inline" /> Pharmacy & Inventory Reports
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'analytics' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('analytics')}
        >
          <BarChart3 size={16} className="mr-1 inline" /> Cross-Module Executive Analytics
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading reports data...</div>
      ) : activeTab === 'analytics' ? (
        <div>
          {/* Executive Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Collections</span>
                <DollarSign size={20} color="#059669" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669' }}>
                ₹{execRev.totalRupees ? execRev.totalRupees.toLocaleString('en-IN') : '0'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Across {execRev.paymentCount} payment transaction(s)
              </div>
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Clinical Consultations</span>
                <Stethoscope size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{execConsult.total}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {execConsult.completed} Completed | {execConsult.inProgress} In Progress
              </div>
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>New Patient Registrations</span>
                <Users size={20} color="#7c3aed" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#7c3aed' }}>{analyticsData?.patientRegistrations || 0}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Registered in selected date range
              </div>
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #d97706' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Dispensed Medicines</span>
                <Pill size={20} color="#d97706" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706' }}>{analyticsData?.pharmacy?.totalUnitsDispensed || 0}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Across {analyticsData?.pharmacy?.dispenseEvents || 0} pharmacy dispensing events
              </div>
            </div>
          </div>

          {/* Analytics Trend Charts */}
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <LineChartCard
              title="Revenue Trend"
              subtitle={`Revenue ${startDate} → ${endDate}`}
              labels={(studioTrend?.trend || []).map((r) => r.label)}
              series={[{ name: 'Revenue', data: (studioTrend?.trend || []).map((r) => r.revenue), color: 'var(--color-forest)' }]}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
              yLabel="Revenue"
            />
            <LineChartCard
              title="Profit & Cost Trend"
              subtitle="Gross profit vs dispensed COGS"
              labels={(profitData?.trend || []).map((r) => r.label)}
              series={[
                { name: 'Revenue', data: (profitData?.trend || []).map((r) => r.revenue), color: 'var(--color-forest)' },
                { name: 'Cost', data: (profitData?.trend || []).map((r) => r.cost), color: '#d98200' },
                { name: 'Profit', data: (profitData?.trend || []).map((r) => r.profit), color: 'var(--color-coral)' },
              ]}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
              yLabel="Amount"
            />
          </div>

          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <PieChartCard
              title="Revenue by Payment Mode"
              subtitle={`Across ${execRev.paymentCount} transaction(s)`}
              data={execByMethodData}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
            />
            <BarChartCard
              title="Gross Profit Summary"
              subtitle="Collections vs cost of dispensed medicines"
              labels={['Period']}
              series={[
                { name: 'Revenue', data: [execRev.totalRupees], color: 'var(--color-forest)' },
                { name: 'Profit', data: [profitData?.summary?.grossProfit ?? (execRev.totalRupees / 100)], color: 'var(--color-coral)' },
              ]}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
              yLabel="Amount"
            />
          </div>

          {/* Top Executed Procedures & Doctor Performance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#1e293b' }}>
                Top Executed Clinical Procedures
              </h2>
              {execTopProc.length === 0 ? (
                <p className="text-sm text-muted">No clinical procedure records found in range.</p>
              ) : (
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Procedure</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Executions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {execTopProc.map((proc, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{proc.procedure}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{proc.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#1e293b' }}>
                Doctor Performance Summary
              </h2>
              {execDocPerf.length === 0 ? (
                <p className="text-sm text-muted">No doctor consultation activity recorded in range.</p>
              ) : (
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Doctor Name</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Total Visits</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {execDocPerf.map((doc, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{doc.name}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{doc.consultations}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: '#059669', fontWeight: 700 }}>{doc.completed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : activeTab === 'pharmacy' ? (
        <div>
          {/* Pharmacy Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Daily Dispensed Units</span>
                <Pill size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{pDispensing.totalUnits}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Across <strong>{pDispensing.totalEvents}</strong> dispensing event(s) today
              </div>
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Stock-on-Hand Valuation</span>
                <PackageCheck size={20} color="#059669" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669' }}>
                ₹{pInventory.totalRetailValue ? pInventory.totalRetailValue.toLocaleString('en-IN') : '0'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Total Cost: ₹{pInventory.totalCostValue ? pInventory.totalCostValue.toLocaleString('en-IN') : '0'} ({pInventory.totalStockQuantity} units)
              </div>
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #d97706' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Low-Stock Reorder Alerts</span>
                <AlertTriangle size={20} color="#d97706" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#d97706' }}>{pLowStock.count}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Medicines at or below reorder threshold
              </div>
            </div>
          </div>

          {/* Inventory Charts */}
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <PieChartCard
              title="Inventory Value by Category"
              subtitle="Current stock-on-hand retail value"
              data={inventoryCategoryData}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
            />
            <BarChartCard
              title="Inventory Valuation"
              subtitle="Cost value vs retail value of stock-on-hand"
              labels={['Stock-on-hand']}
              series={[
                { name: 'Cost', data: [pInventory.totalCostValue], color: 'var(--color-coral)' },
                { name: 'Retail', data: [pInventory.totalRetailValue], color: 'var(--color-forest)' },
              ]}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
              yLabel="Value"
            />
          </div>

          {/* Daily Dispensing Log Table */}
          <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#1e293b' }}>
              Daily Dispensing Report ({reportDate})
            </h2>
            {pDispensing.records.length === 0 ? (
              <p className="text-sm text-muted">No medicines dispensed on this date.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Dispensing #</th>
                      <th style={{ padding: '10px' }}>Prescription #</th>
                      <th style={{ padding: '10px' }}>Patient</th>
                      <th style={{ padding: '10px' }}>Pharmacist</th>
                      <th style={{ padding: '10px' }}>Dispensed Medicines</th>
                      <th style={{ padding: '10px' }}>Total Units</th>
                      <th style={{ padding: '10px' }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pDispensing.records.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{r.dispensingNumber}</td>
                        <td style={{ padding: '10px' }}>{r.prescriptionNumber}</td>
                        <td style={{ padding: '10px' }}>{r.patientName} ({r.patientId})</td>
                        <td style={{ padding: '10px' }}>{r.pharmacistName}</td>
                        <td style={{ padding: '10px' }}>
                          {(r.items || []).map((it, idx) => (
                            <div key={idx}>{it.medicineName}: {it.quantity} {it.unit}</div>
                          ))}
                        </td>
                        <td style={{ padding: '10px', fontWeight: 700 }}>{r.totalQuantity}</td>
                        <td style={{ padding: '10px', color: '#64748b' }}>{new Date(r.dispensedAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock Reorder List */}
          <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} /> Low Stock & Reorder Report ({pLowStock.count})
            </h2>
            {pLowStock.items.length === 0 ? (
              <p className="text-sm text-muted">All medicine stock levels are optimal.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>Medicine Name</th>
                      <th style={{ padding: '10px' }}>Generic Name</th>
                      <th style={{ padding: '10px' }}>Category</th>
                      <th style={{ padding: '10px' }}>Current Stock</th>
                      <th style={{ padding: '10px' }}>Reorder Level</th>
                      <th style={{ padding: '10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pLowStock.items.map((m) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{m.name}</td>
                        <td style={{ padding: '10px' }}>{m.genericName || '—'}</td>
                        <td style={{ padding: '10px', textTransform: 'capitalize' }}>{m.category}</td>
                        <td style={{ padding: '10px', fontWeight: 700, color: m.quantity === 0 ? '#dc2626' : '#d97706' }}>
                          {m.quantity} {m.unit}
                        </td>
                        <td style={{ padding: '10px' }}>{m.reorderLevel} {m.unit}</td>
                        <td style={{ padding: '10px' }}>
                          <span className={`badge ${m.quantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                            {m.quantity === 0 ? 'Out of Stock' : 'Low Stock'}
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
      ) : (
        <>
          {/* Key Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #0284c7' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Daily Footfall</span>
                <Users size={20} color="#0284c7" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{footfall.total}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Walk-ins: <strong>{footfall.walkIn}</strong> • Pre-booked: <strong>{footfall.appointmentCheckIn}</strong>
              </div>
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #059669' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Total Collections Today</span>
                <DollarSign size={20} color="#059669" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#059669' }}>
                ₹{revenue.totalRupees ? revenue.totalRupees.toLocaleString('en-IN') : '0'}
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {revenue.paymentCount} transaction(s) recorded today
              </div>
            </div>

            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px', borderLeft: '4px solid #7c3aed' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#64748b' }}>Appointments Total</span>
                <Calendar size={20} color="#7c3aed" />
              </div>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0f172a' }}>{apts.byStatus?.total || 0}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                Completed: <strong>{apts.byStatus?.completed || 0}</strong> • Cancelled: <strong>{apts.byStatus?.cancelled || 0}</strong>
              </div>
            </div>
          </div>

          {/* Receptionist Charts */}
          <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '24px' }}>
            <PieChartCard
              title="Revenue by Payment Mode"
              subtitle={`Collections on ${reportDate}`}
              data={revenueByMethodData}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
            />
            <PieChartCard
              title="Appointments by Status"
              subtitle={`Appointments on ${reportDate}`}
              data={appointmentStatusData}
              loading={loading}
              error={error}
              onRetry={fetchSummary}
            />
          </div>

          {/* Detailed Section Grids */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            {/* Revenue Collections Breakdown */}
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
              <h3 className="card-title" style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={18} color="#059669" /> Revenue by Payment Mode
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Cash</span>
                  <strong style={{ color: '#059669' }}>₹{(revenue.byMethod?.cash || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>UPI / QR</span>
                  <strong style={{ color: '#059669' }}>₹{(revenue.byMethod?.upi || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Credit / Debit Card</span>
                  <strong style={{ color: '#059669' }}>₹{(revenue.byMethod?.card || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Bank Transfer</span>
                  <strong style={{ color: '#059669' }}>₹{(revenue.byMethod?.bankTransfer || 0).toLocaleString('en-IN')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Other / Online</span>
                  <strong style={{ color: '#059669' }}>₹{(revenue.byMethod?.other || 0).toLocaleString('en-IN')}</strong>
                </div>
              </div>
            </div>

            {/* Appointment Status Breakdown */}
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
              <h3 className="card-title" style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#7c3aed" /> Appointment Status Summary
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Scheduled</span>
                  <span className="badge badge-subtle">{apts.byStatus?.scheduled || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Confirmed</span>
                  <span className="badge badge-info">{apts.byStatus?.confirmed || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Checked In</span>
                  <span className="badge badge-success">{apts.byStatus?.['checked-in'] || 0}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Completed</span>
                  <span className="badge badge-success" style={{ background: '#dcfce7', color: '#16a34a' }}>
                    {apts.byStatus?.completed || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <span>Cancelled</span>
                  <span className="badge badge-danger" style={{ background: '#fee2e2', color: '#dc2626' }}>
                    {apts.byStatus?.cancelled || 0}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px' }}>
                  <span>No Show</span>
                  <span className="badge badge-subtle">{apts.byStatus?.['no-show'] || 0}</span>
                </div>
              </div>
            </div>

            {/* Booking Channel Sources */}
            <div className="card" style={{ background: '#fff', padding: '20px', borderRadius: '12px' }}>
              <h3 className="card-title" style={{ margin: '0 0 16px 0', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} color="#0284c7" /> Patient Intake Channels
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Walk-in Direct</span>
                  <strong>{apts.bySource?.['walk-in'] || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Phone Call Booking</span>
                  <strong>{apts.bySource?.phone || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Website / Online</span>
                  <strong>{apts.bySource?.website || 0}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <span>Existing Patient Follow-up</span>
                  <strong>{apts.bySource?.existing || 0}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}