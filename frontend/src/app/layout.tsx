import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '@fontsource-variable/anek-latin'
import '@fontsource-variable/anek-telugu'
import '@fontsource-variable/anek-devanagari'
import '@fontsource-variable/inter'
import './globals.css'

export const metadata: Metadata = {
  title: 'Vaani',
  description: 'Book a table or a doctor’s appointment in your language.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>
        {children}
      </body>
    </html>
  )
}
