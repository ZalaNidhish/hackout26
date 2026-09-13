import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Globe2,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Wind,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const { login, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/', { replace: true })
  }

  const handleFillDemo = () => {
    setEmail('demo@demo.com')
    setPassword('demo1234')
    setError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await login(email, password)
    setSubmitting(false)

    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setError(result.error || 'Authentication failed. Please check your credentials.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-page text-navy flex flex-col justify-between selection:bg-sky-500 selection:text-white transition-colors duration-200">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-surface/80 px-4 sm:px-8 py-3.5 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-steel to-navy text-white shadow-md ring-1 ring-white/20">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold tracking-tight text-navy">
                Renewable Generation Forecasting
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-950/70 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-600 dark:bg-sky-400 animate-pulse" />
                v0.2 Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              Multi-Tenant Solar &amp; Wind Energy Dispatch Intelligence
            </p>
          </div>
        </div>

        {/* Theme Mode Toggle Button */}
        <button
          onClick={toggleTheme}
          title="Toggle Light / Dark mode"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface text-slate-600 dark:text-slate-300 shadow-sm transition-all hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-navy focus:outline-none focus:ring-2 focus:ring-steel/20"
          aria-label="Toggle theme"
        >
          {isDark ? (
            <Sun size={15} className="text-amber-400 fill-amber-400" />
          ) : (
            <Moon size={15} className="text-slate-600" />
          )}
        </button>
      </header>

      {/* Hero & Form Split Section */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 rounded-3xl border border-border/90 bg-surface shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
          
          {/* Left Hero Column: Platform Capabilities & Live Analytics Preview */}
          <div className="lg:col-span-6 bg-gradient-to-br from-slate-900 via-navy to-slate-950 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Subtle Ambient Decorative Gradient Glows */}
            <div className="absolute -top-24 -left-24 w-72 h-72 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:20px_20px] opacity-[0.07] pointer-events-none" />

            <div className="relative z-10">
              {/* Badge */}
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-sky-300 border border-white/10 backdrop-blur-md mb-6">
                <Sparkles size={12} className="text-sky-400" />
                <span>AI Dispatch &amp; Weather Telemetry Engine</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight mb-4">
                Predictive Precision for Solar &amp; Wind Generation
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-8">
                Continuous multi-quantile forecasting (P10?P90), 100m hub-height aerodynamic telemetry, and dynamic duck-curve demand schedule optimization.
              </p>

              {/* Core Feature Highlights */}
              <div className="space-y-3.5 mb-8">
                <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 border border-white/[0.08] backdrop-blur-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    <Wind size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Live Surface &amp; Hub Wind Dynamics</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Physical power curve mapping with real-time vector gusts and air density modeling.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 border border-white/[0.08] backdrop-blur-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <TrendingUp size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Automated Grid Risk Ribbon</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Instant dispatch classification for Surplus export and Deficit shortage avoidance.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Live Metric Badge */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="font-semibold text-slate-200 text-[11px]">Grid EMS Status: Operational</span>
              </div>
              <span className="font-mono text-[11px] text-sky-300">48h Ensemble Model</span>
            </div>
          </div>

          {/* Right Column: Clean SaaS Login Form */}
          <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-center bg-surface">
            <div className="mb-6">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 mb-3 border border-sky-200 dark:border-sky-800 shadow-sm">
                <Lock size={20} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-navy">
                Operator Sign In
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Access your plant portfolios, real-time forecast curves, and dispatch targets.
              </p>
            </div>

            {/* 1-Click Demo Fill Banner */}
            <div className="mb-6 rounded-2xl border border-sky-200/80 bg-sky-50/70 dark:border-sky-800/80 dark:bg-sky-950/40 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white shadow-2xs">
                  <Zap size={14} />
                </div>
                <div>
                  <div className="text-xs font-bold text-sky-950 dark:text-sky-200">
                    Fast 1-Click Demo Access
                  </div>
                  <div className="text-[11px] text-sky-800 dark:text-sky-300 font-mono">
                    demo@demo.com &bull; demo1234
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="rounded-xl bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700 px-3 py-1.5 text-xs font-bold text-sky-900 dark:text-sky-200 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-all shadow-2xs shrink-0"
              >
                Fill Demo
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-danger/20 bg-dangerbg p-3.5 text-xs text-danger animate-fadeIn">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div className="leading-tight font-medium">{error}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Operator Email
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@grid-energy.com"
                    className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-3.5 text-xs font-semibold text-navy placeholder:text-slate-400 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="????????"
                    className="w-full rounded-xl border border-border bg-input py-2.5 pl-10 pr-10 text-xs font-semibold text-navy placeholder:text-slate-400 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy transition-colors"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-navy via-steel to-navy py-3 text-xs font-bold text-white shadow-md hover:shadow-lg hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-60"
              >
                {submitting ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Authorizing Operator Session...</span>
                  </div>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            {/* Link to Register */}
            <div className="mt-6 pt-5 border-t border-border/70 text-center text-xs text-slate-500">
              Need to register a new operator account?{' '}
              <Link
                to="/register"
                className="font-bold text-steel hover:underline dark:text-sky-400 inline-flex items-center gap-1"
              >
                <span>Register here</span>
                <span>&rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-border/60">
        Renewable Generation Forecasting Platform &bull; Real-Time Meteorological Grid EMS Engine
      </footer>
    </div>
  )
}
