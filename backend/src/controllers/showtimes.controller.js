import {
  duplicateShowtime,
  getLocalShowtimeWithMovie,
  getShowtime,
  getShowtimeOccupancy,
  updateShowtime,
  deleteShowtime,
} from '../services/showtimes.service.js'

export async function getShowtimeSeats(req, res, next) {
  try {
    const data = await getLocalShowtimeWithMovie(req.params.id)
    if (!data) {
      return res.status(404).json({ message: 'Sessão não encontrada.' })
    }
    res.json(data)
  } catch (error) {
    next(error)
  }
}

export async function getOccupancy(req, res, next) {
  try {
    res.json(await getShowtimeOccupancy(req.params.id))
  } catch (error) {
    next(error)
  }
}

export async function patchShowtime(req, res, next) {
  try {
    const session = await updateShowtime(req.params.id, req.body || {})
    res.json({ session })
  } catch (error) {
    next(error)
  }
}

export async function cloneShowtime(req, res, next) {
  try {
    const session = await duplicateShowtime(
      req.user.id,
      req.params.id,
      req.body || {},
    )
    res.status(201).json({ session })
  } catch (error) {
    next(error)
  }
}

export async function removeShowtime(req, res, next) {
  try {
    const existing = await getShowtime(req.params.id)
    if (!existing) {
      return res.status(404).json({ message: 'Sessão não encontrada.' })
    }
    await deleteShowtime(req.params.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}
