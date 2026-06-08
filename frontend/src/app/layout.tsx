import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BetIQ — Sports Prediction Engine',
  description: 'AI-powered football predictions with live odds, H2H analysis, and team statistics',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
