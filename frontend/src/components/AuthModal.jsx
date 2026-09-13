import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  UserPlus,
  X,
  Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function AuthModal({ isOpen, onClose, onSuccess }) {
  const { login, register, authError, setAuthError } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setValidationError('')
    setAuthError(null)

    if (!email || !password) {
      setValidationError('Please enter both email and password.')
      return
    }

    if (mode === 'register' && password !== confirmPassword) {
      setValidationError('Passwords do not match.')
      return
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    const res = mode === 'login' ? await login(email, password) : await register(email, password)
    setLoading(false)

    if (res.success) {
      onSuccess?.()
      onClose()
    }
  }

  const displayedError = validationError || authError

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div
        className="relative w-full max-w-md rounded-2xl border border-border/80 bg-white p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        {/* Brand & Title */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy text-white shadow-sm">
            <Zap size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-base font-bold text-navy tracking-tight">
              {mode === 'login' ? 'Sign In to EMS' : 'Create Operator Account'}
            </h2>
            <p className="text-xs text-slate-500">
              Renewable Generation Forecasting Platform
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-5 flex rounded-xl border border-border bg-slate-100/80 p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setValidationError('')
              setAuthError(null)
            }}
            className={`flex-1 rounded-lg py-2 transition-all ${
              mode === 'login'
                ? 'bg-white text-navy shadow-sm'
                : 'text-slate-500 hover:text-navy'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              setValidationError('')
              setAuthError(null)
            }}
            className={`flex-1 rounded-lg py-2 transition-all ${
              mode === 'register'
                ? 'bg-white text-navy shadow-sm'
                : 'text-slate-500 hover:text-navy'
            }`}
          >
            Register
          </button>
        </div>

        {/* Error Alert */}
        {displayedError && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-danger/20 bg-dangerbg p-3 text-xs text-danger shadow-2xs">
            <AlertCircle size={14} className="shrink-0" />
            <span>{displayedError}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@grid.com"
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-xs text-navy placeholder:text-slate-400 focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-xs text-navy placeholder:text-slate-400 focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-xs text-navy placeholder:text-slate-400 focus:border-slate focus:outline-none focus:ring-2 focus:ring-slate/20"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-navy py-2.5 text-xs font-bold text-white shadow-sm hover:bg-slate disabled:opacity-60 transition-all"
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{mode === 'login' ? 'Authenticating...' : 'Registering...'}</span>
              </>
            ) : mode === 'login' ? (
              <>
                <KeyRound size={14} />
                <span>Sign In with Email</span>
              </>
            ) : (
              <>
                <UserPlus size={14} />
                <span>Create Operator Account</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
