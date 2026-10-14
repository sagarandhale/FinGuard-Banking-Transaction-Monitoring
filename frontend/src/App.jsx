import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownLeft, ArrowLeftRight, ArrowUpRight, BellRing, Building2, CircleAlert, Landmark, Plus, RefreshCw, ShieldCheck, WalletCards } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from './api'

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(value || 0))
const dateTime = (value) => value ? new Date(value).toLocaleString() : '—'

export default function App() {
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [alerts, setAlerts] = useState([])
  const [tab, setTab] = useState('Overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState('')
  const [form, setForm] = useState({ customerName: '', email: '', accountId: '', fromAccountId: '', toAccountId: '', amount: '', description: '' })

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [a, t, al] = await Promise.all([api.accounts(), api.transactions(), api.alerts()])
      setAccounts(a); setTransactions(t); setAlerts(al)
    } catch (e) {
      setError(`${e.message}. Make sure PostgreSQL and the Spring Boot API are running.`)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const totalBalance = useMemo(() => accounts.reduce((sum, a) => sum + Number(a.balance || 0), 0), [accounts])
  const pendingAlerts = alerts.filter(a => !a.reviewed).length
  const chartData = useMemo(() => {
    const grouped = {}
    transactions.filter(t => t.type === 'TRANSFER').forEach(t => {
      const key = new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      grouped[key] = (grouped[key] || 0) + Number(t.amount)
    })
    return Object.entries(grouped).slice(-7).map(([day, amount]) => ({ day, amount }))
  }, [transactions])

  const update = (key, value) => setForm(old => ({ ...old, [key]: value }))
  const showModal = (name) => {
    setNotice(''); setError('')
    setForm({ customerName: '', email: '', accountId: accounts[0]?.id || '', fromAccountId: accounts[0]?.id || '', toAccountId: accounts[1]?.id || '', amount: '', description: '' })
    setModal(name)
  }
  const submit = async (event) => {
    event.preventDefault(); setNotice(''); setError('')
    try {
      if (modal === 'account') {
        await api.createAccount({ customerName: form.customerName, email: form.email })
        setNotice('Account created successfully.')
      } else if (modal === 'deposit' || modal === 'withdraw') {
        const action = modal === 'deposit' ? api.deposit : api.withdraw
        await action(Number(form.accountId), { amount: Number(form.amount), description: form.description })
        setNotice(`${modal === 'deposit' ? 'Deposit' : 'Withdrawal'} completed successfully.`)
      } else if (modal === 'transfer') {
        await api.transfer({
          fromAccountId: Number(form.fromAccountId),
          toAccountId: Number(form.toAccountId),
          amount: Number(form.amount),
          description: form.description
        }, crypto.randomUUID())
        setNotice('Transfer completed successfully.')
      }
      setModal(''); await refresh()
    } catch (e) { setError(e.message) }
  }

  const reviewAlert = async (id) => {
    try { await api.reviewAlert(id, 'Reviewed in dashboard'); await refresh() }
    catch (e) { setError(e.message) }
  }

  const openActions = [
    { label: 'New account', icon: Plus, action: () => showModal('account') },
    { label: 'Deposit', icon: ArrowDownLeft, action: () => showModal('deposit') },
    { label: 'Withdraw', icon: ArrowUpRight, action: () => showModal('withdraw') },
    { label: 'Transfer', icon: ArrowLeftRight, action: () => showModal('transfer') }
  ]

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-icon"><ShieldCheck size={22}/></div><div><strong>FinGuard</strong><span>TRANSACTION INTELLIGENCE</span></div></div>
      <div className="workspace-label">WORKSPACE</div>
      {['Overview', 'Accounts', 'Transactions', 'Monitoring alerts'].map((item, i) => {
        const Icon = [Activity, WalletCards, ArrowLeftRight, BellRing][i]
        return <button key={item} className={`nav-item ${tab === item ? 'active' : ''}`} onClick={() => setTab(item)}><Icon size={18}/><span>{item}</span>{item === 'Monitoring alerts' && pendingAlerts > 0 && <b className="nav-count">{pendingAlerts}</b>}</button>
      })}
      <div className="sidebar-bottom"><div className="demo-pill"><span className="live-dot"></span> DEMO ENVIRONMENT</div><p>Portfolio project<br/>No real money involved</p></div>
    </aside>

    <main className="main-content">
      <header className="topbar"><div><span className="eyebrow">FINANCIAL OPERATIONS / DEMO</span><h1>{tab}</h1></div><div className="topbar-right"><span className="status"><i/> API workspace</span><button className="icon-button" onClick={refresh} title="Refresh data"><RefreshCw size={17}/></button><div className="avatar">FG</div></div></header>
      {error && <div className="banner error"><CircleAlert size={18}/><span>{error}</span></div>}
      {notice && <div className="banner success">{notice}</div>}
      {loading && <div className="loading-line">Connecting to FinGuard API…</div>}

      {tab === 'Overview' && <>
        <section className="welcome"><div><p className="eyebrow light">TUESDAY · FINANCIAL CONTROL CENTER</p><h2>Monitor money movement<br/>with confidence.</h2><p>Track simulated account activity, review alerts, and keep transaction operations consistent.</p></div><div className="welcome-art"><div className="orbit orbit-one"></div><div className="orbit orbit-two"></div><div className="art-core"><Landmark size={38}/></div><span className="art-tag">SECURE FLOW</span></div></section>
        <section className="stats-grid">
          <Stat title="Total accounts" value={accounts.length} detail="Registered demo accounts" icon={Building2} />
          <Stat title="Combined balances" value={money(totalBalance)} detail="Sum of account balances" icon={WalletCards} />
          <Stat title="Transactions" value={transactions.length} detail="Latest 100 records" icon={ArrowLeftRight} />
          <Stat title="Open alerts" value={pendingAlerts} detail="Awaiting review" icon={BellRing} highlight={pendingAlerts > 0} />
        </section>
        <section className="content-grid">
          <div className="panel chart-panel"><div className="panel-heading"><div><h3>Transfer activity</h3><p>Transfer value grouped by date</p></div><span className="mini-badge">LIVE DATA</span></div>{chartData.length ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e9edf4"/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8792a5', fontSize: 11 }}/><YAxis axisLine={false} tickLine={false} tick={{ fill: '#8792a5', fontSize: 11 }} width={42}/><Tooltip formatter={(v) => money(v)}/><Bar dataKey="amount" fill="#4b72e8" radius={[5,5,0,0]} /></BarChart></ResponsiveContainer></div> : <Empty title="No transfer activity yet" text="Create accounts, deposit funds, and make a transfer to populate this chart."/>}</div>
          <div className="panel actions-panel"><div className="panel-heading"><div><h3>Quick actions</h3><p>Common banking operations</p></div></div><div className="action-list">{openActions.map(({label, icon: Icon, action}) => <button key={label} className="action-row" onClick={action}><span className="action-icon"><Icon size={18}/></span><span>{label}</span><span className="action-arrow">↗</span></button>)}</div><div className="action-note"><ShieldCheck size={16}/><span>Transactions are processed by the Spring Boot API.</span></div></div>
        </section>
        <section className="panel"><div className="panel-heading"><div><h3>Recent transactions</h3><p>Latest activity across all accounts</p></div><button className="text-button" onClick={() => setTab('Transactions')}>View all →</button></div><TransactionTable transactions={transactions.slice(0, 5)}/></section>
      </>}

      {tab === 'Accounts' && <section className="panel"><div className="panel-heading"><div><h3>Customer accounts</h3><p>Accounts and current balances</p></div><button className="primary-button" onClick={() => showModal('account')}><Plus size={16}/> New account</button></div><AccountTable accounts={accounts}/></section>}
      {tab === 'Transactions' && <section className="panel"><div className="panel-heading"><div><h3>Transaction ledger</h3><p>Most recent 100 transaction records</p></div><button className="icon-button" onClick={refresh}><RefreshCw size={16}/></button></div><TransactionTable transactions={transactions}/></section>}
      {tab === 'Monitoring alerts' && <section className="panel"><div className="panel-heading"><div><h3>Monitoring alerts</h3><p>Explainable rules flagged these transactions for review</p></div><span className="mini-badge">{pendingAlerts} OPEN</span></div><AlertTable alerts={alerts} onReview={reviewAlert}/></section>}
      <footer className="footer"><span>FinGuard © 2026</span><span><i className="footer-dot"/> Simulated data · Not a real banking service</span></footer>
    </main>

    {modal && <div className="modal-backdrop" onClick={() => setModal('')}><div className="modal" onClick={e => e.stopPropagation()}><div className="modal-header"><div><span className="eyebrow">FIN GUARD OPERATIONS</span><h2>{({account:'Create account',deposit:'Deposit funds',withdraw:'Withdraw funds',transfer:'Transfer funds'})[modal]}</h2></div><button className="close-button" onClick={() => setModal('')}>×</button></div>
      <form onSubmit={submit} className="form">
        {modal === 'account' ? <><label>Customer name<input required maxLength="120" value={form.customerName} onChange={e => update('customerName', e.target.value)} placeholder="e.g. Aarav Sharma"/></label><label>Email address<input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="aarav@example.com"/></label></> :
        modal === 'transfer' ? <><label>From account<select required value={form.fromAccountId} onChange={e => update('fromAccountId', e.target.value)}>{accounts.map(a => <option key={a.id} value={a.id}>{a.customerName} · {a.accountNumber}</option>)}</select></label><label>To account<select required value={form.toAccountId} onChange={e => update('toAccountId', e.target.value)}>{accounts.map(a => <option key={a.id} value={a.id}>{a.customerName} · {a.accountNumber}</option>)}</select></label></> :
        <label>Account<select required value={form.accountId} onChange={e => update('accountId', e.target.value)}>{accounts.map(a => <option key={a.id} value={a.id}>{a.customerName} · {a.accountNumber}</option>)}</select></label>}
        {modal !== 'account' && <><label>Amount (INR)<input required type="number" min="0.01" step="0.01" value={form.amount} onChange={e => update('amount', e.target.value)} placeholder="1000.00"/></label><label>Description <span className="optional">(optional)</span><input maxLength="250" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Purpose of transaction"/></label></>}
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setModal('')}>Cancel</button><button type="submit" className="primary-button" disabled={modal !== 'account' && accounts.length === 0}>Confirm operation</button></div>
      </form>
    </div></div>}
  </div>
}

function Stat({ title, value, detail, icon: Icon, highlight }) {
  return <div className={`stat-card ${highlight ? 'stat-alert' : ''}`}><div className="stat-top"><span>{title}</span><span className="stat-icon"><Icon size={18}/></span></div><strong>{value}</strong><small>{detail}</small></div>
}
function Empty({ title, text }) { return <div className="empty"><div className="empty-icon"><Activity size={22}/></div><strong>{title}</strong><p>{text}</p></div> }
function AccountTable({ accounts }) {
  if (!accounts.length) return <Empty title="No accounts created" text="Create your first demo customer account to get started."/>
  return <div className="table-wrap"><table><thead><tr><th>ACCOUNT HOLDER</th><th>ACCOUNT NUMBER</th><th>EMAIL</th><th>BALANCE</th><th>CREATED</th></tr></thead><tbody>{accounts.map(a => <tr key={a.id}><td><div className="person-cell"><span className="person-avatar">{a.customerName.split(' ').map(n=>n[0]).slice(0,2).join('').toUpperCase()}</span><strong>{a.customerName}</strong></div></td><td className="mono">{a.accountNumber}</td><td>{a.email}</td><td className="amount">{money(a.balance)}</td><td>{dateTime(a.createdAt)}</td></tr>)}</tbody></table></div>
}
function TransactionTable({ transactions }) {
  if (!transactions.length) return <Empty title="No transactions yet" text="Deposit funds or make a transfer to see transaction activity."/>
  const iconFor = (t) => t.type === 'DEPOSIT' ? ArrowDownLeft : t.type === 'WITHDRAWAL' ? ArrowUpRight : ArrowLeftRight
  return <div className="table-wrap"><table><thead><tr><th>TRANSACTION</th><th>FROM</th><th>TO</th><th>AMOUNT</th><th>STATUS</th><th>DATE</th></tr></thead><tbody>{transactions.map(t => { const Icon = iconFor(t); return <tr key={t.id}><td><div className="tx-cell"><span className={`tx-icon ${t.type.toLowerCase()}`}><Icon size={15}/></span><span><strong>{t.type}</strong><small>#{t.id} · {t.description || '—'}</small></span></div></td><td>{t.fromCustomer || 'External'}</td><td>{t.toCustomer || 'External'}</td><td className="amount">{money(t.amount)}</td><td><span className={`badge ${t.status.toLowerCase()}`}>{t.status}</span></td><td>{dateTime(t.createdAt)}</td></tr>})}</tbody></table></div>
}
function AlertTable({ alerts, onReview }) {
  if (!alerts.length) return <Empty title="No monitoring alerts" text="Large or repeated transfers will be listed here when the configured rules match."/>
  return <div className="alert-list">{alerts.map(a => <div className={`alert-item ${a.reviewed ? 'reviewed' : ''}`} key={a.id}><div className="alert-symbol"><BellRing size={18}/></div><div className="alert-main"><div className="alert-title"><strong>{a.ruleCode.replaceAll('_',' ')}</strong><span className={`badge ${a.reviewed ? 'success' : 'warning'}`}>{a.reviewed ? 'REVIEWED' : 'OPEN'}</span></div><p>{a.message}</p><div className="alert-meta">Transaction #{a.transactionId} · {money(a.amount)} · {dateTime(a.createdAt)}</div>{a.reviewNote && <div className="review-note">Review note: {a.reviewNote}</div>}</div>{!a.reviewed && <button className="secondary-button review-button" onClick={() => onReview(a.id)}>Mark reviewed</button>}</div>)}</div>
}
