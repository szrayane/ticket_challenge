export const DEMO_PASSWORD = 'cineray'

export const DEMO_ACCOUNTS = [
  {
    email: 'cliente1@cineray.com',
    name: 'Bruno Cliente',
    role: 'cliente' as const,
    roleLabel: 'Cliente 1',
    icon: 'person',
  },
  {
    email: 'cliente2@cineray.com',
    name: 'Carla Cliente',
    role: 'cliente' as const,
    roleLabel: 'Cliente 2',
    icon: 'person',
  },
  {
    email: 'organizador@cineray.com',
    name: 'Ana Organizadora',
    role: 'organizador' as const,
    roleLabel: 'Organizador',
    icon: 'local_movies',
  },
  {
    email: 'portaria@cineray.com',
    name: 'Diego Portaria',
    role: 'portaria' as const,
    roleLabel: 'Portaria',
    icon: 'qr_code_2',
  },
] as const

export const DEMO_CLIENT = DEMO_ACCOUNTS[0]
