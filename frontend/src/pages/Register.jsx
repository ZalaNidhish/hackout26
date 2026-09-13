import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, ArrowRight, Lock, Mail, Moon, Sun, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import { useTheme } from '../context/ThemeContext.jsx'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const { register, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const navigate = useNavigate()

  if (isAuthenticated) {
    navigate('/', { replace: true })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please provide an email and password.')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError(null)

    const result = await register(email, password)
    setSubmitting(false)

    if (result.success) {
      navigate('/', { replace: true })
    } else {
      setError(result.error || 'Registration failed. Please check your credentials and try again.')
    }
  }

  return (
    <div className="flex min-h-screen flex-col justify-between bg-page text-navy transition-colors duration-200">
      {/* Top Bar for Auth Screen */}
      <header className="flex w-full items-center justify-between border-b border-border/80 bg-surface/80 px-6 py-4 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-600 via-steel to-navy text-white shadow-sm">
            <Activity size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-navy">
              Renewable Generation Forecasting Platform
            </h1>
            <p className="text-[11px] text-slate-500">
              Enterprise Solar &amp; Wind Grid Dispatch Forecasting
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          title="Toggle Light / Dark theme"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-slate-600 shadow-sm transition-all hover:bg-slate-100 hover:text-navy dark:hover:bg-slate-800"
        >
          {isDark ? <Sun size={14} className="text-amber-400 fill-amber-400" /> : <Moon size={14} className="text-slate-600" />}
        </button>
      </header>

      {/* Main Registration Form Box */}
      <main className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md rounded-2xl border border-border/90 bg-surface p-6 sm:p-8 shadow-card transition-all">
          <div className="mb-6 text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mb-3 border border-emerald-200 dark:border-emerald-800">
              <UserPlus size={22} />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-navy">
              Create Operator Account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Register to manage multi-tenant solar and wind assets with JWT authorization
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-danger/20 bg-dangerbg p-3.5 text-xs text-danger animate-fadeIn">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="leading-tight">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@grid-energy.com"
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-xs font-semibold text-navy placeholder:text-slate-400 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="????????"
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-xs font-semibold text-navy placeholder:text-slate-400 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="????????"
                  className="w-full rounded-xl border border-border bg-input py-2.5 pl-9 pr-3 text-xs font-semibold text-navy placeholder:text-slate-400 focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/20"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-xs font-bold text-white shadow-sm hover:bg-steel transition-all disabled:opacity-60"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Registering...</span>
                </div>
              ) : (
                <>
                  <span>Create Account &amp; Access Dashboard</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          {/* Link to Login */}
          <div className="mt-5 pt-4 border-t border-border/70 text-center text-xs text-slate-500">
            Already have an operator account?{' '}
            <Link
              to="/login"
              className="font-bold text-steel hover:underline dark:text-sky-400"
            >
              Sign In here &rarr;
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-[11px] text-slate-400 border-t border-border/60">
        Renewable Generation Forecasting Platform &bull; Solar &amp; Wind Real-Time Telemetry Engine
      </footer>
    </div>
  )
}
