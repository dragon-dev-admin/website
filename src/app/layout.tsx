import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'

export const metadata: Metadata = {
  title: '$Alpha Dragon',
  description: 'Decentralizing token data to discover alpha.',
  icons: {
    icon: '/images/logo.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body className="min-h-screen antialiased flex flex-col bg-[#06101d]" suppressHydrationWarning>
        {/* Project Transfer Announcement Banner */}
        <div className="w-full bg-emerald-950/80 backdrop-blur-md border-b border-emerald-500/30 text-emerald-100 px-4 py-3 text-center text-xs sm:text-sm font-mono flex flex-wrap items-center justify-center gap-x-2 gap-y-1.5 relative z-[9999]">
          <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold tracking-wide">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Project Transfer RFP is Active
          </span>
          <span className="hidden md:inline text-emerald-500/30">|</span>
          <span className="text-emerald-200/90">The prototype stage is complete. Join the transfer proposal:</span>
          <a
            href="https://github.com/alpha-dragon-org/project-transfer"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline text-emerald-400 hover:text-emerald-300 transition-colors inline-flex items-center gap-1 ml-0.5"
          >
            Review GitHub RFP
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
        <div className="flex-1 flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
