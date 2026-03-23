import Link from 'next/link'
import { useRouter } from 'next/router'
import { signOut, useSession } from 'next-auth/react'

const navItems = [
  {
    section: 'OVERVIEW',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: '⬛' },
      { href: '/risk', label: 'Risk Monitor', icon: '🔴' },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      { href: '/deals', label: 'Deals', icon: '📄' },
      { href: '/parties', label: 'Parties', icon: '🏢' },
      { href: '/payments', label: 'Payments', icon: '💰' },
    ],
  },
  {
    section: 'ANALYTICS',
    items: [
      { href: '/reports', label: 'Reports', icon: '📊' },
    ],
  },
]

export default function Sidebar() {
  const router = useRouter()
  const { data: session } = useSession()

  const isActive = (href) => {
    if (href === '/dashboard') return router.pathname === '/dashboard'
    return router.pathname.startsWith(href)
  }

  return (
    <aside className="w-56 bg-dark-surface border-r border-dark-border flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-blue rounded-md flex items-center justify-center text-white font-bold text-xs">DA</div>
          <div>
            <div className="text-sm font-semibold text-white leading-tight">DA Trading</div>
            <div className="text-xs text-gray-500">Management Platform</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navItems.map(group => (
          <div key={group.section} className="mb-4">
            <div className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-2 mb-1">
              {group.section}
            </div>
            {group.items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm mb-0.5 transition-colors ${
                  isActive(item.href)
                    ? 'bg-brand-blue/15 text-brand-blue font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-dark-hover'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-3 border-t border-dark-border">
        <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
          <div className="w-7 h-7 bg-brand-blue/20 rounded-full flex items-center justify-center text-xs font-semibold text-brand-blue">
            {session?.user?.name?.[0] || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-gray-300 truncate">{session?.user?.name || 'Admin'}</div>
            <div className="text-xs text-gray-600 truncate">{session?.user?.email || ''}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full text-left px-2 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-dark-hover rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
