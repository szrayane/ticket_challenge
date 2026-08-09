import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { BookingProvider } from './context/BookingContext'
import { AccountPage } from './pages/AccountPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { GatePage } from './pages/GatePage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { MoviePage } from './pages/MoviePage'
import { OrganizerPage } from './pages/OrganizerPage'
import { SeatsPage } from './pages/SeatsPage'
import { SharedTicketPage } from './pages/SharedTicketPage'
import { StaffLoginPage } from './pages/StaffLoginPage'
import { StaticPage } from './pages/StaticPage'
import { SuccessPage } from './pages/SuccessPage'

export default function App() {
  return (
    <AuthProvider>
      <BookingProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="staff/login" element={<StaffLoginPage />} />
              <Route path="i/:shareToken" element={<SharedTicketPage />} />
              <Route path="conta" element={<AccountPage />} />
              <Route path="organizador" element={<OrganizerPage />} />
              <Route path="portaria" element={<GatePage />} />
              <Route path="filme/:movieId" element={<MoviePage />} />
              <Route path="sobre" element={<StaticPage />} />
              <Route path="suporte" element={<StaticPage />} />
              <Route path="termos" element={<StaticPage />} />
              <Route path="privacidade" element={<StaticPage />} />
              <Route path="corporativo" element={<StaticPage />} />
            </Route>

            <Route element={<Layout compactNav compactFooter />}>
              <Route path="seats/:movieId" element={<SeatsPage />} />
            </Route>

            <Route element={<Layout hideNav hideFooter />}>
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="success" element={<SuccessPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </BookingProvider>
    </AuthProvider>
  )
}
