import {
  changeUserPassword,
  loginUser,
  logoutUser,
  registerStaffUser,
  registerUser,
  updateUserProfile,
} from '../services/auth.service.js'

export async function register(req, res, next) {
  try {
    const result = await registerUser(req.body || {})
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function registerStaff(req, res, next) {
  try {
    const result = await registerStaffUser(req.body || {})
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}

export async function login(req, res, next) {
  try {
    const result = await loginUser(req.body || {})
    res.json(result)
  } catch (error) {
    next(error)
  }
}

export function me(req, res) {
  res.json({ user: req.user })
}

export async function logout(req, res, next) {
  try {
    await logoutUser(req.token)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function updateProfile(req, res, next) {
  try {
    const user = await updateUserProfile(req.user.id, req.body || {})
    res.json({ user })
  } catch (error) {
    next(error)
  }
}

export async function changePassword(req, res, next) {
  try {
    const result = await changeUserPassword(req.user.id, req.body || {})
    res.json(result)
  } catch (error) {
    next(error)
  }
}
