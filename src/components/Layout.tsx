import { Outlet } from 'react-router-dom'
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
    <div className="flex min-h-screen flex-col">
      {!hideNav && <Navbar compact={compactNav} />}
      <Outlet />
      {!hideFooter && <Footer compact={compactFooter} />}
    </div>
  )
}
