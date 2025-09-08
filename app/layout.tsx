import './globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SiteNav } from '@/components/SiteNav'

export const metadata = {
  title: 'Fairment Darmkur Tagebuch',
  description: 'Mobile-first PWA for daily Darmkur tracking',
  manifest: '/manifest.webmanifest',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  const user = userId ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true, username: true, displayName: true, settings: { select: { theme: true } } } }) : null
  const theme = user?.settings?.theme || 'dark'
  return (
    <html lang="de" className={theme === 'dark' ? 'dark' : 'bright'}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#0b0f14" />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur border-b border-slate-800">
          <div className="container h-14 flex items-center justify-between">
            <Link href="/" className="font-semibold">Darmkur-Tagebuch-App</Link>
            <SiteNav user={user ? { id: user.id, username: user.username, displayName: user.displayName } : null} />
          </div>
        </header>
        <main className="container py-4 flex-1">
          {children}
        </main>
        <footer className="border-t border-slate-800 bg-surface/80">
          <div className="container py-2 text-xs text-gray-400">Fairment Darmkur Tagebuch App</div>
        </footer>
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(() => {})
            })
          }
        `}} />
      </body>
    </html>
  )
}

