import assert from 'node:assert/strict'
import {
  getGoogleWalletStatus,
  isGoogleWalletConfigured,
} from '../src/services/googleWallet.service.js'

assert.equal(typeof isGoogleWalletConfigured(), 'boolean')
assert.equal(typeof getGoogleWalletStatus().configured, 'boolean')

if (!isGoogleWalletConfigured()) {
  try {
    const { buildGoogleWalletSaveUrl } = await import(
      '../src/services/googleWallet.service.js'
    )
    buildGoogleWalletSaveUrl({
      id: 'tkt_test',
      movieTitle: 'Teste',
      qrPayload: 'CR2.test',
      shareToken: 'abc',
    })
    assert.fail('deveria falhar sem credenciais')
  } catch (error) {
    assert.equal(error.code, 'GOOGLE_WALLET_NOT_CONFIGURED')
  }
}

console.log('googleWallet.unit.test.js ok')
