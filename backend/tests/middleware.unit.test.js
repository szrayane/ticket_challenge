import assert from 'node:assert/strict'
import { requireRole } from '../src/middlewares/auth.js'
import { errorHandler } from '../src/middlewares/errorHandler.js'

function mockRes() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
}

{
  const guard = requireRole('organizador', 'portaria')
  let nextCalled = false
  const res = mockRes()
  guard({ user: { role: 'organizador' } }, res, () => {
    nextCalled = true
  })
  assert.equal(nextCalled, true)
  assert.equal(res.statusCode, null)
}

{
  const guard = requireRole('organizador')
  const res = mockRes()
  let nextCalled = false
  guard({ user: { role: 'cliente' } }, res, () => {
    nextCalled = true
  })
  assert.equal(nextCalled, false)
  assert.equal(res.statusCode, 403)
  assert.match(res.body.message, /não permitido/i)
}

{
  const guard = requireRole('portaria')
  const res = mockRes()
  guard({}, res, () => {})
  assert.equal(res.statusCode, 401)
  assert.match(res.body.message, /login/i)
}

{
  const res = mockRes()
  const err = new Error('Assento ocupado')
  err.status = 409
  errorHandler(err, {}, res, () => {})
  assert.equal(res.statusCode, 409)
  assert.deepEqual(res.body, { message: 'Assento ocupado' })
}

{
  const res = mockRes()
  errorHandler({ status: 400 }, {}, res, () => {})
  assert.equal(res.statusCode, 400)
  assert.deepEqual(res.body, { message: 'Internal server error' })
}

console.log('middleware.unit.test.js ok')
