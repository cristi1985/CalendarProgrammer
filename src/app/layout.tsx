import { title } from 'process'
import './globals.css'
import { stat } from 'fs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>
        <main style={{ padding: 20 }}>
          {children}
        </main>
      </body>
    </html>
  )
}

export const metadata = {
  title: 'Calendar Programmer',
  description: 'Room booking and workspace calendar management tool',
  appleWebApp: {
    capable:true,
    title: 'Calendar Programmer',
    statusBarStyle: 'default',
  },
}