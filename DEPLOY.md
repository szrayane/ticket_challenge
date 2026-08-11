# Deploy CineRay (Vercel + Fly.io)

Objetivo: front na **Vercel** (São Paulo / `gru1`) e API + MySQL no **Fly.io** (São Paulo / `gru`).

URLs de produção:

| Camada | URL |
|--------|-----|
| Front | https://ticket-challenge.vercel.app |
| API | https://cineray-api.fly.dev |
| Health | https://cineray-api.fly.dev/health |

## 1) MySQL no Fly (`cineray-mysql`)

Região: **`gru`** (São Paulo). Config: `deploy/fly-mysql/fly.toml`.

```bash
cd deploy/fly-mysql
fly apps create cineray-mysql
fly volumes create mysqldata --size 3 --region gru -a cineray-mysql -y

MYSQL_PASSWORD=$(openssl rand -hex 24)
MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
# guarde as senhas — o Fly não mostra de novo
fly secrets set MYSQL_PASSWORD="$MYSQL_PASSWORD" MYSQL_ROOT_PASSWORD="$MYSQL_ROOT_PASSWORD" -a cineray-mysql

fly deploy -a cineray-mysql
fly status -a cineray-mysql
```

Host interno para a API: `cineray-mysql.internal` (porta `3306`).

## 2) API no Fly (`cineray-api`)

Região: **`gru`**. Config: `backend/fly.toml` + `backend/Dockerfile`.

```bash
cd backend
fly apps create cineray-api

# um secret por comando evita quebrar com \
fly secrets set MYSQL_PASSWORD='SENHA_DO_MYSQL_ACIMA' -a cineray-api
fly secrets set TICKET_QR_SECRET="$(openssl rand -hex 32)" -a cineray-api
fly secrets set STAFF_INVITE_CODE="$(openssl rand -hex 12)" -a cineray-api   # não use cineray-staff em prod
fly secrets set TMDB_API_KEY='SUA_CHAVE' -a cineray-api
fly secrets set GROQ_API_KEY='SUA_CHAVE' -a cineray-api   # opcional (chat)
fly secrets set APP_PUBLIC_URL='https://ticket-challenge.vercel.app' -a cineray-api

fly deploy -a cineray-api
curl https://cineray-api.fly.dev/health   # → {"status":"ok"}
```

Variáveis não secretas já estão no `fly.toml`: `MYSQL_HOST=cineray-mysql.internal`, user/db `cineray`, `PORT=3333`, `NODE_ENV=production`.

Opcional Google Wallet: ver `backend/.env.example` e `fly secrets set …`.

## 3) Front na Vercel

1. [vercel.com](https://vercel.com) → Import do GitHub
2. Framework: Vite; Root Directory: `.` (usa `vercel.json` na raiz)
3. Região: **São Paulo (`gru1`)** — já em `vercel.json` (`"regions": ["gru1"]`) ou Settings → Functions
4. Env:
   - `VITE_APP_API_URL=https://cineray-api.fly.dev/api`
5. Deploy (e **Redeploy** depois de mudar `VITE_*`)

Depois do primeiro deploy, confira no Fly:

```bash
fly secrets set APP_PUBLIC_URL='https://ticket-challenge.vercel.app' -a cineray-api
```

No formulário Elite Dev, cole:

- Front: `https://ticket-challenge.vercel.app`
- API: `https://cineray-api.fly.dev`
- Como rodar local: ver README

## 4) Local vs produção

| Variável | Local (`backend/.env` / `frontend/.env`) | Produção |
|----------|------------------------------------------|----------|
| `APP_PUBLIC_URL` | `http://localhost:5173` | `https://ticket-challenge.vercel.app` |
| `VITE_APP_API_URL` | `/api` (proxy Vite) | `https://cineray-api.fly.dev/api` |
| `MYSQL_HOST` | `127.0.0.1` | `cineray-mysql.internal` |
| `TICKET_QR_SECRET` | valor longo no `.env` | aleatório forte (obrigatório) |
| `STAFF_INVITE_CODE` | `cineray-staff` (dev) | valor forte (não use o default) |

## 5) Checklist pós-deploy

- [ ] Login com `cliente1@cineray.com` / `cineray`
- [ ] Ver evento seed na home
- [ ] Comprar assento e abrir QR (`CR2.…` cifrado)
- [ ] Abrir link `/i/...`
- [ ] Transferir ingresso e reivindicar em outra conta
- [ ] Login portaria e validar QR
- [ ] Organizador com `TMDB_API_KEY` busca/publica filme
- [ ] Network do browser aponta para `cineray-api.fly.dev`

## Alternativa tudo-em-um (local)

```bash
docker compose up --build
```

Sobe MySQL + API + front (ver README).
