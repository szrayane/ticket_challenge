# Deploy CineRay (Vercel + Render)

Objetivo: front na **Vercel** (+1 do desafio) e API no **Render** (Express + SQLite com disco).

## 1) API no Render

1. Crie conta em [render.com](https://render.com)
2. **New → Blueprint** e aponte para o repo (usa `render.yaml`),  
   ou **New → Web Service**:
   - Root Directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
3. Adicione **Persistent Disk**:
   - Mount path: `/opt/render/project/src/backend/data`  
     (ou o path absoluto equivalente ao `backend/data` do serviço)
   - Size: 1 GB
4. Environment:
   - `TMDB_API_KEY`
   - `TICKET_QR_SECRET` (valor longo aleatório)
   - `STAFF_INVITE_CODE`
   - `NODE_ENV=production`
5. Copie a URL pública, ex.: `https://cineray-api.onrender.com`

Teste: `https://SUA-API/health` → `{"status":"ok"}`

## 2) Front na Vercel

1. [vercel.com](https://vercel.com) → Import do GitHub
2. Framework: Vite
3. Root: `.` (raiz do monorepo)
4. Env:
   - `VITE_APP_API_URL=https://SUA-API.onrender.com/api`
   - `VITE_CINEMA_API_URL=https://mock-api.driven.com.br/api/v8/cineflex`
5. Deploy

No README do formulário Elite Dev, cole:

- Front: `https://seu-app.vercel.app`
- API: `https://sua-api.onrender.com`
- Como rodar local: ver README

## 3) Checklist pós-deploy

- [ ] Login com `cliente1@cineray.com` / `cli1234`
- [ ] Ver evento seed na home
- [ ] Comprar assento e abrir QR
- [ ] Abrir link `/i/...`
- [ ] Login portaria e validar QR
- [ ] Organizador com `TMDB_API_KEY` busca/publica filme

## Alternativa tudo-em-um

Railway/Render com Docker Compose também funciona, mas para o +1 explícito do PDF o front na Vercel é o caminho mais claro.
