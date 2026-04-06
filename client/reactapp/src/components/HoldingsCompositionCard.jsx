import { useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatUsd(n) {
  if (!Number.isFinite(n)) return '—'
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatShortUsd(n) {
  if (!Number.isFinite(n)) return ''
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}k`
  return `$${n.toFixed(0)}`
}

function formatAxisDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })
}

function formatTooltipDate(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })
}

/**
 * Build a time-series from holdings' purchaseDates.
 *
 * Each event point = a purchase date where:
 *   cumulativeCost        = total money invested up to and including this date
 *   cumulativeMarketValue = current market value (at today's prices) of all
 *                           shares acquired up to and including this date
 *
 * This answers: "At each point I made a purchase,
 *   how much had I invested in total, and what is that worth today?"
 */
function buildInvestmentSeries(holdings) {
  // Filter to holdings with a valid purchaseDate
  const valid = holdings
    .map((h) => ({
      date:         new Date(h.purchaseDate ?? h.createdAt),
      cost:         Number(h.purchasePrice ?? 0) * Number(h.quantity ?? 0),
      marketValue:  Number(h.currentPrice  ?? h.purchasePrice ?? 0) * Number(h.quantity ?? 0),
    }))
    .filter((h) => !isNaN(h.date.getTime()) && h.cost > 0)
    .sort((a, b) => a.date - b.date)

  if (valid.length === 0) return []

  let cumulativeCost = 0
  let cumulativeMarketValue = 0

  // Group by date string so same-day purchases are merged
  const grouped = new Map()
  for (const row of valid) {
    const key = row.date.toISOString().slice(0, 10) // YYYY-MM-DD
    if (!grouped.has(key)) grouped.set(key, { cost: 0, marketValue: 0 })
    grouped.get(key).cost        += row.cost
    grouped.get(key).marketValue += row.marketValue
  }

  const series = []
  for (const [dateStr, { cost, marketValue }] of grouped.entries()) {
    cumulativeCost        += cost
    cumulativeMarketValue += marketValue
    series.push({
      date:           dateStr,
      invested:       parseFloat(cumulativeCost.toFixed(2)),
      marketValue:    parseFloat(cumulativeMarketValue.toFixed(2)),
      gain:           parseFloat((cumulativeMarketValue - cumulativeCost).toFixed(2)),
    })
  }

  // Always cap the series with a "today" point at current market value
  const todayStr = new Date().toISOString().slice(0, 10)
  if (series[series.length - 1].date !== todayStr) {
    const last = series[series.length - 1]
    series.push({
      date:        todayStr,
      invested:    last.invested,
      marketValue: last.marketValue,
      gain:        last.gain,
    })
  }

  return series
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload ?? {}
  const gain = d.gain ?? 0
  const isUp = gain >= 0
  return (
    <div className="rounded-lg border border-border bg-background/95 px-3 py-2.5 shadow-md text-xs backdrop-blur-sm">
      <p className="mb-1.5 font-medium text-foreground">{formatTooltipDate(label)}</p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center gap-2">
            <span className="size-2 rounded-full flex-shrink-0" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium tabular-nums text-foreground">{formatUsd(entry.value)}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 border-t border-border/60 pt-1 mt-1">
          <span className="size-2 rounded-full flex-shrink-0 bg-transparent" />
          <span className="text-muted-foreground">Unrealized P&amp;L:</span>
          <span className={cn('font-semibold tabular-nums', isUp ? 'text-green-500' : 'text-red-500')}>
            {isUp ? '+' : ''}{formatUsd(gain)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────
export function HoldingsCompositionCard({ holdings, totalValue, loading, subtitle }) {
  const series = useMemo(() => buildInvestmentSeries(holdings ?? []), [holdings])

  const totalInvested  = series.length > 0 ? series[series.length - 1].invested    : 0
  const totalMktValue  = series.length > 0 ? series[series.length - 1].marketValue : 0
  const totalGain      = totalMktValue - totalInvested
  const totalGainPct   = totalInvested > 0 ? (totalGain / totalInvested) * 100 : 0
  const isPositive     = totalGain >= 0

  const hasData = series.length > 1

  // Colour tokens — greens for market value, slate for invested
  const MV_COLOR   = 'oklch(0.55 0.15 152)'   // sage green
  const COST_COLOR = 'oklch(0.55 0.04 240)'    // slate blue-grey

  return (
    <Card className="mb-4 border-border/80 py-0">
      <CardHeader className="border-b border-border/60 pb-4 pt-5">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold tracking-tight">
            Invested capital over time
          </CardTitle>
          <CardDescription>
            Cumulative cost basis vs. current market value as positions were acquired
            {subtitle ? ` · ${subtitle}` : ''}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-5 pt-4">

        {/* Summary stats */}
        {!loading && hasData && (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Current value</p>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {formatUsd(totalMktValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total invested</p>
              <p className="text-lg font-medium tabular-nums text-muted-foreground">
                {formatUsd(totalInvested)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unrealized P&amp;L</p>
              <p className={cn('text-lg font-semibold tabular-nums', isPositive ? 'text-green-500' : 'text-red-500')}>
                {isPositive ? '+' : ''}{formatUsd(totalGain)}
                <span className="ml-1 text-sm opacity-75">
                  ({isPositive ? '+' : ''}{totalGainPct.toFixed(2)}%)
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        {loading ? (
          <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted/60" />
        ) : !hasData ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
            {(holdings ?? []).length === 0
              ? 'No holdings to chart yet — add positions below.'
              : 'Add purchase dates to your holdings to see the timeline chart.'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={series}
              margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
            >
              <defs>
                <linearGradient id="mvGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={MV_COLOR}   stopOpacity={0.35} />
                  <stop offset="95%" stopColor={MV_COLOR}   stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COST_COLOR} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={COST_COLOR} stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="color-mix(in oklab, currentColor 12%, transparent)" />

              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={60}
                tickFormatter={formatAxisDate}
                style={{ fontSize: '10px', fill: 'var(--muted-foreground)' }}
              />

              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickMargin={6}
                tickFormatter={formatShortUsd}
                domain={['auto', 'auto']}
                style={{ fontSize: '10px', fill: 'var(--muted-foreground)' }}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />

              {/* Cost basis — filled under, drawn behind market value */}
              <Area
                type="stepAfter"
                dataKey="invested"
                name="Invested (cost basis)"
                fill="url(#costGrad)"
                stroke={COST_COLOR}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: COST_COLOR }}
              />

              {/* Market value — drawn on top */}
              <Area
                type="stepAfter"
                dataKey="marketValue"
                name="Market value (today)"
                fill="url(#mvGrad)"
                stroke={MV_COLOR}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0, fill: MV_COLOR }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
