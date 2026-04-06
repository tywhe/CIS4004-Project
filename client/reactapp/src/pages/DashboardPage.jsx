import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, Plus, Trash2, RefreshCw, Pencil, MessageSquare, Check, X, Layers } from 'lucide-react'
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
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

/** Groups an array of holdings by ticker+portfolioId, computing avg cost basis and totals. */
function groupHoldings(holdings) {
  const map = new Map()
  for (const h of holdings) {
    const key = `${h.ticker}__${mongoIdString(h.portfolioId)}`
    if (!map.has(key)) {
      map.set(key, { ticker: h.ticker, portfolioId: h.portfolioId, lots: [] })
    }
    map.get(key).lots.push(h)
  }
  return Array.from(map.values()).map(({ ticker, portfolioId, lots }) => {
    const totalQty = lots.reduce((s, l) => s + Number(l.quantity), 0)
    const avgCost = lots.reduce((s, l) => s + Number(l.purchasePrice) * Number(l.quantity), 0) / totalQty
    // Use the most recently updated currentPrice across lots, fallback to avgCost
    const latestLot = lots.reduce((a, b) => {
      const aDate = a.priceLastUpdated ? new Date(a.priceLastUpdated) : 0
      const bDate = b.priceLastUpdated ? new Date(b.priceLastUpdated) : 0
      return bDate > aDate ? b : a
    })
    const currentPrice = latestLot.currentPrice ?? avgCost
    const priceLastUpdated = latestLot.priceLastUpdated
    // Use shared metadata from the first lot
    const first = lots[0]
    return {
      _groupId: `${ticker}__${mongoIdString(portfolioId)}`,
      ticker,
      portfolioId,
      name: first.name,
      assetClass: first.assetClass,
      sector: first.sector,
      notes: first.notes,
      totalQty,
      avgCost,
      currentPrice,
      priceLastUpdated,
      lots,
    }
  })
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
    ticker: '', name: '', assetClass: 'stock', sector: '', quantity: '', purchasePrice: '', currentPrice: '', purchaseDate: new Date().toISOString().slice(0, 10), notes: ''
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
  const [editingHolding, setEditingHolding] = useState(null) // _id of row being edited
  const [editHoldingForm, setEditHoldingForm] = useState({})
  const [savingHolding, setSavingHolding] = useState(false)
  const [simulations, setSimulations] = useState([])
  const [simulationsLoading, setSimulationsLoading] = useState(true)
  const [showSimulationForm, setShowSimulationForm] = useState(false)
  const [savingSimulation, setSavingSimulation] = useState(false)
  const [simulationForm, setSimulationForm] = useState({
    simulationName: '', portfolioId: '', growthRate: '', timeHorizon: ''
  })

  const [watchlist, setWatchlist] = useState([])
  const [watchlistLoading, setWatchlistLoading] = useState(false)
  const [watchlistForm, setWatchlistForm] = useState({
    ticker: '',
    name: '',
    assestClass: '',
    currentPrice: '',
    notes: '',
  })
      

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
    fetchSimulations()
    fetchWatchlist()
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
          purchaseDate: form.purchaseDate || new Date().toISOString().slice(0, 10),
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
      setForm({ ticker: '', name: '', assetClass: 'stock', sector: '', quantity: '', purchasePrice: '', currentPrice: '', purchaseDate: new Date().toISOString().slice(0, 10), notes: '' })
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

  function startEditHolding(h) {
    setEditingHolding(h._id)
    setEditHoldingForm({
      ticker: h.ticker ?? '',
      name: h.name ?? '',
      assetClass: h.assetClass ?? 'stock',
      sector: h.sector ?? '',
      quantity: h.quantity ?? '',
      purchasePrice: h.purchasePrice ?? '',
      purchaseDate: h.purchaseDate ? new Date(h.purchaseDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      notes: h.notes ?? '',
    })
  }

  async function handleSaveHolding(id) {
    setSavingHolding(true)
    try {
      const res = await fetch(`${API_BASE}/api/holdings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: editHoldingForm.ticker.trim().toUpperCase(),
          name: editHoldingForm.name.trim(),
          assetClass: editHoldingForm.assetClass,
          sector: editHoldingForm.sector.trim(),
          quantity: parseFloat(editHoldingForm.quantity),
          purchasePrice: parseFloat(editHoldingForm.purchasePrice),
          purchaseDate: editHoldingForm.purchaseDate || null,
          notes: editHoldingForm.notes.trim(),
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setHoldings((prev) => prev.map((h) => (h._id === id ? data : h)))
        setEditingHolding(null)
      }
    } catch (err) {
      console.error('Failed to save holding', err)
    } finally {
      setSavingHolding(false)
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

  async function fetchSimulations() {
    setSimulationsLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/simulations/${USER_ID}`)
      const data = await res.json()
      setSimulations(data)
    } catch (err) {
      console.error('Failed to fetch simulations', err)
    } finally {
      setSimulationsLoading(false)
    }
  }

  async function fetchWatchlist() {
    if (!USER_ID) {
      setWatchlist([])
      setWatchlistLoading(false)
      return
    }
    setWatchlistLoading(true)
    try {
      const res = await fetch(`/api/watchlist/${USER_ID}`)
      const data = await res.json()
      setWatchlist(data)
    } catch (err) {
      console.error('Failed to fetch watchlist', err)
    } finally {
      setWatchlistLoading(false)
    }
  }

  async function handleAddWatchlistItem() {
  if (!watchlistForm.ticker || !watchlistForm.name) return

  try {
    const res = await fetch('/api/watchlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        ticker: watchlistForm.ticker.trim().toUpperCase(),
        name: watchlistForm.name.trim(),
        assetClass: watchlistForm.assetClass.trim(),
        currentPrice:
          watchlistForm.currentPrice === ''
            ? null
            : parseFloat(watchlistForm.currentPrice),
        notes: watchlistForm.notes.trim(),
      }),
    })

    const data = await res.json()
    console.log('watchlist add status:', res.status)
    console.log('watchlist add response:', data)

    if (res.ok) {
      setWatchlist((prev) => [data, ...prev])
      setWatchlistForm({
        ticker: '',
        name: '',
        assetClass: '',
        currentPrice: '',
        notes: '',
      })
    } else {
      alert(data.message || data.error || 'Failed to add watchlist item')
    }
  } catch (err) {
    console.error('Failed to add watchlist item', err)
  }
}

  async function handleDeleteWatchlistItem(id) {
    try {
      await fetch(`/api/watchlist/${id}`, { method: 'DELETE' })
      setWatchlist((prev) => prev.filter((item) => item._id !== id))
    } catch (err) {
      console.error('Failed to delete watchlist item', err)
    }
  }

  async function handleAddSimulation() {
    if (!simulationForm.simulationName || !simulationForm.portfolioId || !simulationForm.growthRate || !simulationForm.timeHorizon) return
    setSavingSimulation(true)
    try {
      // Get current portfolio value
      const holdingsRes = await fetch(`${API_BASE}/api/holdings/${simulationForm.portfolioId}`)
      const holdingsData = await holdingsRes.json()
      const currentValue = holdingsData.reduce((sum, h) => sum + (h.currentPrice || h.purchasePrice) * h.quantity, 0)

      // Calculate projected value: FV = PV * (1 + r)^t
      const growthRate = parseFloat(simulationForm.growthRate) / 100
      const timeHorizon = parseFloat(simulationForm.timeHorizon)
      const projectedValue = currentValue * Math.pow(1 + growthRate, timeHorizon)

      const res = await fetch(`${API_BASE}/api/simulations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...simulationForm,
          userId: USER_ID,
          growthRate: parseFloat(simulationForm.growthRate),
          timeHorizon,
          projectedValue
        })
      })
      const newSimulation = await res.json()
      setSimulations([newSimulation, ...simulations])
      setSimulationForm({ simulationName: '', portfolioId: '', growthRate: '', timeHorizon: '' })
      setShowSimulationForm(false)
    } catch (err) {
      console.error('Failed to add simulation', err)
    } finally {
      setSavingSimulation(false)
    }
  }

  async function handleDeleteSimulation(id) {
    try {
      await fetch(`${API_BASE}/api/simulations/${id}`, { method: 'DELETE' })
      setSimulations(simulations.filter(s => s._id !== id))
    } catch (err) {
      console.error('Failed to delete simulation', err)
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
                        <label className="text-xs text-muted-foreground">Acquired</label>
                        <input className="border rounded px-2 py-1 text-sm w-36" type="date" value={form.purchaseDate} onChange={e => setForm({ ...form, purchaseDate: e.target.value })} />
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
                        <SortHead className="w-16">Type</SortHead>
                        <SortHead>Sector</SortHead>
                        <SortHead className="text-right">Last Price</SortHead>
                        <SortHead className="text-right">Gain / Loss</SortHead>
                        <SortHead className="text-right">Current Value</SortHead>
                        <SortHead className="text-right">Avg Cost</SortHead>
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
                        groupHoldings(filteredHoldings).map((g) => {
                          const price = Number(g.currentPrice)
                          const currentValue = price * g.totalQty
                          const totalGainLoss = (price - g.avgCost) * g.totalQty
                          const percentOfAccount = totalValue > 0 ? (currentValue / totalValue) * 100 : 0
                          const multiLot = g.lots.length > 1

                          return (
                            <TableRow key={g._groupId}>
                              <TableCell className="font-semibold">{g.ticker}</TableCell>

                              {/* Name */}
                              <TableCell className="max-w-[130px] text-muted-foreground">
                                {g.name && g.name.length > 18 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="block max-w-full truncate text-left">{g.name}</TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">{g.name}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (g.name || '—')}
                              </TableCell>

                              {/* Type */}
                              <TableCell className="w-16 capitalize text-muted-foreground text-xs">{g.assetClass ?? '—'}</TableCell>

                              {/* Sector */}
                              <TableCell className="max-w-[120px] text-muted-foreground">
                                {g.sector && g.sector.length > 16 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger className="block max-w-full truncate text-left">{g.sector}</TooltipTrigger>
                                      <TooltipContent side="top" className="text-xs">{g.sector}</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : (g.sector || '—')}
                              </TableCell>

                              {/* Last Price */}
                              <TableCell className="text-right">
                                <div>{Number.isFinite(price) ? `$${price.toFixed(2)}` : '—'}</div>
                                {g.priceLastUpdated && (
                                  <div className="text-[10px] text-muted-foreground/70">
                                    {new Date(g.priceLastUpdated).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                  </div>
                                )}
                              </TableCell>

                              {/* Gain / Loss */}
                              <TableCell className="text-right">
                                <GainLoss value={totalGainLoss} />
                                {Number.isFinite(totalGainLoss) && g.avgCost > 0 && (
                                  <div className={`text-[11px] ${totalGainLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                    {totalGainLoss >= 0 ? '+' : ''}{((totalGainLoss / (g.avgCost * g.totalQty)) * 100).toFixed(2)}%
                                  </div>
                                )}
                              </TableCell>

                              {/* Current Value */}
                              <TableCell className="text-right">
                                {Number.isFinite(currentValue) ? `$${currentValue.toFixed(2)}` : '—'}
                              </TableCell>

                              {/* Avg Cost Basis — clickable if multi-lot */}
                              <TableCell className="text-right">
                                {multiLot ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <button className="inline-flex items-center gap-1 rounded px-1 hover:bg-muted transition-colors text-sm tabular-nums">
                                        ${g.avgCost.toFixed(2)}
                                        <Layers className="size-3 text-muted-foreground" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent side="left" className="w-72 p-3">
                                      <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">{g.ticker} · {g.lots.length} Lots</p>
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="text-muted-foreground">
                                            <th className="text-left pb-1">Acquired</th>
                                            <th className="text-right pb-1">Qty</th>
                                            <th className="text-right pb-1">Price</th>
                                            <th className="pb-1" />
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {g.lots.map((lot) => (
                                            editingHolding === lot._id ? (
                                              <tr key={lot._id} className="border-t border-border">
                                                <td className="py-1"><input className="border rounded px-1 py-0.5 text-xs w-24" type="date" value={editHoldingForm.purchaseDate} onChange={e => setEditHoldingForm({ ...editHoldingForm, purchaseDate: e.target.value })} /></td>
                                                <td className="py-1"><input className="border rounded px-1 py-0.5 text-xs w-14 text-right" type="number" value={editHoldingForm.quantity} onChange={e => setEditHoldingForm({ ...editHoldingForm, quantity: e.target.value })} /></td>
                                                <td className="py-1"><input className="border rounded px-1 py-0.5 text-xs w-16 text-right" type="number" value={editHoldingForm.purchasePrice} onChange={e => setEditHoldingForm({ ...editHoldingForm, purchasePrice: e.target.value })} /></td>
                                                <td className="py-1">
                                                  <div className="flex gap-1 justify-end">
                                                    <button onClick={() => handleSaveHolding(lot._id)} disabled={savingHolding}><Check className="size-3 text-green-500" /></button>
                                                    <button onClick={() => setEditingHolding(null)}><X className="size-3 text-muted-foreground" /></button>
                                                  </div>
                                                </td>
                                              </tr>
                                            ) : (
                                              <tr key={lot._id} className="border-t border-border">
                                                <td className="py-1 text-muted-foreground">
                                                  {lot.purchaseDate ? new Date(lot.purchaseDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                                </td>
                                                <td className="py-1 text-right">{lot.quantity}</td>
                                                <td className="py-1 text-right">${Number(lot.purchasePrice).toFixed(2)}</td>
                                                <td className="py-1">
                                                  <div className="flex gap-1 justify-end">
                                                    <button onClick={() => startEditHolding(lot)}><Pencil className="size-3 text-muted-foreground hover:text-foreground" /></button>
                                                    <button onClick={() => handleDelete(lot._id)}><Trash2 className="size-3 text-red-500" /></button>
                                                  </div>
                                                </td>
                                              </tr>
                                            )
                                          ))}
                                        </tbody>
                                      </table>
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  `$${g.avgCost.toFixed(2)}`
                                )}
                              </TableCell>

                              {/* Quantity */}
                              <TableCell className="text-right">{g.totalQty}</TableCell>

                              {/* % of Account */}
                              <TableCell className="text-right">{percentOfAccount.toFixed(1)}%</TableCell>

                              {/* Actions — single lot only (multi-lot actions live in the popover) */}
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {g.notes && (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button size="icon" variant="ghost" className="size-8 cursor-default">
                                            <MessageSquare className="size-4 text-muted-foreground" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="max-w-[220px] text-xs">{g.notes}</TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )}
                                  {!multiLot && (
                                    <>
                                      <Button size="icon" variant="ghost" onClick={() => startEditHolding(g.lots[0])}>
                                        <Pencil className="size-4 text-muted-foreground" />
                                      </Button>
                                      <Button size="icon" variant="ghost" onClick={() => handleDelete(g.lots[0]._id)}>
                                        <Trash2 className="size-4 text-red-500" />
                                      </Button>
                                    </>
                                  )}
                                  {multiLot && (
                                    <Button size="icon" variant="ghost" onClick={() => {
                                      if (window.confirm(`Delete all ${g.lots.length} lots of ${g.ticker}?`)) {
                                        g.lots.forEach(l => handleDelete(l._id))
                                      }
                                    }}>
                                      <Trash2 className="size-4 text-red-500" />
                                    </Button>
                                  )}
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
                <Card className="p-4">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">Watchlist</h2>
                    </div>

                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Ticker</label>
                        <input
                          type="text"
                          placeholder="AAPL"
                          value={watchlistForm.ticker}
                          onChange={(e) => setWatchlistForm({ ...watchlistForm, ticker: e.target.value.toUpperCase() })}
                          className="border rounded px-2 py-1 text-sm w-24 uppercase"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Name</label>
                        <input
                          className="border rounded px-2 py-1 text-sm w-40"
                          placeholder="Apple Inc."
                          value={watchlistForm.name}
                          onChange={(e) => setWatchlistForm({ ...watchlistForm, name: e.target.value })}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Asset Class</label>
                        <select
                          className="border rounded px-2 py-1 text-sm w-28 bg-background text-foreground"
                          value={watchlistForm.assetClass}
                          onChange={(e) => setWatchlistForm({ ...watchlistForm, assetClass: e.target.value })}
                        >
                          <option value="">Select</option>
                          <option value="stock">Stock</option>
                          <option value="ETF">ETF</option>
                          <option value="crypto">Crypto</option>
                          <option value="bond">Bond</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Current Price</label>
                        <input
                          className="border rounded px-2 py-1 text-sm w-28"
                          type="number"
                          step="0.01"
                          placeholder="150.00"
                          value={watchlistForm.currentPrice}
                          onChange={(e) => setWatchlistForm({ ...watchlistForm, currentPrice: e.target.value })}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-xs text-muted-foreground">Notes</label>
                        <input
                          className="border rounded px-2 py-1 text-sm w-40"
                          placeholder="Optional"
                          value={watchlistForm.notes}
                          onChange={(e) => setWatchlistForm({ ...watchlistForm, notes: e.target.value })}
                        />
                      </div>

                      <Button size="sm" onClick={handleAddWatchlistItem}>
                        <Plus className="size-4 mr-1" /> Add
                      </Button>
                    </div>

                    {watchlistLoading ? (
                      <p className="text-sm text-muted-foreground">Loading watchlist...</p>
                    ) : watchlist.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No watchlist items yet.</p>
                    ) : (
                        <div className="space-y-3">
                          {watchlist.map((item) => (
                            <Card key={item._id} className="p-3">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <p className="font-semibold">{item.ticker} - {item.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Type: {item.assetClass || 'N/A'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Current Price: {item.currentPrice ? `$${Number(item.currentPrice).toFixed(2)}` : 'N/A'}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Notes: {item.notes || 'None'}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteWatchlistItem(item._id)}
                                >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    </Card>
                  </TabsContent>

              <TabsContent value="simulations" className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-muted-foreground">
                    {simulations.length} simulation{simulations.length !== 1 ? 's' : ''}
                  </p>
                  <Button size="sm" onClick={() => setShowSimulationForm(!showSimulationForm)}>
                    <Plus className="size-4 mr-1" /> New Simulation
                  </Button>
                </div>

                {showSimulationForm && (
                  <Card className="p-4 mb-4 flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Simulation Name</label>
                      <input
                        className="border rounded px-2 py-1 text-sm w-40 bg-background"
                        placeholder="10 Year Growth"
                        value={simulationForm.simulationName}
                        onChange={e => setSimulationForm({ ...simulationForm, simulationName: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Portfolio</label>
                      <select
                        className="border rounded px-2 py-1 text-sm w-40 bg-background text-foreground"
                        value={simulationForm.portfolioId}
                        onChange={e => setSimulationForm({ ...simulationForm, portfolioId: e.target.value })}
                      >
                        <option value="">Select portfolio</option>
                        {portfolios.map(p => (
                          <option key={p._id} value={p._id}>{p.portfolioName}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Growth Rate (%)</label>
                      <input
                        className="border rounded px-2 py-1 text-sm w-24 bg-background"
                        placeholder="7"
                        type="number"
                        value={simulationForm.growthRate}
                        onChange={e => setSimulationForm({ ...simulationForm, growthRate: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-muted-foreground">Time Horizon (years)</label>
                      <input
                        className="border rounded px-2 py-1 text-sm w-24 bg-background"
                        placeholder="10"
                        type="number"
                        value={simulationForm.timeHorizon}
                        onChange={e => setSimulationForm({ ...simulationForm, timeHorizon: e.target.value })}
                      />
                    </div>
                    <Button size="sm" onClick={handleAddSimulation} disabled={savingSimulation}>
                      {savingSimulation ? 'Running...' : 'Run Simulation'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowSimulationForm(false)}>Cancel</Button>
                  </Card>
                )}

                {simulationsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading simulations...</p>
                ) : simulations.length === 0 ? (
                  <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center text-sm text-muted-foreground">
                    No simulations yet — click New Simulation to get started.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {simulations.map(s => {
                      const portfolio = portfolios.find(p => p._id === s.portfolioId)
                      return (
                        <Card key={s._id} className="p-4 flex flex-col gap-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-foreground">{s.simulationName}</h3>
                              <span className="text-xs text-muted-foreground">{portfolio?.portfolioName || 'Unknown portfolio'}</span>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => handleDeleteSimulation(s._id)}>
                              <Trash2 className="size-4 text-red-500" />
                            </Button>
                          </div>
                          <div className="flex flex-col gap-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Growth Rate</span>
                              <span className="font-medium">{s.growthRate}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Time Horizon</span>
                              <span className="font-medium">{s.timeHorizon} years</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Projected Value</span>
                              <span className="font-semibold text-green-500">${s.projectedValue.toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Run {new Date(s.createdAt).toLocaleDateString()}
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
      </div>
    </DashboardShell>
  )
}
