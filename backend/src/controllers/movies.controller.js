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

export function listMovies(req, res, next) {
  try {
    const includeInactive =
      req.query.includeInactive === '1' && req.user?.role === 'organizador'
    res.json({ movies: listLocalMovies({ includeInactive }) })
  } catch (error) {
    next(error)
  }
}

export function listAdminMovies(_req, res, next) {
  try {
    res.json({ movies: listLocalMovies({ includeInactive: true }) })
  } catch (error) {
    next(error)
  }
}

export function getMovie(req, res, next) {
  try {
    const asOrganizer = req.user?.role === 'organizador'
    const movie = getLocalMovie(req.params.id, {
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

export function createMovie(req, res, next) {
  try {
    const movie = createLocalMovie(req.user.id, req.body || {})
    res.status(201).json({ movie })
  } catch (error) {
    next(error)
  }
}

export function updateMovie(req, res, next) {
  try {
    const movie = updateLocalMovie(req.params.id, req.body || {})
    res.json({ movie })
  } catch (error) {
    next(error)
  }
}

export function setActiveMovie(req, res, next) {
  try {
    const isActive = Boolean(req.body?.isActive)
    const movie = setMovieActive(req.params.id, isActive)
    res.json({ movie })
  } catch (error) {
    next(error)
  }
}

export function removeMovie(req, res, next) {
  try {
    deleteLocalMovie(req.params.id)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
}

export function getMovieShowtimes(req, res, next) {
  try {
    const asOrganizer = req.user?.role === 'organizador'
    const movie = getLocalMovie(req.params.id, {
      includeInactive: asOrganizer,
    })
    if (!movie) {
      return res.status(404).json({ message: 'Filme não encontrado.' })
    }
    const sessions = listShowtimesForMovie(movie.id)
    res.json({ movie, sessions })
  } catch (error) {
    next(error)
  }
}

export function addMovieShowtime(req, res, next) {
  try {
    const session = createShowtime(req.user.id, req.params.id, req.body || {})
    res.status(201).json({ session })
  } catch (error) {
    next(error)
  }
}

export function organizerReport(_req, res, next) {
  try {
    res.json(getOrganizerReport())
  } catch (error) {
    next(error)
  }
}
