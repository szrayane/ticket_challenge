# CineRay

Plataforma de venda de tickets de cinema em React + Vite, com design system dark + rose (glassmorphism).

## Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- React Router 7
- Backend Express + SQLite (`node:sqlite`)

## Como rodar

### Frontend

```bash
npm install
cp .env.example .env
npm run dev
```

### Backend (auth + tickets no banco)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

API local: `http://localhost:3333`

No `.env` do frontend:

```bash
VITE_CINEMA_API_URL=https://mock-api.driven.com.br/api/v8/cineflex
VITE_APP_API_URL=http://localhost:3333/api
```

## API

### Cineflex (Driven) — catálogo / assentos

- `GET /movies` — catálogo
- `GET /movies/:id/showtimes` — sessões do filme
- `GET /showtimes/:id/seats` — mapa de assentos
- `POST /seats/book-many` — reserva de assentos (mock compartilhada)

### Backend local — conta, holds e ingressos

- `POST /api/auth/register` — cadastro (sempre **cliente**)
- `POST /api/auth/staff/register` — cadastro de equipe (organizador/portaria + código de convite)
- `POST /api/auth/login` — login
- `GET /api/auth/me` — usuário logado
- `PATCH /api/auth/profile` — nome/CPF
- `POST /api/auth/password` — trocar senha
- `GET /api/movies` — filmes locais ativos (público)
- `GET /api/movies/admin` — todos os filmes locais, incl. inativos (organizador)
- `GET /api/movies/report` — relatório de ocupação/receita (organizador)
- `POST /api/movies` — criar filme (organizador)
- `PATCH /api/movies/:id` — editar filme (organizador)
- `POST /api/movies/:id/active` — ativar/desativar catálogo (organizador)
- `DELETE /api/movies/:id` — remover filme (bloqueado se houver ingressos ativos)
- `GET /api/movies/:id/showtimes` — sessões do filme local
- `POST /api/movies/:id/showtimes` — criar sessão (organizador)
- `PATCH /api/showtimes/:id` — editar sessão (organizador)
- `POST /api/showtimes/:id/duplicate` — duplicar sessão (organizador)
- `GET /api/showtimes/:id/occupancy` — ocupação/receita da sessão (organizador)
- `GET /api/showtimes/:id/seats` — mapa de assentos local
- `DELETE /api/showtimes/:id` — remover sessão (bloqueado se houver ingressos ativos)
- `GET /api/tickets` — ingressos da conta
- `POST /api/tickets` — salva ingressos após pagamento (`orderId` + `holderKey`)
- `POST /api/tickets/:id/cancel` — cancela ingresso (antes da sessão; libera o assento)
- `POST /api/tickets/validate` — portaria valida QR / check-in (`expectedSessionId`, `force`)
- `GET /api/tickets/gate/sessions` — sessões com ingressos ativos (portaria)
- `GET /api/tickets/gate/checkins` — últimos check-ins (portaria)
- `GET /api/seats/occupied/:sessionId` — assentos vendidos + em hold
- `POST /api/seats/hold` — trava assento na seleção (~10 min)
- `POST /api/seats/release` — libera hold
- `POST /api/seats/refresh` — renova hold
- `POST /api/seats/check` — confere disponibilidade antes do pagamento

Banco SQLite em `backend/data/cineray.sqlite`.

## Fluxo

1. **Login único** (`/login`) — cliente, organizador e portaria; cadastro de equipe com convite
2. **Home** (`/`) — hero + filmes (Cineflex + filmes locais ativos)
3. **Filme** (`/filme/:id`) — sinopse, trailer e sessões
4. **Assentos** (`/seats/:movieId`) — hold no clique + timer de 10 min
5. **Checkout** (`/checkout`) — pagamento demo + pedido (`orderId`)
6. **Sucesso** (`/success`) — recibo + QR Codes
7. **Conta** (`/conta`) — ingressos do cliente
8. **Organizador** (`/organizador`) — abas Filmes | Sessões | Relatórios
9. **Portaria** (`/portaria`) — câmera/colar QR, sessões próximas por horário, histórico de check-ins

## Contas e perfis

Cadastro em `/login` cria perfil **cliente** por padrão. Marque **Sou da equipe** para criar organizador/portaria com o código `STAFF_INVITE_CODE` do backend.

`/staff/login` redireciona para `/login`.

## Painel do organizador

- Pré-visualização de poster + galeria rápida
- Date/time pickers nativos
- Ocupação por sessão (vendidos / hold / livres / receita)
- Editar e duplicar sessões
- Desativar filme sem apagar (some do catálogo público)
- Exclusão bloqueada quando há ingressos ativos
- Relatório agregado por sessão

## Observações

- O pagamento é **fictício** (demo local). Cancelar ingresso libera o assento, mas não há estorno real.
- A concorrência de assentos é garantida por **hold na seleção** + índice único `(session_id, seat_id)` nos ingressos ativos.
- Filmes criados pelo organizador entram no catálogo com mapa de assentos local (50 lugares).
- A portaria valida o payload do QR (`CINERAY-TICKET|ID:...`) e marca check-in único.
