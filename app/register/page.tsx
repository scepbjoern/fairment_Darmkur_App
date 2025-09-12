"use client"
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, displayName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Registrierung fehlgeschlagen')
      } else {
        router.push('/')
        router.refresh()
      }
    } catch {
      setError('Netzwerkfehler')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">Registrieren</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <div className="space-y-1">
          <label className="text-sm text-gray-300">Benutzername</label>
          <input
            className="w-full bg-background border border-slate-700 rounded px-2 py-1"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-300">Anzeigename (optional)</label>
          <input
            className="w-full bg-background border border-slate-700 rounded px-2 py-1"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            autoComplete="name"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm text-gray-300">Passwort</label>
          <input
            type="password"
            className="w-full bg-background border border-slate-700 rounded px-2 py-1"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="pill"
        >
          {loading ? 'Registrieren…' : 'Registrieren'}
        </button>
      </form>
      <div className="text-sm text-gray-300 mt-4">
        Bereits ein Konto?{' '}
        <Link className="text-blue-400 hover:underline" href="/login">Zum Login</Link>
      </div>
    </div>
  )
}
