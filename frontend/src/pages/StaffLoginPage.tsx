import { Navigate, useLocation } from 'react-router-dom'

export function StaffLoginPage() {
  const location = useLocation()
  return <Navigate to={`/login${location.search}`} replace />
}
