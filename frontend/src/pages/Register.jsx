import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Activity, AlertCircle, Loader2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await register(email, password)
      navigate('/')
    } catch (err) {
      const detail = err?.response?.data?.detail
      setError(detail || 'Could not create account.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy dark:bg-slate-800 text-white">
            <Activity size={20} />
          </div>
          <h1 className="text-lg font-bold text-navy dark:text-slate-100">Create your account</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Configure your own plant and demand schedule</p>
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
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">Confirm password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-navy dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-steel/20"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-3 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy/90 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            Create account
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-navy dark:text-slate-200 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
