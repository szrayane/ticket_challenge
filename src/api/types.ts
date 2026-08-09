export interface ApiMovie {
  id: number
  title: string
  posterURL: string
  overview: string
  releaseDate: string
}

export interface ApiShowtime {
  id: number
  name: string
}

export interface ApiDay {
  id: number
  weekday: string
  date: string
  showtimes: ApiShowtime[]
}

export interface ApiMovieShowtimes extends ApiMovie {
  days: ApiDay[]
}

export interface ApiSeat {
  id: number
  name: string
  isAvailable: boolean
}

export interface ApiShowtimeSeats {
  id: number
  name: string
  day: {
    id: number
    weekday: string
    date: string
  }
  movie: ApiMovie
  seats: ApiSeat[]
}

export interface BookSeatsPayload {
  ids: number[]
  name: string
  cpf: string
}
