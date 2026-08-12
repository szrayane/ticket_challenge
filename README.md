<a id="topo"></a>

<div align="center">
  <a href="https://ticket-challenge.vercel.app" target="_blank" rel="noopener noreferrer">
    <img src="./frontend/public/cineray-logo.png" alt="CineRay — abrir app" width="280">
  </a>

  <h3>CineRay · Desafio Elite Dev 2026</h3>

  <p>
    Organizador publica · cliente escolhe assento · pagamento simulado · QR · portaria valida
  </p>

  <p>
    <strong>App no ar</strong> — clique para abrir:
    <a href="https://ticket-challenge.vercel.app">
      <strong>ticket-challenge.vercel.app</strong>
    </a>
  </p>

  <p>
    <a href="https://cineray-api.fly.dev/health">API</a>
    ·
    <a href="https://www.figma.com/design/3Q8k3j0O6EzRdbkk539TpW/CineRay?node-id=0-1&t=3o5hq3ir8vXKL1jY-1">Figma</a>
    ·
    <a href="./DEPLOY.md">Deploy</a>
    ·
    <a href="./AI.md">Uso de IA</a>
  </p>
</div>

---

## Diferenciais

<div align="center">
  <video
    src="https://github.com/user-attachments/assets/f69a0cb8-6f47-4e2e-8d1e-d687b45322e0"
    width="180"
    controls
    playsinline
  ></video>

  <p>
    <em>4 diferenciais do CineRay em ~1 min</em>
  </p>
</div>

---

## Sumário

- [Diferenciais](#diferenciais)
- [Sobre](#sobre)
- [Telas](#telas)
- [Tecnologias](#tecnologias)
- [Rodando local](#rodando-local)
- [Contas de teste](#contas-de-teste)
- [Fluxo rápido](#fluxo-rápido)
- [Decisões](#decisões)
- [Uso de IA](#uso-de-ia)
- [Estrutura](#estrutura)
- [Limitações](#limitações)
- [Contato](#contato)

---

## Sobre

Sistema de venda e validação de ingressos de cinema (React + Express + MySQL).

1. O **organizador** busca o filme (TMDb) e cria a sessão
2. O **cliente** escolhe o assento (hold de 10 min), paga (simulado) e recebe um QR cifrado
3. A **portaria** valida por câmera ou código, na sessão correta

Optei por **mapa de assentos** (não pista): faz mais sentido pra cinema e força concorrência real por lugar.

| Camada | Onde | Região | URL |
|--------|------|--------|-----|
| Front | Vercel | `gru1` | [ticket-challenge.vercel.app](https://ticket-challenge.vercel.app) |
| API | Fly.io | `gru` | [cineray-api.fly.dev](https://cineray-api.fly.dev) |
| Banco | Fly MySQL | `gru` | rede interna |

### O que tem

- Catálogo com TMDb
- Hold de assento (10 min) + check-in na portaria
- QR AES-256-GCM (`CR2.…`)
- Link compartilhado `/i/:shareToken`
- Papéis: cliente, organizador, portaria
- Assentos ao vivo, transferência de ingresso, chatbot (Groq), Google Wallet
- Docker Compose + CI/CD (GitHub Actions)

Design: [Figma — CineRay](https://www.figma.com/design/3Q8k3j0O6EzRdbkk539TpW/CineRay?node-id=0-1&t=3o5hq3ir8vXKL1jY-1)

---

## Telas

#### Home

<p align="center">
  <img src="./docs/screenshots/01-home.png" alt="Home CineRay" width="820">
</p>

#### Login

<p align="center">
  <img src="./docs/screenshots/02-login.png" alt="Login" width="820">
</p>

#### Portaria

<p align="center">
  <img src="./docs/screenshots/04-validar-ingresso.png" alt="Validar ingresso" width="820">
</p>

---

## Tecnologias

<p align="center">
  <img src="https://img.shields.io/badge/React_19-20232a?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">

  <br>

  <img src="https://img.shields.io/badge/Node.js_22+-6DA55F?style=for-the-badge&logo=node.js&logoColor=white" alt="Node">
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MySQL_8-4479A1?style=for-the-badge&logo=mysql&logoColor=white" alt="MySQL">
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
</p>

Extras: TMDb · Groq · Google Wallet · Vercel · Fly.io

---

## Rodando local

**Pré-requisitos:** Node.js 22+, MySQL 8 (ou Docker), chave [TMDb](https://developer.themoviedb.org/reference/intro/getting-started) (só obrigatória pra publicar títulos novos; o seed roda sem ela).

```sh
git clone https://github.com/szrayane/ticket_challenge.git
cd ticket_challenge
```

### Opção A — Docker

1. Crie `backend/.env` a partir do exemplo e preencha MySQL, QR e TMDb (veja abaixo).
2. Se for usar o MySQL do Compose, os valores de `MYSQL_*` no `.env` precisam bater com o `docker-compose.yml`.
3. Suba:

```bash
docker compose up --build
```

- Front: [http://localhost:8080](http://localhost:8080)
- API: [http://localhost:3333](http://localhost:3333)

### Opção B — Front + API + MySQL

**1) Banco**

Crie um banco MySQL 8 e anote usuário, senha e nome do database. Ou suba só o serviço do Compose e alinhe o `.env` com ele:

```bash
docker compose up -d mysql
```

**2) Backend**

```bash
cd backend
npm install
cp .env.example .env
# preencha as variáveis abaixo
npm run migrate
npm run dev
```

API: [http://localhost:3333](http://localhost:3333)

**3) Frontend**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App: [http://localhost:5173](http://localhost:5173)

Na raiz (depois de `npm run install:all`):

```bash
npm run dev:backend
npm run dev:frontend
```

### Variáveis

`backend/.env` — **preencha com os seus dados** (não versionar secrets):

```env
PORT=3333
NODE_ENV=development
STAFF_INVITE_CODE=seu_codigo_staff
TICKET_QR_SECRET=sua_chave_secreta_do_qr
TMDB_API_KEY=sua_chave_tmdb
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=seu_usuario
MYSQL_PASSWORD=sua_senha
MYSQL_DATABASE=seu_banco
APP_PUBLIC_URL=http://localhost:5173
# GROQ_API_KEY=  (opcional — chatbot)
# DISABLE_SEED=1
```

`TICKET_QR_SECRET` é obrigatório. Sem ele a API não sobe.

`frontend/.env`:

```env
VITE_APP_API_URL=http://localhost:3333/api
```

### Testes

```bash
cd backend
npm run test:unit
npm test
```

---

## Contas de teste

| Perfil | E-mail | Senha |
|--------|--------|-------|
| Cliente 1 | `cliente1@cineray.com` | `cineray` |
| Cliente 2 | `cliente2@cineray.com` | `cineray` |
| Organizador | `organizador@cineray.com` | `cineray` |
| Portaria | `portaria@cineray.com` | `cineray` |

No login tem um seletor com essas contas.

Staff novo: **Criar conta** → **Sou da equipe** → código do `STAFF_INVITE_CODE`.

Cartão demo: `4111 1111 1111 1111` (ok) · `4000 0000 0000 0002` (recusa).

---

## Fluxo rápido

1. Login como organizador (ou use o seed)
2. Publique um filme via TMDb (opcional)
3. Cliente → assento → pagamento
4. Meus ingressos → QR ou link `/i/...`
5. Portaria → valide pela câmera ou código

---

## Decisões

- **Mapa de assentos** — concorrência real por lugar
- **Hold 10 min + `SELECT … FOR UPDATE`** — trava na seleção; MySQL serializa a compra
- **QR AES-256-GCM** — payload `CR2.…` ilegível sem o secret
- **Assentos ao vivo** — o mapa atualiza enquanto outras pessoas compram
- **Staff com convite** — organizador/portaria só com código
- **IA** — usei Cursor para acelerar o desenvolvimento; as escolhas e validações foram minhas → [`AI.md`](./AI.md)

---

## Uso de IA

### IA utilizada no desenvolvimento

Usei o Cursor como apoio durante o desenvolvimento, principalmente para ganhar tempo na implementação, investigar erros, testar algumas soluções e revisar código.

Ele me ajudou em partes como:

- Express e MySQL
- holds de assentos
- integração com TMDb
- QR Code com AES-256-GCM
- fluxo da portaria
- Docker

As principais decisões do projeto vieram do enunciado e da forma como eu escolhi resolver cada problema, como:

- mapa de assentos
- login com papéis e convite para Staff
- hold de 10 minutos com `SELECT ... FOR UPDATE`
- QR Code com AES-256-GCM e `TICKET_QR_SECRET` obrigatório
- TMDb como única API externa
- compartilhamento por `/i/:shareToken`
- validação da sessão e check-in único na portaria
- Docker Compose com MySQL, API e frontend

Também usei IA durante o desenvolvimento para investigar e corrigir problemas que apareceram, principalmente na API, seed, credenciais, chave do TMDb e na migração de SQLite para MySQL.

Eu revisei e testei as sugestões antes de usar no projeto, adaptando o que fosse necessário para o funcionamento do CineRay.

### IA no produto

O CineRay também possui um assistente para clientes, integrado a um modelo de linguagem e a ferramentas do próprio backend.

Ele pode ajudar com filmes, sessões, assentos, ingressos e algumas ações do usuário.

A IA não acessa diretamente o banco de dados. Quando precisa realizar alguma ação, ela utiliza ferramentas controladas pelo backend, que aplicam as regras e validações do sistema antes da operação.

---

## Estrutura

```text
ticket_challenge/
├── backend/              # Express + MySQL
│   ├── migrations/
│   └── src/
├── frontend/             # React (Vite)
├── docs/screenshots/     # prints do README
├── .github/workflows/    # CI/CD
├── docker-compose.yml
├── deploy/fly-mysql/
├── DEPLOY.md
├── AI.md
└── README.md
```

---

## Limitações

- Pagamento é simulado
- Sem `TMDB_API_KEY` o seed roda; publicar pela busca TMDb precisa da chave
- Única API externa obrigatória do catálogo: TMDb

Deploy detalhado: [`DEPLOY.md`](./DEPLOY.md)

---

## Contato

**Rayane Souza** — [GitHub](https://github.com/szrayane)

[szrayane/ticket_challenge](https://github.com/szrayane/ticket_challenge)

<p align="right"><a href="#topo">topo</a></p>
