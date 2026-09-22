import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMediaQuery } from '../../../hooks/useMediaQuery'
import { chartTheme } from '../../../theme'
import type { CategoryPoint, PeriodPoint, ProductPoint } from '../../types'
import {
  formatCompactMoney,
  formatMoney,
  formatNumber,
  formatPeriod,
  truncate,
} from '../../utils/format'

const axisTick = { fontSize: 12, fill: chartTheme.axis }

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <article className="card chart-card">
      <div className="chart-heading">
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>
      {children}
    </article>
  )
}

function ChartEmpty() {
  return (
    <div className="chart-empty">
      <p>No usable rows, so there's nothing to chart.</p>
    </div>
  )
}

interface TooltipProps<T> {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: T }>
}

function TooltipCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="chart-tooltip">
      <div className="tooltip-label">{title}</div>
      <div className="tooltip-value num">{value}</div>
      <div className="tooltip-detail num">{detail}</div>
    </div>
  )
}

export function RevenueChart({
  data,
  currency,
  grain,
}: {
  data: PeriodPoint[]
  currency: string
  grain: 'day' | 'month'
}) {
  // Reads orders from the data point itself, so no hidden second series is needed.
  const renderTooltip = ({ active, payload }: TooltipProps<PeriodPoint>) => {
    const point = payload?.[0]?.payload
    if (!active || !point) return null

    return (
      <TooltipCard
        title={formatPeriod(point.period, grain)}
        value={formatMoney(point.revenue, currency)}
        detail={`${formatNumber(point.orders)} ${point.orders === 1 ? 'order' : 'orders'}`}
      />
    )
  }

  return (
    <ChartCard title="Revenue over time" subtitle={`Revenue per ${grain} from usable rows.`}>
      {data.length === 0 ? (
        <ChartEmpty />
      ) : (
        <div className="chart-box chart-box-revenue">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="period"
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                tickFormatter={(value: string) => formatPeriod(value, grain)}
                minTickGap={24}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
                width={64}
              />
              <Tooltip content={renderTooltip} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke={chartTheme.line}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: chartTheme.line }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

export function TopProductsChart({ data, currency }: { data: ProductPoint[]; currency: string }) {
  const isNarrow = useMediaQuery('(max-width: 640px)')
  const rows = data.slice(0, 10)
  const labelLength = isNarrow ? 14 : 22

  const renderTooltip = ({ active, payload }: TooltipProps<ProductPoint>) => {
    const point = payload?.[0]?.payload
    if (!active || !point) return null

    return (
      <TooltipCard
        title={point.product}
        value={formatMoney(point.revenue, currency)}
        detail={`${formatNumber(point.units)} units`}
      />
    )
  }

  return (
    <ChartCard title="Top products" subtitle="Top 10 products by revenue.">
      {rows.length === 0 ? (
        <ChartEmpty />
      ) : (
        // Height depends on bar count, so it's set inline rather than in CSS.
        <div className="chart-box" style={{ height: rows.length * 36 + 40 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              layout="vertical"
              margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
              />
              <YAxis
                type="category"
                dataKey="product"
                width={isNarrow ? 100 : 150}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 13, fill: chartTheme.text }}
                tickFormatter={(value: string) => truncate(value, labelLength)}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: '#F1F5F9' }} />
              <Bar dataKey="revenue" fill={chartTheme.line} radius={[0, 4, 4, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}

export function CategoryChart({ data, currency }: { data: CategoryPoint[]; currency: string }) {
  const isNarrow = useMediaQuery('(max-width: 640px)')

  const renderTooltip = ({ active, payload }: TooltipProps<CategoryPoint>) => {
    const point = payload?.[0]?.payload
    if (!active || !point) return null

    return (
      <TooltipCard
        title={point.category}
        value={formatMoney(point.revenue, currency)}
        detail={`${point.share.toFixed(1)}% of revenue`}
      />
    )
  }

  return (
    <ChartCard title="Revenue by category" subtitle="Share of total revenue per category.">
      {data.length === 0 ? (
        <ChartEmpty />
      ) : (
        <div className="chart-box chart-box-category">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis
                dataKey="category"
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                interval={0}
                tickFormatter={(value: string) => truncate(value, isNarrow ? 8 : 14)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                tickFormatter={(value: number) => formatCompactMoney(value, currency)}
                width={64}
              />
              <Tooltip content={renderTooltip} cursor={{ fill: '#F1F5F9' }} />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell
                    key={entry.category}
                    fill={chartTheme.series[index % chartTheme.series.length]}
                  />
                ))}
                <LabelList
                  dataKey="share"
                  position="top"
                  fontSize={12}
                  fill={chartTheme.axis}
                  formatter={(value) => `${Number(value).toFixed(1)}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}