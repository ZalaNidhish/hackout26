import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, Loader2, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Could not log in. Check your email and password.')
    } finally {
      setSubmitting(false)
    }
  }

  function fillDemoCreds() {
    setEmail('demo@demo.com')
    setPassword('demo1234')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy dark:bg-slate-800 text-white">
            <Activity size={20} />
          </div>
          <h1 className="text-lg font-bold text-navy dark:text-slate-100">Renewable Generation Forecasting</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Log in to view your plants</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-border dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-card space-y-3"
        >
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 px-2.5 py-2 text-xs text-red-700 dark:text-red-300">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy/90 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
            Log in
          </button>

          <button
            type="button"
            onClick={fillDemoCreds}
            className="w-full rounded-lg border border-dashed border-border dark:border-slate-700 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Use demo account (demo@demo.com)
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-navy dark:text-slate-200 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}
