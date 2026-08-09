import {
  changeUserPassword,
  loginUser,
  logoutUser,
  registerUser,
  updateUserProfile,
} from '../services/auth.service.js'

export function register(req, res, next) {
  try {
    const result = registerUser(req.body || {})
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export function login(req, res, next) {
  try {
    const result = loginUser(req.body || {})
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export function me(req, res) {
  res.json({ user: req.user })
}

export function logout(req, res, next) {
  try {
    logoutUser(req.token)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

export function updateProfile(req, res, next) {
  try {
    const user = updateUserProfile(req.user.id, req.body || {})
    res.json({ user })
  } catch (error) {
    next(error)
  }
}

export function changePassword(req, res, next) {
  try {
    const result = changeUserPassword(req.user.id, req.body || {})
    res.json(result)
  } catch (error) {
    next(error)
  }
}
