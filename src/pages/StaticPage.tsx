import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icon'

const PAGES: Record<
  string,
  { title: string; paragraphs: string[] }
> = {
  sobre: {
    title: 'Sobre nós',
    paragraphs: [
      'A CineRay é um cinema digital: escolha o filme, reserve o assento e entre com QR na porta.',
      'Demo do Desafio Elite Dev 2026 — pagamento simulado, hold de 10 min e validação na portaria.',
    ],
  },
  suporte: {
    title: 'Suporte',
    paragraphs: [
      'Dúvidas sobre compra ou conta: use Minha conta para ver QR Codes, cancelar antes da sessão e atualizar dados.',
      'Problemas técnicos: confira o README do repositório e se a API está no ar.',
    ],
  },
  termos: {
    title: 'Termos de uso',
    paragraphs: [
      'A CineRay é só para demonstração e estudo.',
      'Pagamentos são fictícios: nenhum valor real é cobrado.',
      'Assentos em hold expiram se a compra não for concluída.',
    ],
  },
  privacidade: {
    title: 'Política de privacidade',
    paragraphs: [
      'Nome, e-mail, CPF e senha (hash) ficam no MySQL do projeto.',
      'Não enviamos dados para marketing. O token de sessão fica no navegador.',
      'Você pode sair da conta a qualquer momento.',
    ],
  },
  corporativo: {
    title: 'Reservas corporativas',
    paragraphs: [
      'Reservas de sala inteira e eventos em grupo ainda não estão neste app.',
      'Hoje o fluxo é compra individual com mapa de assentos e QR na entrada.',
    ],
  },
}

export function StaticPage() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\//, '')
  const page = PAGES[slug]

  if (!page) {
    return (
      <main className="mx-auto flex min-h-0 w-full max-w-[840px] flex-1 flex-col items-center justify-center gap-4 px-5">
        <p className="text-body-lg text-primary">Página não encontrada.</p>
        <Link to="/" className="text-label-md underline">
          Voltar
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-[840px] flex-grow flex-col gap-6 px-5 py-section-gap md:px-container-margin">
      <div className="flex items-center gap-3">
        <Icon name="info" className="text-primary" />
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          {page.title}
        </h1>
      </div>
      <div className="glass-card space-y-4 rounded-xl p-card-padding">
        {page.paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-body-md text-on-surface-variant">
            {paragraph}
          </p>
        ))}
      </div>
      <Link to="/" className="text-label-md text-primary underline">
        Voltar ao catálogo
      </Link>
    </main>
  )
}
