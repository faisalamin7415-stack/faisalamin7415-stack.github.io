import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from 'recharts'
import { formatCompact, formatIDR } from '../lib/money'
import { getCategory } from '../lib/categories'
import type { Bucket, CategorySlice } from '../lib/stats'
import { CategoryIcon } from './icons'
import { ProgressBar } from './ui'

interface TooltipPayload {
  dataKey?: string | number
  value?: number | string
  color?: string
}

function ChartTooltip({
  active,
  payload,
  label,
  labels,
}: {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
  labels?: Record<string, string>
}) {
  if (!active || !payload?.length) return null
  const title = labels?.[String(label)] ?? label
  return (
    <div className="rounded-lg border border-line bg-ink-800/95 px-3 py-2 shadow-lift backdrop-blur">
      <div className="mb-1 text-[10px] uppercase tracking-[0.12em] text-cream/40">{title}</div>
      {payload.map((item, i) => (
        <div key={i} className="flex items-center gap-2 text-[11.5px]">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: item.color }} />
          <span className="text-cream/50">
            {item.dataKey === 'income' ? 'Masuk' : 'Keluar'}
          </span>
          <span className="tnum ml-auto pl-3 font-medium text-cream">
            {formatIDR(Number(item.value ?? 0))}
          </span>
        </div>
      ))}
    </div>
  )
}

export function CashflowChart({
  buckets,
  height = 220,
  showIncome = true,
}: {
  buckets: Bucket[]
  height?: number
  showIncome?: boolean
}) {
  const data = buckets.map((b) => ({
    label: b.label,
    fullLabel: b.fullLabel,
    expense: b.expense,
    income: b.income,
  }))
  const labels = Object.fromEntries(buckets.map((b) => [b.label, b.fullLabel]))
  const dense = buckets.length > 16

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 2, bottom: 0, left: 2 }} barGap={2}>
          <CartesianGrid vertical={false} stroke="rgba(245,218,191,0.07)" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={dense ? Math.ceil(buckets.length / 8) - 1 : 0}
            tick={{ fill: 'rgba(245,218,191,0.35)', fontSize: 10 }}
            dy={6}
          />
          <Tooltip
            cursor={{ fill: 'rgba(245,218,191,0.04)' }}
            content={<ChartTooltip labels={labels} />}
          />
          <Bar
            dataKey="expense"
            fill="#8E2B33"
            radius={[3, 3, 0, 0]}
            maxBarSize={dense ? 10 : 22}
            isAnimationActive={false}
          />
          {showIncome && (
            <Bar
              dataKey="income"
              fill="#2F7A72"
              radius={[3, 3, 0, 0]}
              maxBarSize={dense ? 10 : 22}
              isAnimationActive={false}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Sparkline({ values, tone = 'cream' }: { values: number[]; tone?: 'cream' | 'teal' }) {
  const data = values.map((v, i) => ({ i, v }))
  const color = tone === 'teal' ? '#74B6AB' : '#F5DABF'
  const id = `spark-${tone}`
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.6}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CategoryBreakdown({
  slices,
  total,
  emptyLabel = 'Belum ada data kategori.',
}: {
  slices: CategorySlice[]
  total: number
  emptyLabel?: string
}) {
  if (!slices.length) {
    return <p className="py-8 text-center text-[12px] text-cream/35">{emptyLabel}</p>
  }

  const chartData = slices.slice(0, 6).map((s) => ({
    name: getCategory(s.id).label,
    value: s.total,
    color: getCategory(s.id).color,
    id: s.id,
  }))

  return (
    <div className="grid items-center gap-5 sm:grid-cols-[168px_1fr]">
      <div className="relative mx-auto h-[168px] w-[168px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={82}
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {chartData.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const p = payload[0]
                return (
                  <div className="rounded-lg border border-line bg-ink-800/95 px-3 py-2 text-[11.5px] shadow-lift">
                    <span className="text-cream/50">{p.name}</span>
                    <span className="tnum ml-2 font-medium text-cream">
                      {formatIDR(Number(p.value ?? 0))}
                    </span>
                  </div>
                )
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9.5px] uppercase tracking-[0.14em] text-cream/35">Total</span>
          <span className="tnum mt-0.5 font-display text-[19px] text-cream">
            {formatCompact(total)}
          </span>
        </div>
      </div>

      <ul className="space-y-2.5">
        {slices.slice(0, 6).map((s) => {
          const cat = getCategory(s.id)
          return (
            <li key={s.id}>
              <div className="mb-1.5 flex items-center gap-2 text-[12px]">
                <span style={{ color: cat.color }}>
                  <CategoryIcon name={cat.icon} size={14} />
                </span>
                <span className="truncate text-cream/65">{cat.label}</span>
                <span className="tnum ml-auto pl-2 text-cream/45">
                  {Math.round(s.share * 100)}%
                </span>
                <span className="tnum w-[74px] text-right text-[11.5px] text-cream/70">
                  {formatCompact(s.total)}
                </span>
              </div>
              <ProgressBar value={s.share} color={cat.color} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}
