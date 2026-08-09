import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  cancelMyTicket,
  changePassword,
  fetchMe,
  fetchMyTickets,
  loginAccount,
  logoutAccount,
  patchProfile,
  registerAccount,
  saveMyTickets,
} from '../api/auth'
import { getAuthToken, setAuthToken } from '../api/appClient'
import type { CustomerTicket, CustomerUser } from '../types'

interface AuthContextValue {
  user: CustomerUser | null
  tickets: CustomerTicket[]
  isAuthenticated: boolean
  bootstrapping: boolean
  login: (input: {
    email: string
    password: string
  }) => Promise<CustomerUser>
  register: (input: {
    name: string
    email: string
    password: string
  }) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (
    patch: Partial<Pick<CustomerUser, 'name' | 'cpf'>>,
  ) => Promise<void>
  changePassword: (input: {
    currentPassword: string
    newPassword: string
  }) => Promise<void>
  addTickets: (
    tickets: CustomerTicket[],
    options?: { holderKey?: string },
  ) => Promise<void>
  cancelTicket: (ticketId: string) => Promise<void>
  userTickets: CustomerTicket[]
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null)
  const [tickets, setTickets] = useState<CustomerTicket[]>([])
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      const token = getAuthToken()
      if (!token) {
        if (active) setBootstrapping(false)
        return
      }

      try {
        const me = await fetchMe()
        const myTickets = await fetchMyTickets()
        if (!active) return
        setUser(me)
        setTickets(myTickets)
      } catch {
        setAuthToken(null)
        if (active) {
          setUser(null)
          setTickets([])
        }
      } finally {
        if (active) setBootstrapping(false)
      }
    }

    void bootstrap()
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (input: { email: string; password: string }) => {
    const next = await loginAccount(input)
    const myTickets =
      next.role === 'cliente' || !next.role
        ? await fetchMyTickets().catch(() => [])
        : []
    setUser(next)
    setTickets(myTickets)
    return next
  }, [])

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const next = await registerAccount(input)
      setUser(next)
      setTickets([])
    },
    [],
  )

  const logout = useCallback(async () => {
    await logoutAccount()
    setUser(null)
    setTickets([])
  }, [])

  const updateProfile = useCallback(
    async (patch: Partial<Pick<CustomerUser, 'name' | 'cpf'>>) => {
      const next = await patchProfile(patch)
      setUser(next)
    },
    [],
  )

  const changePasswordFn = useCallback(
    async (input: { currentPassword: string; newPassword: string }) => {
      await changePassword(input)
    },
    [],
  )

  const addTickets = useCallback(
    async (
      nextTickets: CustomerTicket[],
      options?: { holderKey?: string },
    ) => {
      const saved = await saveMyTickets(nextTickets, options?.holderKey)
      setTickets((prev) => [...saved, ...prev])
    },
    [],
  )

  const cancelTicket = useCallback(async (ticketId: string) => {
    const updated = await cancelMyTicket(ticketId)
    setTickets((prev) =>
      prev.map((ticket) => (ticket.id === updated.id ? updated : ticket)),
    )
  }, [])

  const userTickets = useMemo(() => {
    if (!user) return []
    return tickets.filter((ticket) => ticket.userId === user.id)
  }, [tickets, user])

  const value = useMemo(
    () => ({
      user,
      tickets,
      isAuthenticated: Boolean(user),
      bootstrapping,
      login,
      register,
      logout,
      updateProfile,
      changePassword: changePasswordFn,
      addTickets,
      cancelTicket,
      userTickets,
    }),
    [
      user,
      tickets,
      bootstrapping,
      login,
      register,
      logout,
      updateProfile,
      changePasswordFn,
      addTickets,
      cancelTicket,
      userTickets,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
