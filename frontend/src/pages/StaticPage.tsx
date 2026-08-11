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
      'Assentos ficam reservados por 10 minutos durante a compra. Na entrada, o QR é validado pela portaria.',
    ],
  },
  suporte: {
    title: 'Suporte',
    paragraphs: [
      'Dúvidas sobre compra ou conta: em Minha conta você vê os QR Codes e pode cancelar antes da sessão.',
      'Se algo não carregar, atualize a página e tente de novo em alguns segundos.',
    ],
  },
  termos: {
    title: 'Termos de uso',
    paragraphs: [
      'Ao usar a CineRay, você concorda em concluir a compra dentro do tempo de reserva do assento.',
      'Assentos não pagos voltam ao mapa quando o hold expira.',
      'Cancelamentos antes do início da sessão liberam o lugar para outras pessoas.',
    ],
  },
  privacidade: {
    title: 'Política de privacidade',
    paragraphs: [
      'Guardamos nome, e-mail, CPF e senha (com hash) para operar a conta e os ingressos.',
      'Não enviamos dados para marketing. O token de sessão fica no seu navegador.',
      'Você pode sair da conta a qualquer momento.',
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
