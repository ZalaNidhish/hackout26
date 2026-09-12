import { AlertTriangle, Leaf, ShieldCheck, Wallet } from 'lucide-react'
import { formatINR } from '../statusConfig.js'

function CardShell({ icon: Icon, label, children, iconBg = 'bg-slate-50', iconColor = 'text-slate-600', subtitle }) {
  return (
    <div className="group rounded-xl border border-border/80 bg-white p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-cardHover">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg} ${iconColor} transition-transform group-hover:scale-105`}>
          <Icon size={16} strokeWidth={2.25} />
        </div>
      </div>
      <div className="mt-3.5">{children}</div>
      {subtitle && <p className="mt-1.5 text-[11px] text-slate-400">{subtitle}</p>}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="rounded-xl border border-border/80 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-20 rounded" />
        <div className="skeleton h-8 w-8 rounded-lg" />
      </div>
      <div className="skeleton mt-4 h-7 w-28 rounded" />
      <div className="skeleton mt-2 h-2.5 w-36 rounded" />
    </div>
  )
}

const CONFIDENCE_STYLE = {
  High: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
  },
  Medium: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
  },
  Low: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
  },
}

export default function SummaryCards({ forecast, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const confidence = forecast?.forecast_confidence || 'Medium'
  const confStyle = CONFIDENCE_STYLE[confidence] || CONFIDENCE_STYLE.Medium
  const alertCount = (forecast?.points || []).filter((p) => p.status !== 'normal').length
  const totalHours = forecast?.points?.length || 0

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Forecast Confidence */}
      <CardShell
        icon={ShieldCheck}
        label="Forecast Confidence"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        subtitle="Ensemble model calibration"
      >
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${confStyle.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${confStyle.dot}`} />
          {confidence} Confidence
        </span>
      </CardShell>

      {/* 2. Estimated Savings */}
      <CardShell
        icon={Wallet}
        label="Estimated Savings"
        iconBg="bg-orange-50"
        iconColor="text-rust"
        subtitle="Avoided peak spot procurement"
      >
        <span className="text-2xl font-bold tracking-tight text-rust">
          {formatINR(forecast?.estimated_savings_inr)}
        </span>
      </CardShell>

      {/* 3. Avoided Emissions */}
      <CardShell
        icon={Leaf}
        label="Avoided Emissions"
        iconBg="bg-emerald-50"
        iconColor="text-emerald-600"
        subtitle="Displacing fossil generation"
      >
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-bold tracking-tight text-navy">
            {forecast?.avoided_emissions_tco2 !== undefined && forecast?.avoided_emissions_tco2 !== null
              ? Number(forecast.avoided_emissions_tco2).toFixed(1)
              : '0.0'}
          </span>
          <span className="text-xs font-medium text-slate-500">t CO₂</span>
        </div>
      </CardShell>

      {/* 4. Active Alerts */}
      <CardShell
        icon={AlertTriangle}
        label="Active Alerts"
        iconBg={alertCount > 0 ? 'bg-rose-50' : 'bg-slate-50'}
        iconColor={alertCount > 0 ? 'text-danger' : 'text-slate-400'}
        subtitle={alertCount === 0 ? 'All intervals within normal bounds' : 'Operational intervention advised'}
      >
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-bold tracking-tight ${alertCount > 0 ? 'text-danger' : 'text-navy'}`}>
            {alertCount}
          </span>
          <span className="text-xs font-normal text-slate-500">
            of {totalHours} hrs flagged
          </span>
        </div>
      </CardShell>
    </div>
  )
}
