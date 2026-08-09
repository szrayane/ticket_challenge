import { Link, useLocation } from 'react-router-dom'
import { Icon } from '../components/Icon'

const PAGES: Record<
  string,
  { title: string; paragraphs: string[] }
> = {
  sobre: {
    title: 'Sobre nós',
    paragraphs: [
      'A CineRay é uma plataforma de compra de ingressos pensada para uma experiência rápida, visual e segura.',
      'Este projeto é um challenge de front-end com backend local (Express + MySQL), pagamento demonstrativo e reserva de assentos com controle de concorrência.',
    ],
  },
  suporte: {
    title: 'Suporte',
    paragraphs: [
      'Precisa de ajuda com a compra ou com sua conta? Em um ambiente real, você falaria com o atendimento do cinema.',
      'Neste demo, use a área Minha conta para ver QR Codes, cancelar ingressos antes da sessão e atualizar seus dados.',
      'Dúvidas técnicas do challenge: verifique o README do repositório e se o backend em http://localhost:3333 está no ar.',
    ],
  },
  termos: {
    title: 'Termos de uso',
    paragraphs: [
      'Ao usar a CineRay você concorda em utilizar a plataforma apenas para fins de demonstração e estudo.',
      'Os pagamentos são fictícios: nenhum valor real é cobrado e não há processamento com operadoras.',
      'Assentos reservados (hold) expiram automaticamente se a compra não for concluída.',
    ],
  },
  privacidade: {
    title: 'Política de privacidade',
    paragraphs: [
      'Os dados de conta (nome, e-mail, CPF e senha com hash) ficam no MySQL local.',
      'Não enviamos dados pessoais para serviços de marketing. Tokens de sessão ficam no navegador.',
      'Você pode sair da conta a qualquer momento; o banco pode ser resetado recriando o volume Docker do MySQL.',
    ],
  },
  corporativo: {
    title: 'Reservas corporativas',
    paragraphs: [
      'Em um produto real, reservas corporativas cobririam salas inteiras, eventos e faturamento B2B.',
      'Neste challenge o foco é a compra individual com mapa de assentos, conta do cliente e QR Code.',
    ],
  },
}

export function StaticPage() {
  const { pathname } = useLocation()
  const slug = pathname.replace(/^\//, '')
  const page = PAGES[slug]

  if (!page) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-[840px] flex-col items-center justify-center gap-4 px-5">
        <p className="text-body-lg text-primary">Página não encontrada.</p>
        <Link to="/" className="text-label-md underline">
          Voltar
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[840px] px-5 py-section-gap md:px-container-margin">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-label-md text-primary"
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Início
      </Link>
      <h1 className="mb-6 text-headline-lg-mobile text-on-surface md:text-headline-lg">
        {page.title}
      </h1>
      <div className="glass-card space-y-4 rounded-xl p-card-padding">
        {page.paragraphs.map((text) => (
          <p key={text} className="text-body-lg text-on-surface-variant">
            {text}
          </p>
        ))}
      </div>
    </main>
  )
}
