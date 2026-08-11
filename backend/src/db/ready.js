let dbReady = false
let dbError = null

export function isDbReady() {
  return dbReady
}

export function getDbBootError() {
  return dbError
}

export function markDbReady() {
  dbReady = true
  dbError = null
}

export function markDbFailed(error) {
  dbReady = false
  dbError = error?.message || String(error)
}
