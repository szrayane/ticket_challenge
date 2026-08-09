# CineRay 🎬

Plataforma de eventos e ingressos desenvolvida como parte do **desafio Elite Dev 2026**.

O projeto foi desenvolvido a partir dos requisitos do desafio, com foco em um fluxo completo de cinema: criação de eventos e sessões, consulta de filmes, seleção de assentos, pagamento simulado, emissão de ingresso com QR Code e validação na portaria.

## 🛠️ Tecnologias

### Front-end

* React 19
* TypeScript
* Vite
* Tailwind CSS

### Back-end

* Node.js
* Express
* JavaScript

### Banco de dados

* SQLite

### Outras tecnologias

* TMDb API
* Docker
* Docker Compose
* QR Code
* HMAC
* Vitest

---

## 📌 Sobre o projeto

A proposta do desafio é criar uma plataforma onde um organizador publica eventos e clientes podem comprar ingressos. O catálogo de filmes é obtido através de uma API externa, e o cliente pode escolher seu lugar, realizar um pagamento simulado e receber um ingresso com QR Code para validação na entrada.

Para o CineRay, escolhi trabalhar com **filmes e mapa de assentos**, criando um fluxo semelhante ao de uma compra de ingresso de cinema.

### Fluxo principal

```text
Catálogo de filmes
       ↓
Criação do evento
       ↓
Sessão
       ↓
Seleção de assentos
       ↓
Reserva temporária
       ↓
Pagamento simulado
       ↓
Ingresso + QR Code
       ↓
Validação na portaria
```

---

## 👥 Perfis de usuário

O sistema possui três papéis:

### 🎟️ Cliente

* Busca e consulta eventos
* Visualiza sessões
* Escolhe assentos
* Reserva lugares
* Realiza pagamento simulado
* Consulta seus ingressos
* Visualiza o QR Code
* Compartilha o ingresso por link
* Pode cancelar o ingresso antes do início da sessão

### 🎬 Organizador

* Pesquisa filmes através do TMDb
* Cria eventos
* Cria e gerencia sessões
* Define data, local, capacidade e preço
* Gerencia os eventos publicados

### 🚪 Portaria

* Consulta sessões próximas
* Valida ingressos
* Utiliza a câmera para leitura do QR Code
* Permite digitação manual do código
* Identifica ingressos inválidos
* Impede a utilização de um ingresso mais de uma vez
* Verifica se o ingresso pertence ao evento/sessão correta

---

## 💡 Principais decisões

### Mapa de assentos

O desafio permitia escolher entre um mapa de assentos ou uma quantidade de ingressos por pista. Optei pelo **mapa de assentos**, por fazer mais sentido para o contexto de cinema e permitir trabalhar diretamente com o controle de disponibilidade de cada lugar.

### TMDb

Utilizei o **TMDb** como catálogo externo de filmes.

O organizador utiliza a busca de filmes para selecionar um título e, a partir dele, cria o próprio evento informando os dados específicos da sessão.

### Reserva temporária

Foi implementado um **hold de 10 minutos** para os assentos selecionados.

Durante esse período, o lugar fica temporariamente reservado enquanto o cliente conclui o fluxo de compra.

Além disso, o banco possui uma restrição de unicidade para evitar que o mesmo assento seja vendido duas vezes.

### Atualização dos assentos

A disponibilidade dos assentos é atualizada periodicamente no front-end, permitindo refletir alterações feitas por outros clientes durante a seleção.

### QR Code

Os ingressos utilizam QR Code com assinatura **HMAC**.

A assinatura permite que o backend valide se os dados recebidos realmente foram emitidos pela aplicação, evitando que um ingresso seja criado ou alterado simplesmente modificando seu identificador.

### Compartilhamento

Além do compartilhamento nativo, o sistema gera um link próprio para o ingresso:

```text
/i/:shareToken
```

Assim, o ingresso pode ser compartilhado através de um link gerado pela aplicação.

### Portaria

A validação pode ser realizada pela câmera ou através da digitação manual do código.

O backend verifica o ingresso antes de confirmar sua utilização, incluindo situações de ingresso inválido, adulterado, já utilizado ou pertencente a outro evento/sessão.

### Usuários da equipe

O cadastro público não permite que qualquer pessoa escolha livremente os perfis de organizador ou portaria.

Para esses perfis, é necessário utilizar o código configurado em `STAFF_INVITE_CODE`.

---

## ✨ Funcionalidades

* Autenticação com diferentes papéis
* Busca de filmes através do TMDb
* Criação e gerenciamento de eventos
* Criação e gerenciamento de sessões
* Busca e filtros de eventos
* Mapa de assentos
* Atualização da disponibilidade dos lugares
* Hold de assentos por 10 minutos
* Proteção contra venda duplicada do mesmo lugar
* Pagamento simulado
* Tratamento de pagamento aprovado e recusado
* Área "Meus ingressos"
* Geração de QR Code
* Compartilhamento de ingresso por link
* Cancelamento de ingresso antes do início da sessão
* Validação de ingresso pela câmera
* Validação manual do código
* Bloqueio de reutilização de ingressos
* Validação do evento/sessão
* Docker Compose
* Testes automatizados

---

# 🚀 Como executar

## Pré-requisitos

* Node.js
* npm
* Docker (opcional)
* Uma chave da API do TMDb para pesquisar e publicar novos filmes

---

## 1. Backend

Entre na pasta do backend:

```bash
cd backend
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

Configure a chave do TMDb:

```env
TMDB_API_KEY=sua_chave
```

Depois execute:

```bash
npm run dev
```

A API estará disponível em:

```text
http://localhost:3333
```

O banco SQLite é armazenado em:

```text
backend/data/cineray.sqlite
```

---

## 2. Front-end

Na raiz do projeto:

```bash
npm install
```

Crie o arquivo `.env`:

```bash
cp .env.example .env
```

Execute:

```bash
npm run dev
```

A aplicação estará disponível em:

```text
http://localhost:5173
```

---

# 🐳 Docker Compose

Também é possível executar o projeto utilizando Docker:

```bash
export TMDB_API_KEY=sua_chave
docker compose up --build
```

Após a inicialização:

```text
Front-end → http://localhost:8080
API       → http://localhost:3333
```

---

# 🧪 Testes

Para executar os testes do backend:

```bash
cd backend
npm test
```

Os testes cobrem regras importantes do sistema, incluindo:

* assinatura do QR Code;
* rejeição de QR Code adulterado;
* capacidade da sessão;
* validação de check-in;
* tentativa de utilização de um ingresso mais de uma vez.

---

# 🔐 Contas para teste

O projeto possui dados de teste previamente cadastrados para facilitar a avaliação.

| Perfil      | E-mail                    | Senha       |
| ----------- | ------------------------- | ----------- |
| Organizador | `organizador@cineray.com` | `org1234`   |
| Cliente 1   | `cliente1@cineray.com`    | `cli1234`   |
| Cliente 2   | `cliente2@cineray.com`    | `cli1234`   |
| Portaria    | `portaria@cineray.com`    | `porta1234` |

Também existe um evento inicial:

**Duna: Parte Dois**

Dessa forma, é possível testar o fluxo sem precisar criar um evento do zero.

### Cadastro de usuário da equipe

Na tela de login:

```text
/login → Sou da equipe
```

Código padrão:

```text
cineray-staff
```

O código pode ser alterado através da variável:

```env
STAFF_INVITE_CODE=cineray-staff
```

---

# 🎯 Fluxo recomendado para avaliação

1. Acesse `/login`.
2. Entre utilizando o usuário de organizador.
3. Crie um evento utilizando um filme do TMDb ou utilize o evento seed.
4. Entre utilizando um usuário cliente.
5. Busque o evento.
6. Escolha uma sessão.
7. Selecione os assentos disponíveis.
8. Realize o pagamento simulado.
9. Acesse **Meus ingressos**.
10. Visualize o QR Code ou copie o link do ingresso.
11. Entre com o usuário de portaria.
12. Valide o ingresso através da câmera ou do código manualmente.

---

# ⚙️ Variáveis de ambiente

## Backend

```env
PORT=3333
STAFF_INVITE_CODE=cineray-staff
TICKET_QR_SECRET=sua_chave_secreta
TMDB_API_KEY=sua_chave_tmdb
```

## Front-end

```env
VITE_APP_API_URL=http://localhost:3333/api
VITE_CINEMA_API_URL=...
```

> Não versione arquivos `.env` contendo chaves ou secrets reais.

---

# ☁️ Deploy

O projeto pode ser publicado separando o front-end da API.

Uma configuração possível é:

* **API:** Render
* **Front-end:** Vercel

No front-end:

```env
VITE_APP_API_URL=https://sua-api.onrender.com/api
```

### SQLite em produção

Como o projeto utiliza SQLite, o ambiente de hospedagem precisa disponibilizar armazenamento persistente para o diretório do banco.

Sem um disco persistente, o banco pode ser perdido após determinados redeploys ou reinicializações do serviço.

Mais detalhes sobre o deploy estão disponíveis em [`DEPLOY.md`](./DEPLOY.md).

---

# 🤖 Uso de IA

Utilizei o **Cursor** como ferramenta de apoio durante o desenvolvimento para acelerar tarefas de implementação, revisão e debugging.

A ferramenta foi utilizada principalmente em partes relacionadas ao backend com Express/SQLite, reservas temporárias, integração com o TMDb, QR Code, portaria e configuração com Docker.

As decisões de produto e arquitetura foram feitas durante o desenvolvimento a partir dos requisitos do desafio. Entre elas estão:

* escolha do mapa de assentos;
* autenticação com diferentes papéis;
* uso de HMAC nos ingressos;
* criação do link de compartilhamento;
* reserva temporária dos assentos;
* fluxo específico para a portaria.

Também realizei testes manuais do fluxo completo e corrigi problemas encontrados durante a execução local, incluindo configuração da API, dados do seed, senhas e integração com a chave do TMDb.

A IA foi utilizada como ferramenta de apoio ao desenvolvimento, enquanto as decisões, validações e ajustes do resultado final foram realizados durante o desenvolvimento do projeto.

---

# 📋 Limitações

* O pagamento é simulado e não realiza transações financeiras reais.
* A chave do TMDb é necessária para pesquisar e publicar novos títulos através da API.
* O evento seed pode ser utilizado mesmo sem uma chave do TMDb configurada.
* O SQLite necessita de armazenamento persistente em ambientes PaaS.
* Recuperação de senha, nota fiscal, envio de ingresso por e-mail e aplicativo nativo não fazem parte do escopo do projeto.

---

# 📁 Estrutura do projeto

```text
cineray/
├── backend/
│   ├── data/
│   ├── src/
│   ├── tests/
│   └── package.json
│
├── src/
├── public/
├── docker-compose.yml
├── DEPLOY.md
├── AI.md
└── README.md
```

---

# 📌 Contexto

Este projeto foi desenvolvido como parte do **Desafio Elite Dev 2026**, um desafio técnico de processo seletivo voltado à avaliação de desenvolvimento Front-end, Back-end, lógica de programação e capacidade de transformar requisitos em uma solução funcional.
