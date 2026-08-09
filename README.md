# CineRay

Plataforma de ingressos de cinema para o Desafio Elite Dev 2026.

Fluxo: organizador publica evento → cliente escolhe assento → pagamento simulado → QR → portaria valida.

## Stack

- Front: React 19, TypeScript, Vite, Tailwind
- Back: Node.js 22+ (`node:sqlite`), Express, JavaScript
- Banco: SQLite (`backend/data/cineray.sqlite`)
- Extra: TMDb, Docker Compose, QR com HMAC, testes no backend

## Decisões

**Mapa de assentos** (não pista) — faz mais sentido para cinema e força concorrência real por lugar.

**TMDb** — o organizador busca o filme e monta a sessão (data, local, capacidade, preço).

**Hold de 10 min + índice único** — o assento trava na seleção; o banco impede venda duplicada.

**Assentos ao vivo** — o mapa atualiza a cada poucos segundos enquanto outras pessoas compram.

**QR com HMAC** — o código não vale se for inventado ou adulterado.

**Link `/i/:shareToken`** — compartilhamento gerado pela app (além do share nativo).

**Portaria** — câmera ou digitação; bloqueia inválido, adulterado, já usado e sessão errada (sala/horário).

**Staff com convite** — organizador/portaria só via `STAFF_INVITE_CODE` (não no cadastro público).

## Papéis

**Cliente** — busca, assentos, hold, pagamento, meus ingressos, QR, link, cancelamento antes da sessão.

**Organizador** — busca TMDb, cria/gerencia eventos e sessões (data, local, capacidade, preço).

**Portaria** — sessões próximas, valida QR (câmera ou manual).

## Como rodar

Precisa de Node.js 22+. Chave TMDb só é obrigatória para publicar títulos novos (o seed funciona sem ela).

### Backend

```bash
cd backend
npm install
cp .env.example .env
# TMDB_API_KEY=sua_chave
npm run dev
```

API: `http://localhost:3333`

### Front

```bash
npm install
cp .env.example .env
npm run dev
```

App: `http://localhost:5173`

### Docker

```bash
export TMDB_API_KEY=sua_chave
docker compose up --build
```

- Front: `http://localhost:8080`
- API: `http://localhost:3333`

### Testes

```bash
cd backend
npm test
```

Cobre assinatura/adulteração do QR, sessão com capacidade/mapa, check-in e reuso.

## Contas de teste

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Organizador | `organizador@cineray.com` | `org1234` |
| Cliente 1 | `cliente1@cineray.com` | `cli1234` |
| Cliente 2 | `cliente2@cineray.com` | `cli1234` |
| Portaria | `portaria@cineray.com` | `porta1234` |

Evento seed: **Duna: Parte Dois**.

Staff: `/login` → **Criar conta** → **Sou da equipe** → código `cineray-staff`.

## Fluxo para avaliar

1. Login como organizador (ou use o seed)
2. Publique um filme via TMDb (opcional)
3. Login como cliente → escolha assento → pague
4. Meus ingressos → QR ou copiar link
5. Login portaria → valide pela câmera ou código

Pagamento demo: `4111 1111 1111 1111` (ok) / `4000 0000 0000 0002` (recusa).

## Variáveis

Backend (`.env`):

```env
PORT=3333
NODE_ENV=development
STAFF_INVITE_CODE=cineray-staff
TICKET_QR_SECRET=sua_chave_secreta
TMDB_API_KEY=sua_chave_tmdb
```

Front (`.env`):

```env
VITE_APP_API_URL=http://localhost:3333/api
VITE_CINEMA_API_URL=https://mock-api.driven.com.br/api/v8/cineflex
```

Não versionar `.env` com secrets reais.

## Deploy

Guia em [`DEPLOY.md`](./DEPLOY.md). Sugestão: API no Render (com disco em `backend/data`) + front na Vercel (`VITE_APP_API_URL` apontando para a API).

## Uso de IA

Usei Cursor para acelerar implementação e debug. As decisões (mapa, hold, HMAC, link, staff, portaria) e a validação do fluxo foram minhas. Detalhes em [`AI.md`](./AI.md).

## Limitações

- Pagamento fictício
- Sem `TMDB_API_KEY`, o seed ainda roda; publicar pela busca TMDb precisa da chave
- Home também pode listar o mock Cineflex (Driven), além do catálogo local/TMDb
- SQLite em PaaS free precisa de disco persistente
- Fora do escopo: nota fiscal, e-mail de ingresso, app nativo, recuperação de senha

## Estrutura

```text
ticket_challenge/
├── backend/          # API Express + SQLite + testes
├── src/              # React (Vite)
├── public/
├── docker-compose.yml
├── DEPLOY.md
├── AI.md
└── README.md
```
