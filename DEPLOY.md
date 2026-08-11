# Deploy CineRay (Vercel + Render)

Objetivo: front na **Vercel** (+1 do desafio) e API no **Render** (Express + MySQL).

## 1) API no Render

1. Crie conta em [render.com](https://render.com)
2. **New → MySQL** (ou banco externo: Aiven, PlanetScale, RDS) e anote host/porta/user/senha/database
3. **New → Web Service** (ou Blueprint com `render.yaml`):
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start` (no boot o `initDb` aplica migrations Knex pendentes)
4. Environment:
   - `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`
   - `TMDB_API_KEY`
   - `TICKET_QR_SECRET` (obrigatório — `openssl rand -hex 32`; sem fallback no código)
   - `STAFF_INVITE_CODE` (não use o valor de exemplo em produção)
   - `NODE_ENV=production`
   - `APP_PUBLIC_URL=https://seu-app.vercel.app` (URL do front)
5. Copie a URL pública, ex.: `https://cinerar-api.onrender.com`

Teste: `https://SUA-API/health` → `{"status":"ok"}`

> Não use mais disco persistente para SQLite — o banco é MySQL.

## 2) Front na Vercel

1. [vercel.com](https://vercel.com) → Import do GitHub
2. Framework: Vite
3. Root Directory: `.` (raiz) **ou** `frontend`
   - Na raiz, o `vercel.json` já aponta install/build/output para `frontend/`
   - Se usar Root Directory `frontend`, o build usa o `package.json` do front direto
4. Env:
   - `VITE_APP_API_URL=https://SUA-API.onrender.com/api` (URL absoluta em produção)
5. Deploy

Depois do primeiro deploy, **atualize no Render**:
- `APP_PUBLIC_URL` = URL real da Vercel

No README do formulário Elite Dev, cole:

- Front: `https://seu-app.vercel.app`
- API: `https://sua-api.onrender.com`
- Como rodar local: ver README

## 3) Local vs produção

| Variável | Local (`backend/.env` / `frontend/.env`) | Produção |
|----------|------------------------------------------|----------|
| `APP_PUBLIC_URL` | `http://localhost:5173` | `https://seu-app.vercel.app` |
| `VITE_APP_API_URL` | `/api` (proxy Vite) | `https://sua-api.onrender.com/api` |
| `TICKET_QR_SECRET` | qualquer valor longo no `.env` | aleatório forte (obrigatório) |

Links de transferir/compartilhar usam `window.location.origin` — no ar já saem com o domínio do front.

## 4) Checklist pós-deploy

- [ ] Login com `cliente1@cineray.com` / `cineray`
- [ ] Ver evento seed na home
- [ ] Comprar assento e abrir QR (`CR2.…` cifrado)
- [ ] Abrir link `/i/...`
- [ ] Transferir ingresso e reivindicar em outra conta
- [ ] Login portaria e validar QR
- [ ] Organizador com `TMDB_API_KEY` busca/publica filme

## Alternativa tudo-em-um

```bash
docker compose up --build
# ou: docker-compose up --build
```

Sobe MySQL + API + front (ver README).
