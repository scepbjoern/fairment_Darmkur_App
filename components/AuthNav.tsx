"use client"
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export function AuthNav({ user }: { user: { id: string; username: string; displayName: string | null } | null }) {
  const router = useRouter()

  async function onLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  if (!user) {
    return <Link href="/login" className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Login</Link>
  }

  const name = user.displayName || user.username
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-700 dark:text-gray-300">{name}</span>
      <button onClick={onLogout} className="text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">Abmelden</button>
    </div>
  )
}
