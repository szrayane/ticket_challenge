/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CINEMA_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
