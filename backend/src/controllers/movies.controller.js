import {
  createLocalMovie,
  deleteLocalMovie,
  getLocalMovie,
  listLocalMovies,
  setMovieActive,
  updateLocalMovie,
} from '../services/movies.service.js'
import {
  createShowtime,
  getOrganizerReport,
  listShowtimesForMovie,
} from '../services/showtimes.service.js'

export async function listMovies(req, res, next) {
  try {
    const includeInactive =
      req.query.includeInactive === '1' && req.user?.role === 'organizador'
    res.json({ movies: await listLocalMovies({ includeInactive }) })
  } catch (error) {
    next(error)
  }
}

export async function listAdminMovies(_req, res, next) {
  try {
    res.json({ movies: await listLocalMovies({ includeInactive: true }) })
  } catch (error) {
    next(error)
  }
}

export async function getMovie(req, res, next) {
  try {
    const asOrganizer = req.user?.role === 'organizador'
    const movie = await getLocalMovie(req.params.id, {
      includeInactive: asOrganizer,
    })
    if (!movie) {
      return res.status(404).json({ message: 'Filme não encontrado.' })
    }
    res.json({ movie })
  } catch (error) {
    next(error)
  }
}

export async function createMovie(req, res, next) {
  try {
    const movie = await createLocalMovie(req.user.id, req.body || {})
    res.status(201).json({ movie })
  } catch (error) {
    next(error)
  }
}

export async function updateMovie(req, res, next) {
  try {
    const movie = await updateLocalMovie(req.params.id, req.body || {})
    res.json({ movie })
  } catch (error) {
    next(error)
  }
}

export async function setActiveMovie(req, res, next) {
  try {
    const isActive = Boolean(req.body?.isActive)
    const movie = await setMovieActive(req.params.id, isActive)
    res.json({ movie })
  } catch (error) {
    next(error)
  }
}

export async function removeMovie(req, res, next) {
  try {
    await deleteLocalMovie(req.params.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

export async function getMovieShowtimes(req, res, next) {
  try {
    const asOrganizer = req.user?.role === 'organizador'
    const movie = await getLocalMovie(req.params.id, {
      includeInactive: asOrganizer,
    })
    if (!movie) {
      return res.status(404).json({ message: 'Filme não encontrado.' })
    }
    const sessions = await listShowtimesForMovie(movie.id, {
      // Cliente não vê sessão lotada; organizador precisa ver todas.
      onlyWithAvailability: !asOrganizer,
    })
    res.json({ movie, sessions })
  } catch (error) {
    next(error)
  }
}

export async function addMovieShowtime(req, res, next) {
  try {
    const session = await createShowtime(req.user.id, req.params.id, req.body || {})
    res.status(201).json({ session })
  } catch (error) {
    next(error)
  }
}

export async function organizerReport(_req, res, next) {
  try {
    res.json(await getOrganizerReport())
  } catch (error) {
    next(error)
  }
}
