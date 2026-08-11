import { Outlet } from 'react-router-dom'
import { ChatWidget } from './ChatWidget'
import { Footer } from './Footer'
import { Navbar } from './Navbar'

interface LayoutProps {
  hideNav?: boolean
  hideFooter?: boolean
  compactNav?: boolean
  compactFooter?: boolean
}

export function Layout({
  hideNav = false,
  hideFooter = false,
  compactNav = false,
  compactFooter = false,
}: LayoutProps) {
  return (
    <div className="flex min-h-screen min-w-0 max-w-full flex-col overflow-x-clip">
      {!hideNav && <Navbar compact={compactNav} />}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
      {!hideFooter && <Footer compact={compactFooter} />}
      <ChatWidget />
    </div>
  )
}
