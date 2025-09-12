"use client"
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const search = useSearchParams()
  const reason = search.get('reason')
  const nextUrl = search.get('next') || '/'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error || 'Login fehlgeschlagen')
      } else {
        router.push(nextUrl)
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
      <h1 className="text-xl font-semibold mb-4">Anmeldung</h1>
      {reason === 'auth' && (
        <div className="mb-3 text-sm text-amber-300">Bitte melde dich an, um die Applikation zu nutzen.</div>
      )}
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
          <label className="text-sm text-gray-300">Passwort</label>
          <input
            type="password"
            className="w-full bg-background border border-slate-700 rounded px-2 py-1"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <div className="text-sm text-red-400">{error}</div>}
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="pill"
        >
          {loading ? 'Einloggen…' : 'Einloggen'}
        </button>
      </form>
      <div className="text-xs text-gray-400 mt-3">Tipp: Es wird ein Testnutzer erstellt, falls der Benutzername unbekannt ist.</div>
      <div className="text-sm text-gray-300 mt-4">
        Kein Konto?{' '}
        <Link className="text-blue-400 hover:underline" href="/register">Jetzt registrieren</Link>
      </div>
    </div>
  )
}
