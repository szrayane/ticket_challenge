export interface CurrentMovie {
  title: string
  highlight?: string
  synopsis: string
  genre: string
  year: number
  rating: number
  runtime: string
  format?: string
  badge?: string
  poster: string
  trailerUrl?: string
}

/**
 * Catálogo em cartaz — apenas 2026.
 * Mapeado nos ids da API Cineflex (sessões/assentos usam o mesmo id).
 */
export const CURRENT_MOVIES: Record<number, CurrentMovie> = {
  1: {
    title: 'Homem-Aranha: Um Novo Dia',
    highlight: 'Estreia imperdível',
    synopsis:
      'Quatro anos depois do feitiço do Doutor Estranho, Peter Parker tenta reconstruir a vida enquanto uma nova ameaça força o Homem-Aranha a encarar o preço de ser herói — e de ser esquecido.',
    genre: 'Ação / Aventura',
    year: 2026,
    rating: 8.7,
    runtime: '2h 22m',
    format: 'IMAX',
    badge: 'Em cartaz',
    poster:
      'https://m.media-amazon.com/images/M/MV5BOWNjYWM3NWItOGE0ZS00MWRjLThiZWEtYjc4ZmNmMmU5ZTVmXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=2EoEuSqamkg',
  },
  2: {
    title: 'A Odisseia',
    synopsis:
      'Christopher Nolan leva a épica jornada de Odisseu às telonas: uma odisseia visual sobre guerra, nostalgia e a luta desesperada para voltar para casa.',
    genre: 'Épico / Drama',
    year: 2026,
    rating: 8.9,
    runtime: '2h 45m',
    format: 'IMAX',
    poster:
      'https://m.media-amazon.com/images/M/MV5BNTcyNmJlZmQtNDUwYy00NDBjLTg1NGQtYTY2Y2UxMWM3NmI1XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=f_bKjZeJBBI',
  },
  3: {
    title: 'Toy Story 5',
    synopsis:
      'Woody, Buzz e a turma embarcam em uma nova aventura quando o mundo dos brinquedos encontra um desafio nunca visto — e a amizade é novamente colocada à prova.',
    genre: 'Animação / Família',
    year: 2026,
    rating: 8.2,
    runtime: '1h 48m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BZTI1YTBiNmEtYWUxZi00YzFkLWIzNjMtMmZjMmY2NzM0ZWMzXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=ctBHktclhZ0',
  },
  4: {
    title: 'Michael',
    synopsis:
      'A cinebiografia de Michael Jackson revisita a ascensão, o gênio artístico e as contradições do Rei do Pop, em um retrato espetacular de um ícone mundial.',
    genre: 'Biografia / Drama',
    year: 2026,
    rating: 7.8,
    runtime: '2h 30m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BNzllNmRlN2EtMDQyOC00ODJjLTg4OWQtZDNmNGU3YzlkNjc1XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  5: {
    title: 'Super Mario Galaxy: O Filme',
    synopsis:
      'Mario e Luigi saltam para além do Reino Cogumelo em uma aventura espacial repleta de planetas, inimigos clássicos e muita nostalgia dos games.',
    genre: 'Animação / Aventura',
    year: 2026,
    rating: 8.0,
    runtime: '1h 42m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BYWYxYWRkMTUtMGMwZC00MzYyLThlNjEtNDcwMDYyMTQ4ZjJlXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  6: {
    title: 'Supergirl',
    synopsis:
      'Kara Zor-El chega à Terra e precisa encontrar o próprio caminho como heroína, longe da sombra do primo — em uma jornada de identidade, coragem e esperança.',
    genre: 'Ação / Ficção científica',
    year: 2026,
    rating: 7.6,
    runtime: '2h 10m',
    format: 'IMAX',
    poster:
      'https://m.media-amazon.com/images/M/MV5BMmJkOTE0MWUtY2E5OS00NzEyLWI4NjEtYzQzYzFmMjk5ODE3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  7: {
    title: 'Project Hail Mary',
    synopsis:
      'Um professor acorda sozinho em uma missão espacial sem memória do porquê está ali. Para salvar a humanidade, precisa desvendar o mistério — e fazer um aliado improvável.',
    genre: 'Ficção científica / Aventura',
    year: 2026,
    rating: 8.3,
    runtime: '2h 20m',
    format: 'IMAX',
    poster:
      'https://m.media-amazon.com/images/M/MV5BNTkwNzJiYTctNzI3NC00NjE1LTlhYjktY2Q5MTdmMWFmNzcxXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  8: {
    title: 'The Bride!',
    synopsis:
      'Uma reimaginação sombria e ousada do mito da noiva de Frankenstein, entre romance gótico, horror e identidade.',
    genre: 'Terror / Fantasia',
    year: 2026,
    rating: 7.4,
    runtime: '2h 05m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BM2VmMDVlNzgtNThhZC00ZGMwLTg4MmEtZTUzNmRiYTkxYzUyXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  9: {
    title: 'Moana',
    synopsis:
      'O live-action acompanha a corajosa viajante de Motunui em sua jornada pelo oceano para salvar seu povo — com aventura, música e descobertas.',
    genre: 'Aventura / Família',
    year: 2026,
    rating: 7.7,
    runtime: '1h 55m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BMTQ1OTQ2Y2UtMzllNS00ODFiLWFkNGItNGRjOWRlMjIwNTRlXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  10: {
    title: 'O Diabo Veste Prada 2',
    synopsis:
      'Anos depois da icônica revista, antigos rivais se reencontram no universo da moda — com novos poderes, velhas farpas e muito glamour.',
    genre: 'Comédia / Drama',
    year: 2026,
    rating: 7.5,
    runtime: '2h 00m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BZmM3ZDU3ODItZmY5Yi00OTQ2LWE5OTctZTA5NDBhMWJkOGY3XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  11: {
    title: 'Todo Mundo em Pânico',
    synopsis:
      'A franquia de comédia de terror volta com novas paródias dos maiores sucessos do horror contemporâneo.',
    genre: 'Comédia / Terror',
    year: 2026,
    rating: 6.9,
    runtime: '1h 40m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BNTJjMDk1NzAtMGVmNS00NTFmLWFlOTQtZDk5M2I2NjZiZDdlXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  12: {
    title: 'Minions & Monstros',
    synopsis:
      'Os Minions enfrentam criaturas hilárias em uma aventura caótica cheia de banana, perseguição e confusão tipicamente amarela.',
    genre: 'Animação / Família',
    year: 2026,
    rating: 7.1,
    runtime: '1h 35m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BYzBjMDg4YjctYzg3ZS00ZDFmLWI1YjctM2RkZGVjZWEyYWQ0XkEyXkFqcGc@._V1_QL75_UX380_CR0,20,380,562_.jpg',
  },
  13: {
    title: 'Star Wars: The Mandalorian and Grogu',
    synopsis:
      'Din Djarin e Grogu embarcam em uma missão cinematográfica pela galáxia, entre caçadores de recompensa, alianças frágeis e muita nostalgia de Star Wars.',
    genre: 'Ficção científica / Aventura',
    year: 2026,
    rating: 8.0,
    runtime: '2h 15m',
    format: 'IMAX',
    poster:
      'https://m.media-amazon.com/images/M/MV5BYjRkYzAzNjktZmRhMy00NjRiLWE0OTMtYmRmMTE5NDkzY2NlXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  14: {
    title: 'Masters of the Universe',
    synopsis:
      'He-Man retorna a Eternia para enfrentar Skeletor em uma aventura épica de fantasia, poder e destino — com ação em larga escala.',
    genre: 'Ação / Fantasia',
    year: 2026,
    rating: 7.4,
    runtime: '2h 05m',
    format: 'IMAX',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/n4Tu3IWW01eJBEax5b5elvZAd37.jpg',
  },
  15: {
    title: 'Jogos Vorazes: Sunrise on the Reaping',
    synopsis:
      'Uma nova geração enfrenta a crueldade dos Jogos em Panem. Alianças, traições e a luta pela sobrevivência voltam ao centro da arena.',
    genre: 'Ação / Ficção científica',
    year: 2026,
    rating: 7.6,
    runtime: '2h 28m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BNGRkYmM2MjUtZTY4Yi00YTNhLTk1MDEtYTQ3YjFiOTljM2Y1XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  16: {
    title: 'Jumanji 3',
    synopsis:
      'O jogo lendário volta a abrir as portas para um novo nível de perigo — selva, puzzles e caos em uma aventura ainda maior.',
    genre: 'Aventura / Comédia',
    year: 2026,
    rating: 7.3,
    runtime: '2h 02m',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/57trFzPPZsmroyBNNg7QZsD21JL.jpg',
  },
  17: {
    title: 'Scream 7',
    synopsis:
      'Ghostface retorna e a regra número um continua valendo: todo mundo é suspeito. Metalinguagem, sustos e sangue fresco na franquia.',
    genre: 'Terror / Mistério',
    year: 2026,
    rating: 7.2,
    runtime: '1h 52m',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/gSOVog7ydsaF1YpgAqBqnKYFGY.jpg',
  },
  18: {
    title: 'Godzilla Minus Zero',
    synopsis:
      'O Rei dos Monstros volta em uma nova ameaça devastadora. Sobrevivência, destruição e o peso de um legado que nunca desaparece.',
    genre: 'Ação / Ficção científica',
    year: 2026,
    rating: 8.1,
    runtime: '2h 12m',
    format: 'IMAX',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/a9kYEboW1TQaeilGYUAx1MO0DUp.jpg',
  },
  19: {
    title: 'Vingadores: Doomsday',
    highlight: 'O fim de uma era',
    synopsis:
      'Heróis de universos distintos colidem diante de uma ameaça existencial nunca vista. Alianças improváveis podem ser a última esperança.',
    genre: 'Ação / Ficção científica',
    year: 2026,
    rating: 8.8,
    runtime: '2h 45m',
    format: 'IMAX',
    badge: 'Em breve',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/s6orZYtTN3MUKrUUogT4vnHIWGh.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=fxNh27fRdYA',
  },
  20: {
    title: 'Duna: Parte Dois',
    synopsis:
      'A saga de Arrakis chega ao ato decisivo: poder, profecia e sobrevivência no deserto mais perigoso do universo.',
    genre: 'Épico / Ficção científica',
    year: 2026,
    rating: 8.6,
    runtime: '2h 40m',
    format: 'IMAX',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/rrjoeR5m98ptkGUJ2Z7G4t2lXMg.jpg',
    trailerUrl: 'https://www.youtube.com/watch?v=ncwsW3qxQlo',
  },
  21: {
    title: 'Practical Magic 2',
    synopsis:
      'As irmãs Owens retornam para enfrentar uma nova maldição familiar — com romance, humor e um toque clássico de bruxaria.',
    genre: 'Fantasia / Comédia',
    year: 2026,
    rating: 7.2,
    runtime: '1h 52m',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/2lSf1aoZA6UpTEBxVGqnJ7QayIP.jpg',
  },
  22: {
    title: 'Clayface',
    synopsis:
      'Um thriller sombrio do universo Batman focado na origem trágica e monstruosa de Clayface, entre identidade, vingança e horror corporal.',
    genre: 'Terror / Crime',
    year: 2026,
    rating: 7.3,
    runtime: '1h 58m',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/5jCpQnWPikggmQZoDp1eAi6BI6w.jpg',
  },
  23: {
    title: 'Violent Night 2',
    synopsis:
      'O Natal sangrento volta: Papai Noel troca o trenó pela violência santa para proteger quem ainda acredita — e eliminar quem não deveria.',
    genre: 'Ação / Comédia',
    year: 2026,
    rating: 7.1,
    runtime: '1h 48m',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/e2olETeXHDasOr30feVU7JCxFJN.jpg',
  },
  24: {
    title: 'Angry Birds 3',
    synopsis:
      'Red e a turma enfrentam uma nova ameaça às Ilhas dos Pássaros em uma aventura caótica, colorida e cheia de catapultas.',
    genre: 'Animação / Família',
    year: 2026,
    rating: 6.8,
    runtime: '1h 36m',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/6lF0V5RSzYmyJUudnnSOeiMuJaX.jpg',
  },
  25: {
    title: 'Werwulf',
    synopsis:
      'Robert Eggers leva o terror medieval aos lobisomens: uma fábula sombria de maldição, fé e selvageria na neve.',
    genre: 'Terror / Mistério',
    year: 2026,
    rating: 7.7,
    runtime: '2h 05m',
    poster:
      'https://image.tmdb.org/t/p/w600_and_h900_bestv2/qAvCgWOCzBGnhHIEkaWBSxhEEEk.jpg',
  },
  26: {
    title: 'Verity',
    synopsis:
      'Uma escritora fantasma aceita terminar o livro de uma autora enigmática e descobre um manuscrito que pode ser verdade — ou uma armadilha mortal.',
    genre: 'Suspense / Drama',
    year: 2026,
    rating: 7.5,
    runtime: '1h 56m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BYmI4NmViZDMtYTcwMi00MTdjLWFiNjUtNDcxMmJmYjgyMjU0XkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  27: {
    title: 'Whalefall',
    synopsis:
      'Um mergulhador fica preso dentro de uma baleia e luta contra o tempo, a escuridão e a própria culpa em uma história de sobrevivência extrema.',
    genre: 'Suspense / Aventura',
    year: 2026,
    rating: 7.8,
    runtime: '1h 54m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BZDZlYmQ2ZTYtODUyOC00NDg1LWE0ODItODZjMjE0ZWFiOTgyXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
  28: {
    title: 'Crime 101',
    synopsis:
      'Um thriller de assalto de alto risco onde um plano “perfeito” começa a desmoronar quando cada detalhe revela um novo inimigo.',
    genre: 'Crime / Thriller',
    year: 2026,
    rating: 7.4,
    runtime: '2h 08m',
    poster:
      'https://m.media-amazon.com/images/M/MV5BZThlN2M4ZTUtYTU3Mi00MDE5LWFhYWUtNjkxMWEwNjUwNDVhXkEyXkFqcGc@._V1_QL75_UX380_CR0,0,380,562_.jpg',
  },
}

/** IDs do catálogo local em cartaz (pode ultrapassar os 20 da API Cineflex). */
export function listCurrentYearMovieIds(year = 2026): number[] {
  return Object.entries(CURRENT_MOVIES)
    .filter(([, movie]) => movie.year === year)
    .map(([id]) => Number(id))
    .sort((a, b) => a - b)
}

export function getCurrentMovie(id: number) {
  return CURRENT_MOVIES[id]
}

export function isCurrentYearMovie(id: number, year = 2026) {
  return getCurrentMovie(id)?.year === year
}

/**
 * A Cineflex só tem showtimes/assentos para ids 1–20.
 * Filmes extras do catálogo local reutilizam um id da API de forma estável.
 */
export function resolveApiMovieId(movieId: string | number, apiCount = 20): number {
  const id = Number(movieId)
  if (!Number.isFinite(id) || id <= 0) return 1
  if (id <= apiCount) return id
  return ((id - 1) % apiCount) + 1
}
