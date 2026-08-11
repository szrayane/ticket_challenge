export function getYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0]
      return id || null
    }

    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (parsed.pathname.startsWith('/embed/')) {
        return parsed.pathname.split('/')[2] || null
      }
      if (parsed.pathname.startsWith('/shorts/')) {
        return parsed.pathname.split('/')[2] || null
      }
      return parsed.searchParams.get('v')
    }
  } catch {
    return null
  }

  return null
}

export function toYoutubeEmbedUrl(url: string, autoplay = true): string | null {
  const id = getYoutubeVideoId(url)
  if (!id) return null

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    ...(autoplay ? { autoplay: '1' } : {}),
  })

  return `https://www.youtube.com/embed/${id}?${params.toString()}`
}
