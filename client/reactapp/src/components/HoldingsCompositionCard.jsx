import { useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

/** Dark forest / sage greens — distinct series, readable in light and dark UI. */
const chartConfig = {
  marketValue: {
    label: 'Market value',
    theme: {
      light: 'oklch(0.34 0.12 152)',
      dark: 'oklch(0.58 0.13 152)',
    },
  },
  costBasis: {
    label: 'Cost basis',
    theme: {
      light: 'oklch(0.46 0.09 158)',
      dark: 'oklch(0.48 0.1 162)',
    },
  },
}

function holdingRow(h) {
  const qty = Number(h.quantity)
  const purchase = Number(h.purchasePrice)
  const last = Number(h.currentPrice ?? h.purchasePrice)
  const price = Number.isFinite(last) ? last : purchase
  const marketValue =
    Number.isFinite(price) && Number.isFinite(qty) ? price * qty : 0
  const costBasis =
    Number.isFinite(purchase) && Number.isFinite(qty) ? purchase * qty : 0
  return {
    id: h._id ?? h.ticker,
    symbol: String(h.ticker ?? '—'),
    name: String(h.name ?? ''),
    marketValue,
    costBasis,
  }
}

function formatUsd(n) {
  if (!Number.isFinite(n)) return '—'
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function HoldingsCompositionCard({ holdings, totalValue, loading, subtitle }) {
  const [scope, setScope] = useState('all')

  const rows = useMemo(() => {
    const list = (holdings ?? []).map(holdingRow).filter((r) => r.marketValue > 0 || r.costBasis > 0)
    list.sort((a, b) => b.marketValue - a.marketValue)
    if (scope === 'top8' && list.length > 8) {
      return list.slice(0, 8)
    }
    return list
  }, [holdings, scope])

  const chartData = useMemo(
    () =>
      rows.map((r) => ({
        symbol: r.symbol,
        marketValue: r.marketValue,
        costBasis: r.costBasis,
      })),
    [rows],
  )

  return (
    <Card className="mb-4 border-border/80 py-0">
      <CardHeader className="border-b border-border/60 pb-4 pt-5">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base font-semibold tracking-tight">
            Portfolio composition
          </CardTitle>
          <CardDescription>
            Market value vs. cost basis by position
            {subtitle ? ` · ${subtitle}` : ''}
          </CardDescription>
        </div>
        <CardAction>
          <div
            className="flex rounded-lg border border-border bg-muted/40 p-0.5"
            role="group"
            aria-label="Chart scope"
          >
            {[
              { id: 'all', label: 'All' },
              { id: 'top8', label: 'Top 8' },
            ].map(({ id, label }) => (
              <Button
                key={id}
                type="button"
                size="sm"
                variant="ghost"
                className={cn(
                  'h-8 rounded-md px-3 text-xs shadow-none',
                  scope === id && 'bg-background text-foreground shadow-sm',
                )}
                onClick={() => setScope(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4 pb-5 pt-4">
        {loading ? (
          <div className="h-[260px] w-full animate-pulse rounded-lg bg-muted/60" />
        ) : chartData.length === 0 ? (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 text-center text-sm text-muted-foreground">
            No holdings to chart yet — add positions below.
          </div>
        ) : (
          <>
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[min(320px,55vw)] w-full min-h-[240px] max-h-[360px]"
            >
              <AreaChart
                accessibilityLayer
                data={chartData}
                margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="symbol"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(v) => (String(v).length > 8 ? `${String(v).slice(0, 7)}…` : v)}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={48}
                  tickMargin={6}
                  tickFormatter={(v) => {
                    const n = Number(v)
                    if (!Number.isFinite(n)) return ''
                    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
                    if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`
                    return `$${n}`
                  }}
                  className="text-[10px] fill-muted-foreground"
                />
                <ChartTooltip
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1, strokeOpacity: 0.6 }}
                  content={
                    <ChartTooltipContent
                      indicator="dot"
                      formatter={(value) => (
                        <span className="tabular-nums">{formatUsd(Number(value))}</span>
                      )}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="natural"
                  dataKey="marketValue"
                  stackId="a"
                  fill="var(--color-marketValue)"
                  fillOpacity={0.42}
                  stroke="var(--color-marketValue)"
                  strokeWidth={1.5}
                />
                <Area
                  type="natural"
                  dataKey="costBasis"
                  stackId="b"
                  fill="var(--color-costBasis)"
                  fillOpacity={0.32}
                  stroke="var(--color-costBasis)"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ChartContainer>

            <div className="overflow-hidden rounded-lg border border-border/80">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Symbol
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Name
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Market value
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Cost basis
                    </TableHead>
                    <TableHead className="text-right text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      % of view
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const denom = rows.reduce((s, x) => s + x.marketValue, 0)
                    const pct = denom > 0 ? (r.marketValue / denom) * 100 : 0
                    return (
                      <TableRow key={r.id} className="text-sm">
                        <TableCell className="font-medium">{r.symbol}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-muted-foreground">
                          {r.name || '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatUsd(r.marketValue)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {formatUsd(r.costBasis)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {pct.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            {totalValue > 0 && scope === 'all' ? (
              <p className="text-xs text-muted-foreground">
                Total market value (all filtered positions):{' '}
                <span className="font-medium text-foreground">{formatUsd(totalValue)}</span>
              </p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  )
}
