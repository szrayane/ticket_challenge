import {
  duplicateShowtime,
  getLocalShowtimeWithMovie,
  getShowtime,
  getShowtimeOccupancy,
  updateShowtime,
  deleteShowtime,
} from '../services/showtimes.service.js'

export function getShowtimeSeats(req, res, next) {
  try {
    const data = getLocalShowtimeWithMovie(req.params.id)
    if (!data) {
      return res.status(404).json({ message: 'Sessão não encontrada.' })
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}

export function getOccupancy(req, res, next) {
  try {
    res.json(getShowtimeOccupancy(req.params.id))
  } catch (error) {
    next(error)
  }
}

export function patchShowtime(req, res, next) {
  try {
    const session = updateShowtime(req.params.id, req.body || {})
    res.json({ session })
  } catch (error) {
    next(error)
  }
}

export function cloneShowtime(req, res, next) {
  try {
    const session = duplicateShowtime(
      req.user.id,
      req.params.id,
      req.body || {},
    )
    res.status(201).json({ session })
  } catch (error) {
    next(error)
  }
}

export function removeShowtime(req, res, next) {
  try {
    const existing = getShowtime(req.params.id)
    if (!existing) {
      return res.status(404).json({ message: 'Sessão não encontrada.' })
    }
    deleteShowtime(req.params.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}
