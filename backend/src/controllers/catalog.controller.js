import {
  getTmdbMovie,
  searchTmdbMovies,
} from '../services/tmdb.service.js'
import { createEventFromTmdb } from '../services/events.service.js'

export async function searchCatalog(req, res, next) {
  try {
    const data = await searchTmdbMovies(req.query.q || req.query.query || '', {
      page: Number(req.query.page) || 1,
    })
    res.json(data)
  } catch (error) {
    next(error)
  }
}

export async function getCatalogMovie(req, res, next) {
  try {
    const movie = await getTmdbMovie(req.params.tmdbId)
    res.json({ movie })
  } catch (error) {
    next(error)
  }
}

export async function createEvent(req, res, next) {
  try {
    const result = await createEventFromTmdb(req.user.id, req.body || {})
    res.status(201).json(result)
  } catch (error) {
    next(error)
  }
}
