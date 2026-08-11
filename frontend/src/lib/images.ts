
export function toHeroImage(url: string): string {
  if (!url) return url

  if (
    url.includes('m.media-amazon.com') ||
    url.includes('images-na.ssl-images-amazon.com')
  ) {
    return url.replace(/\._V1_[^?]*/, '._V1_.jpg')
  }

  if (url.includes('image.tmdb.org') || url.includes('themoviedb.org')) {
    return url
      .replace('/t/p/w600_and_h900_bestv2/', '/t/p/w1280/')
      .replace(/\/t\/p\/w\d+\//, '/t/p/w1280/')
  }

  return url
}

export function toPosterImage(url: string): string {
  if (!url) return url

  if (
    url.includes('m.media-amazon.com') ||
    url.includes('images-na.ssl-images-amazon.com')
  ) {
    return url.replace(/\._V1_[^?]*/, '._V1_QL75_UX600_.jpg')
  }

  if (url.includes('image.tmdb.org') || url.includes('themoviedb.org')) {
    return url
      .replace(/\/t\/p\/w\d+\//, '/t/p/w780/')
      .replace('/t/p/w600_and_h900_bestv2/', '/t/p/w780/')
  }

  return url
}
