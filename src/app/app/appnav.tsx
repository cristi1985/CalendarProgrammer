'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

const links = [
  { href: '/app/calendar', label: 'Calendar' },
  { href: '/app/bookings', label: 'Bookings' },
  { href: '/app/settings/rooms', label: 'Rooms' },
  { href: '/app/settings/invitations', label: 'Invitations' },
]

export default function AppNav() {
  const pathname = usePathname()

  return (
    <nav className="app-nav">
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + '/')

        return (
        <Link
          key={link.href}
          href={link.href}
          className={clsx('nav-link', {
            'nav-link-active': isActive})}
        >
          {link.label}
        </Link>
        )
      })}
    </nav>
  )
}