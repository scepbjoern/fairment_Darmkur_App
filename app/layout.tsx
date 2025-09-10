import './globals.css'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { SiteNav } from '@/components/SiteNav'

export const metadata = {
  title: 'Darmkur App',
  description: 'Mobile-first PWA for daily Darmkur tracking',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/logo_32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/logo_16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/logo_192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/logo_180.png', sizes: '180x180' },
    ],
  },
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies()
  const userId = cookieStore.get('userId')?.value
  let user = userId ? await prisma.user.findUnique({ 
    where: { id: userId }, 
    select: { 
      id: true, 
      username: true, 
      displayName: true,
      profileImageUrl: true,
      settings: { select: { theme: true } } 
    } 
  }) : null
  if (!user) {
    user = await prisma.user.findUnique({
      where: { username: 'demo' },
      select: {
        id: true,
        username: true,
        displayName: true,
        profileImageUrl: true,
        settings: { select: { theme: true } },
      },
    })
  }
  
  // Prefer DB theme; fall back to cookie if DB not present. Normalize and default to 'dark'
  const themeCookie = cookieStore.get('theme')?.value || ''
  const t = (user?.settings?.theme || themeCookie || '').toLowerCase()
  const theme: 'dark' | 'bright' = (t === 'bright' || t === 'light') ? 'bright' : 'dark'
  
  return (
    <html 
      lang="de" 
      className={theme === 'dark' ? 'dark' : 'bright'}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.webmanifest" crossOrigin="use-credentials" />
        <meta name="theme-color" content="#0b0f14" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                // Apply theme based on server-rendered preference to avoid FOUC
                var savedTheme = '${theme}';
                var root = document.documentElement;
                if (savedTheme === 'dark') {
                  root.classList.add('dark');
                  root.classList.remove('bright');
                } else {
                  root.classList.add('bright');
                  root.classList.remove('dark');
                }
                // Persist as cookie so SSR can read it reliably
                try { document.cookie = 'theme=' + savedTheme + '; path=/; max-age=31536000'; } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-10 bg-surface/80 backdrop-blur border-b border-slate-800 dark:border-slate-200">
          <div className="container h-14 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <img
                src="/icons/logo_32.png"
                alt="App Icon"
                width={28}
                height={28}
                className="h-7 w-7 rounded-full border border-slate-700 dark:border-slate-200 bg-surface object-cover"
              />
              <span>Darmkur App</span>
            </Link>
            <SiteNav user={user ? { id: user.id, username: user.username, displayName: user.displayName, profileImageUrl: user.profileImageUrl } : null} />
          </div>
        </header>
        <main className="container py-4 flex-1">
          {children}
        </main>
        <footer className="border-t border-slate-800 bg-surface/80">
          <div className="container py-2 text-xs text-gray-400">Darmkur App</div>
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
