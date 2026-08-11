<a id="readme-top"></a>

<br />
<div align="center">
  <a href="https://github.com/szrayane/ticket_challenge">
    <img src="./frontend/public/cineray-logo.png" alt="CineRay" width="320">
  </a>

  <h3 align="center">Desafio Elite Dev 2026</h3>

> [!IMPORTANT]
> Se a API estiver em hospedagem gratuita (ex.: Render), o primeiro acesso pode demorar alguns segundos (“cold start”). Se a página não carregar, aguarde e atualize.

  <p align="center">
    Organizador publica → cliente escolhe assento → pagamento simulado → QR → portaria valida.
    <br />
    <a href="./DEPLOY.md">Deploy</a>
    ·
    <a href="./AI.md">Uso de IA</a>
    ·
    <a href="https://github.com/szrayane/ticket_challenge/issues">Issues</a>
  </p>
</div>

<details>
  <summary>Sumário</summary>
  <ol>
    <li>
      <a href="#sobre-o-projeto">Sobre o Projeto</a>
      <ul>
        <li><a href="#hospedagem">Hospedagem</a></li>
        <li><a href="#funcionalidades">Funcionalidades</a></li>
        <li><a href="#feito-com">Tecnologias</a></li>
      </ul>
    </li>
    <li>
      <a href="#começando">Começando</a>
      <ul>
        <li><a href="#pré-requisitos">Pré-requisitos</a></li>
        <li><a href="#instalação">Instalação</a></li>
        <li><a href="#contas-de-teste">Contas de teste</a></li>
      </ul>
    </li>
    <li><a href="#tutorial-do-sistema">Tutorial</a></li>
    <li><a href="#design--prototipagem">Design</a></li>
    <li><a href="#decisões-técnicas">Decisões técnicas</a></li>
    <li><a href="#a-fazer">Limitações</a></li>
    <li><a href="#licença">Licença</a></li>
    <li><a href="#contato">Contato</a></li>
  </ol>
</details>

## Sobre o Projeto

<div id="sobre-o-projeto"></div>

<p align="center">
  <img src="./docs/screenshots/01-home.png" alt="Tela inicial do CineRay" width="820">
</p>

Implementação do **Desafio Elite Dev 2026**: venda e validação de ingressos de cinema (React + Express + MySQL).

Fluxo:

1. O **organizador** busca o filme (TMDb) e cria a sessão (data, local, capacidade, preço)
2. O **cliente** escolhe o assento (hold de 10 min), paga (simulado) e recebe um QR cifrado
3. A **portaria** valida o ingresso por câmera ou código, na sessão correta

Optei por **mapa de assentos** (não pista) porque faz mais sentido pra cinema e força concorrência real por lugar. Backend separado do front pra deixar a API, o MySQL e o check-in explícitos.

### Hospedagem

<div id="hospedagem"></div>

| Camada | Onde | URL |
|--------|------|-----|
| Frontend | [Vercel](https://vercel.com) | [ticket-challenge-qpel.vercel.app](https://ticket-challenge-qpel.vercel.app) |
| API | [Render](https://render.com) | [cinerar-api.onrender.com](https://cinerar-api.onrender.com) |
| Banco | [Aiven](https://aiven.io) MySQL | — |

> [!IMPORTANT]
> Em plano gratuito, a API no Render pode “acordar” lentamente. Se falhar no primeiro request, espere ~30s e tente de novo.

Health check: [https://cinerar-api.onrender.com/health](https://cinerar-api.onrender.com/health)

<div id="funcionalidades"></div>

### Funcionalidades

**Fluxo do desafio**

- Catálogo / eventos com integração **TMDb**
- Mapa de assentos com **hold de 10 minutos**
- Checkout com pagamento **simulado**
- Ingresso com **QR AES-256-GCM** (`CR2.…`)
- Compartilhamento por link `/i/:shareToken`
- **Portaria**: câmera ou digitação (bloqueia inválido, adulterado, já usado e sessão errada)
- Papéis: cliente, organizador e portaria (staff via convite)

**Extras**

- Transferência / reivindicação de ingresso
- Link do ingresso com QR
- Assentos ao vivo (mapa atualiza enquanto outras pessoas compram)
- Docker Compose (MySQL + API + front)
- Testes unitários no backend + CI/CD no GitHub Actions

<div id="feito-com"></div>

### Tecnologias

**Frontend**

- ![React](https://img.shields.io/badge/React_19-20232a?style=for-the-badge&logo=react&logoColor=61DAFB)
- ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
- ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
- ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

**Backend**

- ![NodeJS](https://img.shields.io/badge/Node.js_22+-6DA55F?style=for-the-badge&logo=node.js&logoColor=white)
- ![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
- ![MySQL](https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
- ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

**Extras**

- TMDb API · QR AES-256-GCM

MySQL com `SELECT … FOR UPDATE` no hold/checkout e índice único em `active_slot` pra não vender o mesmo assento duas vezes.

## Começando

<div id="começando"></div>

Você pode rodar tudo localmente ou acessar o deploy:

- Front: [https://ticket-challenge-qpel.vercel.app](https://ticket-challenge-qpel.vercel.app)
- API: [https://cinerar-api.onrender.com](https://cinerar-api.onrender.com)

Passo a passo de deploy: [`DEPLOY.md`](./DEPLOY.md).

### Pré-requisitos

<div id="pré-requisitos"></div>

- Node.js **22+**
- MySQL **8** (ou Docker)
- Chave TMDb (gratuita) — obrigatória só para publicar títulos novos; o seed roda sem ela

```sh
node -v
npm -v
```

Chave TMDb: [developer.themoviedb.org](https://developer.themoviedb.org/reference/intro/getting-started)

### Instalação

<div id="instalação"></div>

1. Clone o repositório:

```sh
git clone https://github.com/szrayane/ticket_challenge.git
cd ticket_challenge
```

#### Opção A — Docker (tudo junto)

```bash
export TMDB_API_KEY=sua_chave
docker compose up --build
```

- Front: http://localhost:8080  
- API: http://localhost:3333  
- MySQL: localhost:3306 (user/senha `cineray`)

#### Opção B — Local (front + API + MySQL)

**1) MySQL**

```bash
docker compose up -d mysql
```

**2) Backend**

```bash
cd backend
npm install
cp .env.example .env
# edite TMDB_API_KEY e TICKET_QR_SECRET se quiser
npm run migrate   # aplica schema (também roda no boot via initDb)
npm run dev
```

API: http://localhost:3333

Schema versionado em `backend/migrations/` (Knex). O `initDb` só conecta, aplica migrations pendentes e faz seed demo (desligue com `DISABLE_SEED=1`).

**3) Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: http://localhost:5173

Atalhos na raiz (depois de `npm run install:all`):

```bash
npm run dev:backend
npm run dev:frontend
```

#### Variáveis principais

Backend (`backend/.env`):

```env
PORT=3333
NODE_ENV=development
STAFF_INVITE_CODE=cineray-staff
TICKET_QR_SECRET=sua_chave_secreta
TMDB_API_KEY=sua_chave_tmdb
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=cineray
MYSQL_PASSWORD=cineray
MYSQL_DATABASE=cineray
# DISABLE_SEED=1
```

Front (`frontend/.env`):

```env
VITE_APP_API_URL=http://localhost:3333/api
```

Não versionar `.env` com secrets reais. `TICKET_QR_SECRET` é **obrigatório** (sem fallback no código).

#### Testes

```bash
cd backend
npm run test:unit   # unitários (sem DB)
npm test            # unitários + QR + fluxo de ingressos

# Na raiz ou em frontend/ (API + Vite no ar):
npm run test:e2e:purchase
```

### Contas de teste

<div id="contas-de-teste"></div>

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Organizador | `organizador@cineray.com` | `cineray` |
| Cliente 1 | `cliente1@cineray.com` | `cineray` |
| Cliente 2 | `cliente2@cineray.com` | `cineray` |
| Portaria | `portaria@cineray.com` | `cineray` |

Todas as contas de teste usam a **mesma senha** (`cineray`). No login há um seletor de e-mails.

Evento seed: **Duna: Parte Dois**.

Staff novo: `/login` → **Criar conta** → **Sou da equipe** → código `cineray-staff`.

Pagamento demo: `4111 1111 1111 1111` (ok) / `4000 0000 0000 0002` (recusa).

## Tutorial do Sistema

<div id="tutorial-do-sistema"></div>

### Vídeo

<!-- Cole o link user-attachments do .mp4 (issue do GitHub) numa linha sozinha abaixo. -->

### Design / Prototipagem

<div id="design--prototipagem"></div>

- [Figma — CineRay](https://www.figma.com/design/3Q8k3j0O6EzRdbkk539TpW/CineRay?node-id=0-1&t=nl4ZuD7wMNB9QiCm-1)

### Telas

Prints em `docs/screenshots/`:

| Arquivo | Tela |
|---------|------|
| `01-home.png` | Home / catálogo |
| `02-login.png` | Login |
| `04-validar-ingresso.png` | Portaria |

#### Home

<p align="center">
  <img src="./docs/screenshots/01-home.png" alt="Tela inicial — catálogo CineRay" width="820">
</p>

#### Login

<p align="center">
  <img src="./docs/screenshots/02-login.png" alt="Tela de login" width="820">
</p>

#### Validar ingresso

<p align="center">
  <img src="./docs/screenshots/04-validar-ingresso.png" alt="Validação de ingresso na portaria" width="820">
</p>

### Fluxo rápido

1. Login como organizador (ou use o seed)
2. Publique um filme via TMDb (opcional)
3. Login como cliente → assento → pagamento
4. Meus ingressos → QR ou link `/i/...`
5. Login portaria → valide pela câmera ou código

## Decisões Técnicas

<div id="decisões-técnicas"></div>

- **Mapa de assentos** — concorrência real por lugar (não pista)
- **Hold 10 min + `SELECT … FOR UPDATE`** — trava na seleção; MySQL serializa a compra
- **QR AES-256-GCM** — payload `CR2.…` ilegível sem `TICKET_QR_SECRET`
- **Assentos ao vivo** — mapa atualiza enquanto outras pessoas compram
- **Staff com convite** — organizador/portaria só via `STAFF_INVITE_CODE`
- **IA** — Cursor pra acelerar; decisões e validação foram minhas → [`AI.md`](./AI.md)

### Estrutura

```text
ticket_challenge/
├── backend/           # API Express + MySQL + testes
│   ├── migrations/    # schema Knex (fonte da verdade das tabelas)
│   └── src/db/        # conexão, migrate, seed
├── frontend/          # React (Vite) + e2e + Docker do front
├── docs/              # screenshots do README
├── .github/workflows/ # CI/CD
├── docker-compose.yml # MySQL + API + front
├── render.yaml        # blueprint Render (API)
├── package.json       # atalhos do monorepo
├── DEPLOY.md
├── AI.md
└── README.md
```

## Limitações

<div id="a-fazer"></div>

- [x] Fluxo cliente (assentos, hold, checkout, QR)
- [x] Organizador + TMDb
- [x] Portaria (câmera / código)
- [x] MySQL + concorrência (`FOR UPDATE`)
- [x] Deploy (Vercel + Render + Aiven)
- [ ] Vídeo de demonstração no README
- [x] Screenshots (home, login, validar)
- [x] URLs de produção

**Fora de escopo**

- Pagamento fictício
- Sem `TMDB_API_KEY`, o seed roda; publicar pela busca TMDb precisa da chave
- Única API externa: TMDb (imagens/CDN do próprio TMDb no catálogo)

## Licença

<div id="licença"></div>

Projeto pro Desafio Elite Dev 2026.

## Contato

<div id="contato"></div>

**Rayane Souza** — [GitHub](https://github.com/szrayane)

Link do projeto: [https://github.com/szrayane/ticket_challenge](https://github.com/szrayane/ticket_challenge)

<p align="right">(<a href="#readme-top">voltar ao topo</a>)</p>
