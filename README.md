# CineRay

Plataforma de eventos/ingressos de cinema (React + Vite + Express + SQLite), alinhada ao Desafio Elite Dev.

## Stack

- Front-end: React 19 + TypeScript + Vite + Tailwind
- Back-end: Node.js + Express
- Banco: SQLite (`backend/data/cineray.sqlite`)
- Catálogo externo: [TMDb](https://developer.themoviedb.org/docs)
- Catálogo complementar: Cineflex (Driven)

## Decisões de produto (o que avaliamos como “mão no projeto”)

| Escolha | Por quê |
|--------|---------|
| **Mapa de assentos** (não pista) | Cinema casa melhor com o desafio visual e com concorrência real por lugar. |
| **TMDb como catálogo do organizador** | Atende o requisito de API externa; o organizador monta evento com data, local, capacidade e preço. |
| **Login único + roles** | Menos fricção; o perfil decide `/conta`, `/organizador` ou `/portaria`. |
| **Hold de 10 min + índice único** | Duas pessoas não compram o mesmo assento; o hold trava na seleção, não só no pagamento. |
| **QR com HMAC** | O código não pode ser forjado só inventando um `ID:`; a portaria valida assinatura + payload emitido. |
| **Link `/i/:shareToken`** | Cumpre “compartilhar por link gerado pela aplicação”, além do share nativo. |
| **Sessões próximas na portaria** | Evita check-in na sala errada sem transformar o demo em operação de cinema completa. |
| **Convite staff (`STAFF_INVITE_CODE`)** | Impede qualquer pessoa de se auto-promover a organizador/portaria no cadastro público. |

O que **não** fizemos de propósito: nota fiscal, e-mail de ingresso, app nativo, recuperação de senha (fora do escopo do PDF).

## Como rodar (local)

### 1) Backend

```bash
cd backend
npm install
cp .env.example .env
# TMDB_API_KEY=sua_chave_gratis  (themoviedb.org)
npm run dev
```

API: `http://localhost:3333`

### 2) Frontend

```bash
npm install
cp .env.example .env
npm run dev
```

App: `http://localhost:5173`

### Docker Compose

```bash
export TMDB_API_KEY=sua_chave
docker compose up --build
```

- Web: `http://localhost:8080`
- API: `http://localhost:3333`

### Testes

```bash
cd backend && npm test
```

Cobre assinatura do QR, capacidade de sessão, check-in único e rejeição de QR adulterado.

## Contas de teste (seed)

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Organizador | `organizador@cineray.com` | `org1234` |
| Cliente 1 | `cliente1@cineray.com` | `cli1234` |
| Cliente 2 | `cliente2@cineray.com` | `cli1234` |
| Portaria | `portaria@cineray.com` | `porta1234` |

Evento seed: **Duna: Parte Dois** (TMDb) com sessão, capacidade e preço.

Cadastro de equipe: `/login` → **Sou da equipe** + `STAFF_INVITE_CODE` (default `cineray-staff`).

## Fluxo para avaliar

1. Login único (`/login`)
2. Organizador publica pela TMDb (ou use o seed)
3. Cliente busca/filtra, escolhe assento (mapa **ao vivo** a cada 2,5s), paga (ok/recusa)
4. Meus ingressos → QR + **Copiar link**
5. Portaria valida câmera/código

## Deploy (+1 ponto)

Guia passo a passo em [`DEPLOY.md`](./DEPLOY.md).

Recomendado:

1. **API no Render** (disco em `backend/data`)
2. **Front na Vercel** com `VITE_APP_API_URL=https://sua-api.onrender.com/api`

## Variáveis

### Backend

- `PORT`, `STAFF_INVITE_CODE`, `TICKET_QR_SECRET`
- `TMDB_API_KEY` — [criar chave](https://www.themoviedb.org/settings/api)

### Frontend

- `VITE_APP_API_URL`, `VITE_CINEMA_API_URL`

## Uso de IA

Ver [`AI.md`](./AI.md).

## Observações / limitações

- Pagamento é fictício.
- Sem `TMDB_API_KEY`, o seed ainda permite o fluxo; publicar novos títulos pela busca TMDb exige a chave.
- SQLite em PaaS free precisa de **disco persistente**; senão o banco pode resetar no redeploy.
