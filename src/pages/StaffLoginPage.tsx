import { Navigate, useLocation } from 'react-router-dom'

/** Mantém links antigos de /staff/login funcionando. */
export function StaffLoginPage() {
  const location = useLocation()
  return <Navigate to={`/login${location.search}`} replace />
}
