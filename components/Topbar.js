import { useRouter } from 'next/router'
import Link from 'next/link'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/deals': 'Deals',
  '/deals/new': 'New Deal',
  '/parties': 'Parties',
  '/parties/new': 'New Party',
  '/payments': 'Payments',
  '/payments/new': 'New Payment',
  '/reports': 'Reports & Analytics',
  '/risk': 'Risk Monitor',
}

export default function Topbar() {
  const router = useRouter()

  const getTitle = () => {
    if (router.pathname.match(/^\/deals\/[^/]+\/edit$/)) return 'Edit Deal'
    if (router.pathname.match(/^\/deals\/[^/]+$/)) return 'Deal Details'
    if (router.pathname.match(/^\/parties\/[^/]+\/edit$/)) return 'Edit Party'
    if (router.pathname.match(/^\/parties\/[^/]+$/)) return 'Party Profile'
    return PAGE_TITLES[router.pathname] || 'DA Trading'
  }

  return (
    <header className="h-12 bg-dark-surface border-b border-dark-border flex items-center justify-between px-6 shrink-0">
      <h1 className="text-sm font-semibold text-gray-200">{getTitle()}</h1>
      <div className="flex items-center gap-3">
        <Link href="/deals/new" className="btn-primary py-1.5 text-xs">
          + New Deal
        </Link>
      </div>
    </header>
  )
}
