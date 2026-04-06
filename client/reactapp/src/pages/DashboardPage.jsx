import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Pencil, MessageSquare } from 'lucide-react'
import DashboardShell from '@/components/DashboardShell.jsx'
import { HoldingsCompositionCard } from '@/components/HoldingsCompositionCard.jsx'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { API_BASE } from '@/lib/api.js'
import { hasSession, isAdminSession } from '@/lib/session.js'
import { cn } from '@/lib/utils'

/** Normalize Mongo-style _id from JSON (string or { $oid }) for URLs and comparisons. */
function mongoIdString(value) {
  if (value == null || value === '') return ''
  if (typeof value === 'object' && value !== null && '$oid' in value) {
    return String(value.$oid)
  }
  return String(value)
}

function SortHead({ children, className, accent }) {
  return (
    <TableHead
      className={cn(
        'text-xs font-semibold uppercase tracking-wide text-muted-foreground',
        className,
        accent && 'shadow-[inset_0_-2px_0_0_oklch(0.65_0.18_145)]',
      )}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        <span className="inline-flex flex-col leading-none text-muted-foreground/80" aria-hidden="true">
          <ChevronUp className="size-3" />
          <ChevronDown className="size-3 -mt-0.5" />
        </span>
      </span>
    </TableHead>
  )
}

function GainLoss({ value }) {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return <span className="text-muted-foreground">—</span>
  }
  const isPositive = n >= 0
  return (
    <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
      {isPositive ? '+' : ''}${n.toFixed(2)}
    </span>
  )
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const [gate, setGate] = useState('pending')
  const [activeTab, setActiveTab] = useState('holdings')
  const PORTFOLIO_ID = localStorage.getItem('portfolioId')
  const [holdings, setHoldings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    ticker: '', name: '', assetClass: 'stock', sector: '', quantity: '', purchasePrice: '', currentPrice: '', notes: ''
  })

  const [portfolios, setPortfolios] = useState([])
  const [portfoliosLoading, setPortfoliosLoading] = useState(true)
  const [showPortfolioForm, setShowPortfolioForm] = useState(false)
  const [portfolioForm, setPortfolioForm] = useState({ portfolioName: '', portfolioType: 'investment' })
  const [savingPortfolio, setSavingPortfolio] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState(null)
  const [editForm, setEditForm] = useState({ portfolioName: '', portfolioType: 'investment' })
  const [selectedPortfolioId, setSelectedPortfolioId] = useState(null)
  const [holdingsError, setHoldingsError] = useState('')
  const [portfolioError, setPortfolioError] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')

  const USER_ID = localStorage.getItem('userId')

  useEffect(() => {
    if (!hasSession()) {
      navigate('/', { replace: true })
      return
    }
    if (isAdminSession()) {
      navigate('/admin', { replace: true })
      return
    }
    setGate('ok')
  }, [navigate])

  useEffect(() => {
    if (gate !== 'ok') return
    document.title = 'BloomBoard'
    fetchHoldings()
    fetchPortfolios()
  }, [gate])

  async function fetchHoldings() {
    if (!USER_ID) {
      setHoldings([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/holdings/user/${USER_ID}`)
      const data = await res.json()
      setHoldings(data)
    } catch (err) {
      console.error('Failed to fetch holdings', err)
    } finally {
      setLoading(false)
    }
  }

  async function refreshPrices() {
    if (!USER_ID) return
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/holdings/user/${USER_ID}/refresh`, { method: 'POST' })
      const data = await res.json()
      if (res.ok) setHoldings(data)
    } catch (err) {
      console.error('Failed to refresh prices', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!form.ticker || !form.name || !form.quantity || !form.purchasePrice) return
    const portfolioId =
      selectedPortfolioId ||
      PORTFOLIO_ID ||
      (portfolios.length === 1 ? mongoIdString(portfolios[0]._id) : null)
    if (!portfolioId) {
      setHoldingsError(
        'No portfolio to save into. Create one under Portfolios first. If you have more than one, use “Show holdings for” to pick which portfolio to add to.',
      )
      return
    }
    setHoldingsError('')
    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}/api/holdings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: form.ticker.trim(),
          name: form.name.trim(),
          assetClass: form.assetClass,
          sector: form.sector?.trim() ?? '',
          notes: form.notes?.trim() ?? '',
          portfolioId,
          quantity: parseFloat(form.quantity),
          purchasePrice: parseFloat(form.purchasePrice),
          ...(form.currentPrice !== '' && { currentPrice: parseFloat(form.currentPrice), priceLastUpdated: new Date() }),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setHoldingsError(typeof data.error === 'string' ? data.error : `Could not save holding (${res.status})`)
        return
      }
      if (!data._id || data.error) {
        setHoldingsError('Unexpected response from server.')
        return
      }
      setHoldings((prev) => [...prev, data])
      setForm({ ticker: '', name: '', assetClass: 'stock', sector: '', quantity: '', purchasePrice: '', currentPrice: '', notes: '' })
      setShowForm(false)
    } catch (err) {
      console.error('Failed to add holding', err)
      setHoldingsError('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id) {
    try {
      await fetch(`${API_BASE}/api/holdings/${id}`, { method: 'DELETE' })
      setHoldings(holdings.filter(h => h._id !== id))
    } catch (err) {
      console.error('Failed to delete holding', err)
    }
  }

  const filteredHoldings = selectedPortfolioId
    ? holdings.filter(
        (h) => mongoIdString(h.portfolioId) === mongoIdString(selectedPortfolioId),
      )
    : holdings

  const totalValue = filteredHoldings.reduce((sum, h) => {
    const p = Number(h.currentPrice ?? h.purchasePrice)
    const q = Number(h.quantity)
    if (!Number.isFinite(p) || !Number.isFinite(q)) return sum
    return sum + p * q
  }, 0)

  async function fetchPortfolios() {
    if (!USER_ID) {
      setPortfolios([])
      setPortfoliosLoading(false)
      return
    }
    setPortfoliosLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${USER_ID}`)
      const data = await res.json()
      setPortfolios(data)
    } catch (err) {
      console.error('Failed to fetch portfolios', err)
    } finally {
      setPortfoliosLoading(false)
    }
  }

  async function handleLookup() {
    if (!form.ticker.trim()) return
    setLookupLoading(true)
    setLookupError('')
    try {
      const res = await fetch(`${API_BASE}/api/holdings/lookup/${encodeURIComponent(form.ticker.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setLookupError(data.error ?? 'Ticker not found.')
        return
      }
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        sector: data.sector || prev.sector,
        currentPrice: data.currentPrice ?? prev.currentPrice,
      }))
    } catch (err) {
      setLookupError('Could not reach the server.')
    } finally {
      setLookupLoading(false)
    }
  }

  async function handleAddPortfolio() {
    if (!portfolioForm.portfolioName?.trim()) return
    setPortfolioError('')
    setSavingPortfolio(true)
    try {
      const res = await fetch(`${API_BASE}/api/portfolios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...portfolioForm, portfolioName: portfolioForm.portfolioName.trim(), userId: USER_ID })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPortfolioError(typeof data.error === 'string' ? data.error : `Could not create portfolio (${res.status})`)
        return
      }
      if (!data._id) {
        setPortfolioError('Unexpected response from server.')
        return
      }
      setPortfolios((prev) => [...prev, data])
      setPortfolioForm({ portfolioName: '', portfolioType: 'investment' })
      setShowPortfolioForm(false)
    } catch (err) {
      console.error('Failed to add portfolio', err)
      setPortfolioError('Could not reach the server.')
    } finally {
      setSavingPortfolio(false)
    }
  }

  async function handleDeletePortfolio(id) {
    const idStr = mongoIdString(id)
    if (!idStr) return
    setPortfolioError('')
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${encodeURIComponent(idStr)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPortfolioError(typeof data.error === 'string' ? data.error : `Could not delete (${res.status})`)
        return
      }
      setPortfolios((prev) => prev.filter((p) => mongoIdString(p._id) !== idStr))
      if (mongoIdString(selectedPortfolioId) === idStr) {
        setSelectedPortfolioId(null)
      }
      if (mongoIdString(editingPortfolio) === idStr) {
        setEditingPortfolio(null)
      }
      const storedPid = localStorage.getItem('portfolioId')
      if (storedPid && mongoIdString(storedPid) === idStr) {
        localStorage.removeItem('portfolioId')
      }
    } catch (err) {
      console.error('Failed to delete portfolio', err)
      setPortfolioError('Could not reach the server.')
    }
  }

  async function handleEditPortfolio(id) {
    const idStr = mongoIdString(id)
    if (!idStr || !editForm.portfolioName?.trim()) {
      setPortfolioError('Portfolio name is required.')
      return
    }
    setPortfolioError('')
    try {
      const res = await fetch(`${API_BASE}/api/portfolios/${encodeURIComponent(idStr)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioName: editForm.portfolioName.trim(),
          portfolioType: editForm.portfolioType,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setPortfolioError(typeof data.error === 'string' ? data.error : `Could not save (${res.status})`)
        return
      }
      if (!data._id) {
        setPortfolioError('Unexpected response from server.')
        return
      }
      setPortfolios((prev) =>
        prev.map((p) => (mongoIdString(p._id) === idStr ? data : p)),
      )
      setEditingPortfolio(null)
    } catch (err) {
      console.error('Failed to update portfolio', err)
      setPortfolioError('Could not reach the server.')
    }
  }

  if (gate !== 'ok') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  return (
    <DashboardShell>
      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5 p-4 md:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full gap-0">
              <TabsList variant="line" className="h-auto w-full min-w-0 justify-start gap-6 border-b border-border bg-transparent p-0">
                <TabsTrigger value="holdings" className="rounded-none pb-3">Positions</TabsTrigger>
                <TabsTrigger value="portfolios" className="rounded-none pb-3">Portfolios</TabsTrigger>
                <TabsTrigger value="watchlist" className="rounded-none pb-3">Watchlist</TabsTrigger>
                <TabsTrigger value="simulations" className="rounded-none pb-3">Simulations</TabsTrigger>
              </TabsList>

              <TabsContent value="holdings" className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    Total Value: <span className="font-semibold text-foreground">${totalValue.toFixed(2)}</span>
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={refreshPrices} disabled={loading}>
                      <RefreshCw className={cn("size-4 mr-1", loading && "animate-spin")} /> Refresh Prices
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setHoldingsError('')
                        setShowForm(!showForm)
                      }}
                    >
                      <Plus className="size-4 mr-1" /> Add Holding
                    </Button>
                  </div>
                </div>
                {selectedPortfolioId && (
                  <p className="text-xs text-muted-foreground">
                    Showing holdings for: <span className="font-semibold text-foreground">
                      {portfolios.find((p) => mongoIdString(p._id) === mongoIdString(selectedPortfolioId))
                        ?.portfolioName}
                    </span>
                    <button className="ml-2 underline" onClick={() => setSelectedPortfolioId(null)}>
                      Show all
                    </button>
                  </p>
                )}

                {holdingsError ? (
                  <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {holdingsError}
                  </p>
                ) : null}

                {showForm && (
                  <Card className="p-4 mb-4">
                    {/* Row 1: Ticker lookup */}
                    <div className="flex flex-wrap gap-3 items-end mb-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Ticker</label>
                        <input
                          className="border rounded px-2 py-1 text-sm w-24 uppercase"
                          placeholder="AAPL"
                          value={form.ticker}
                          onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })}
                          onKeyDown={e => e.key === 'Enter' && handleLookup()}
                        />
                      </div>
                      <Button size="sm" variant="outline" onClick={handleLookup} disabled={lookupLoading || !form.ticker.trim()}>
                        {lookupLoading ? 'Looking up...' : 'Look Up'}
                      </Button>
                      {lookupError && (
                        <p className="text-xs text-destructive self-end">{lookupError}</p>
                      )}
                      {form.currentPrice !== '' && (
                        <p className="text-xs text-muted-foreground self-end">
                          Current price: <span className="font-medium text-foreground">${Number(form.currentPrice).toFixed(2)}</span>
                        </p>
                      )}
                    </div>

                    {/* Row 2: Auto-filled + manual fields */}
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Name</label>
                        <input className="border rounded px-2 py-1 text-sm w-40" placeholder="Apple Inc." value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Asset Class</label>
                        <select
                          className="border rounded px-2 py-1 text-sm w-28 bg-background text-foreground"
                          value={form.assetClass}
                          onChange={e => setForm({ ...form, assetClass: e.target.value })}
                        >
                          <option value="stock">Stock</option>
                          <option value="ETF">ETF</option>
                          <option value="crypto">Crypto</option>
                          <option value="bond">Bond</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Sector</label>
                        <input className="border rounded px-2 py-1 text-sm w-32" placeholder="Technology" value={form.sector} onChange={e => setForm({ ...form, sector: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Quantity</label>
                        <input className="border rounded px-2 py-1 text-sm w-20" placeholder="10" type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Purchase Price ($)</label>
                        <input className="border rounded px-2 py-1 text-sm w-24" placeholder="150.00" type="number" value={form.purchasePrice} onChange={e => setForm({ ...form, purchasePrice: e.target.value })} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Notes</label>
                        <input className="border rounded px-2 py-1 text-sm w-36" placeholder="Optional" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                      </div>
                      <Button size="sm" onClick={handleAdd} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setLookupError('') }}>Cancel</Button>
                    </div>
                  </Card>
                )}

                <HoldingsCompositionCard
                  holdings={filteredHoldings}
                  totalValue={totalValue}
                  loading={loading}
                  subtitle={
                    selectedPortfolioId
                      ? portfolios.find(
                          (p) => mongoIdString(p._id) === mongoIdString(selectedPortfolioId),
                        )?.portfolioName ?? 'Selected portfolio'
                      : 'All portfolios'
                  }
                />

                <Card className="gap-0 overflow-hidden py-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <SortHead>Symbol</SortHead>
                        <SortHead>Name</SortHead>
                        <SortHead>Asset Class</SortHead>
                        <SortHead>Sector</SortHead>
                        <SortHead className="text-right">Last Price</SortHead>
                        <SortHead className="text-right">Total Gain/Loss</SortHead>
                        <SortHead className="text-right">Current Value</SortHead>
                        <SortHead className="text-right">Purchase Price</SortHead>
                        <SortHead className="text-right">Quantity</SortHead>
                        <SortHead className="text-right" accent>% of Account</SortHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={11} className="py-10 text-center text-sm text-muted-foreground">
                            Loading holdings...
                          </TableCell>
                        </TableRow>
                      ) : holdings.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={11} className="py-10 text-center text-sm italic text-muted-foreground">
                            No holdings yet — click Add Holding to get started.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredHoldings.map((h) => {
                          const qty = Number(h.quantity)
                          const purchase = Number(h.purchasePrice)
                          const last = Number(h.currentPrice ?? h.purchasePrice)
                          const price = Number.isFinite(last) ? last : purchase
                          const currentValue =
                            Number.isFinite(price) && Number.isFinite(qty) ? price * qty : NaN
                          const totalGainLoss =
                            Number.isFinite(price) && Number.isFinite(purchase) && Number.isFinite(qty)
                              ? (price - purchase) * qty
                              : NaN
                          const percentOfAccount = totalValue > 0 && Number.isFinite(currentValue)
                            ? (currentValue / totalValue) * 100
                            : 0
                          return (
                            <TableRow key={h._id ?? h.ticker}>
                              <TableCell className="font-semibold">{h.ticker}</TableCell>
                              <TableCell className="text-muted-foreground">{h.name}</TableCell>
                              <TableCell className="capitalize text-muted-foreground">{h.assetClass ?? '—'}</TableCell>
                              <TableCell className="text-muted-foreground">{h.sector || '—'}</TableCell>
                              <TableCell className="text-right">
                                <div>{Number.isFinite(price) ? `$${price.toFixed(2)}` : '—'}</div>
                                {h.priceLastUpdated && (
                                  <div className="text-[10px] text-muted-foreground/70">
                                    {new Date(h.priceLastUpdated).toLocaleString(undefined, {
                                      month: 'short', day: 'numeric',
                                      hour: 'numeric', minute: '2-digit',
                                    })}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <GainLoss value={totalGainLoss} />
                              </TableCell>
                              <TableCell className="text-right">
                                {Number.isFinite(currentValue) ? `$${currentValue.toFixed(2)}` : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number.isFinite(purchase) ? `$${purchase.toFixed(2)}` : '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                {Number.isFinite(qty) ? qty : '—'}
                              </TableCell>
                              <TableCell className="text-right">{percentOfAccount.toFixed(1)}%</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {h.notes && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="size-8 cursor-default">
                                            <MessageSquare className="size-4 text-muted-foreground" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-[220px] text-xs">
                                          {h.notes}
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => handleDelete(h._id)}
                                  >
                                    <Trash2 className="size-4 text-red-500" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </Card>
              </TabsContent>

              <TabsContent value="portfolios" className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setPortfolioError('')
                      setShowPortfolioForm(!showPortfolioForm)
                    }}
                  >
                    <Plus className="size-4 mr-1" /> New Portfolio
                  </Button>
                </div>

                {portfolioError ? (
                  <p className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {portfolioError}
                  </p>
                ) : null}

                {showPortfolioForm && (
                  <Card className="p-4 mb-4">
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Portfolio Name</label>
                        <input
                          className="border rounded px-2 py-1 text-sm w-40"
                          placeholder="My Portfolio"
                          value={portfolioForm.portfolioName}
                          onChange={e => setPortfolioForm({ ...portfolioForm, portfolioName: e.target.value })}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Type</label>
                        <select
                          className="border rounded px-2 py-1 text-sm w-32 bg-background text-foreground"
                          value={portfolioForm.portfolioType}
                          onChange={e => setPortfolioForm({ ...portfolioForm, portfolioType: e.target.value })}
                        >
                          <option value="investment">Investment</option>
                          <option value="theoretical">Theoretical</option>
                          <option value="crypto">Crypto</option>
                          <option value="retirement">Retirement</option>
                        </select>
                      </div>
                      <Button type="button" size="sm" onClick={handleAddPortfolio} disabled={savingPortfolio}>
                        {savingPortfolio ? 'Saving...' : 'Save'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPortfolioError('')
                          setShowPortfolioForm(false)
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card>
                )}

                {portfoliosLoading ? (
                  <p className="text-sm text-muted-foreground">Loading portfolios...</p>
                ) : portfolios.length === 0 ? (
                  <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                    No portfolios yet — click New Portfolio to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {portfolios.map((p) => {
                      const pId = mongoIdString(p._id)
                      return (
                      <Card
                        key={pId || p.portfolioName}
                        className="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:border-primary"
                        onClick={() => {
                          if (mongoIdString(editingPortfolio) === pId) return
                          setSelectedPortfolioId(pId)
                          setActiveTab('holdings')
                        }}
                      >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {mongoIdString(editingPortfolio) === pId ? (
                            <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                              <input
                                className="w-full rounded border bg-background px-2 py-1 text-sm"
                                value={editForm.portfolioName}
                                onChange={(e) => setEditForm({ ...editForm, portfolioName: e.target.value })}
                              />
                              <select
                                className="w-full rounded border bg-background px-2 py-1 text-sm text-foreground"
                                value={editForm.portfolioType}
                                onChange={(e) => setEditForm({ ...editForm, portfolioType: e.target.value })}
                              >
                                <option value="investment">Investment</option>
                                <option value="theoretical">Theoretical</option>
                                <option value="crypto">Crypto</option>
                                <option value="retirement">Retirement</option>
                              </select>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditPortfolio(pId)
                                  }}
                                >
                                  Save
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setPortfolioError('')
                                    setEditingPortfolio(null)
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <h3 className="font-semibold text-foreground">{p.portfolioName}</h3>
                              <span className="text-xs capitalize text-muted-foreground">{p.portfolioType}</span>
                            </>
                          )}
                        </div>
                        <div className="flex shrink-0">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPortfolioError('')
                              setEditingPortfolio(pId)
                              setEditForm({ portfolioName: p.portfolioName, portfolioType: p.portfolioType })
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeletePortfolio(pId)
                            }}
                          >
                            <Trash2 className="size-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                        <div className="text-xs text-muted-foreground">
                          Created {new Date(p.createdAt).toLocaleDateString()}
                        </div>
                      </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="watchlist" className="mt-6">
                <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                  Watchlist — add content here later.
                </div>
              </TabsContent>

              <TabsContent value="simulations" className="mt-6">
                <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                  Simulations — add content here later.
                </div>
              </TabsContent>
            </Tabs>
      </div>
    </DashboardShell>
  )
}