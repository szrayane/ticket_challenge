import { useEffect } from 'react'
import { Icon } from './Icon'
import { toYoutubeEmbedUrl } from '../lib/youtube'

interface TrailerModalProps {
  title: string
  trailerUrl: string
  onClose: () => void
}

export function TrailerModal({ title, trailerUrl, onClose }: TrailerModalProps) {
  const embedUrl = toYoutubeEmbedUrl(trailerUrl)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label={`Trailer: ${title}`}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-background shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-5">
          <h2 className="truncate text-body-lg font-semibold text-on-surface">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-primary"
            aria-label="Fechar trailer"
          >
            <Icon name="close" className="text-headline-md" />
          </button>
        </div>

        <div className="aspect-video w-full bg-black">
          {embedUrl ? (
            <iframe
              title={`Trailer de ${title}`}
              src={embedUrl}
              className="h-full w-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              <p className="text-body-md text-on-surface-variant">
                Não foi possível carregar o trailer deste filme.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
