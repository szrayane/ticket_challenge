import assert from 'node:assert/strict'
import {
  hashPassword,
  normalizeRole,
  verifyPassword,
} from '../src/services/auth.service.js'

assert.equal(normalizeRole('organizador'), 'organizador')
assert.equal(normalizeRole('PORTARIA'), 'portaria')
assert.equal(normalizeRole('cliente'), 'cliente')
assert.equal(normalizeRole('admin'), 'cliente')
assert.equal(normalizeRole(''), 'cliente')
assert.equal(normalizeRole(undefined), 'cliente')
assert.equal(normalizeRole('  Organizador  '), 'organizador')

const { salt, hash } = hashPassword('senha123')
assert.equal(typeof salt, 'string')
assert.equal(salt.length, 32)
assert.equal(typeof hash, 'string')
assert.equal(hash.length, 128)
assert.equal(verifyPassword('senha123', salt, hash), true)
assert.equal(verifyPassword('errada', salt, hash), false)

const sameSalt = hashPassword('senha123', salt)
assert.equal(sameSalt.hash, hash)
assert.notEqual(hashPassword('outra').hash, hash)

console.log('auth.unit.test.js ok')
