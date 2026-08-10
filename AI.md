# Uso de IA

Usei **Cursor** para acelerar código e debug (Express/MySQL, holds com `FOR UPDATE`, TMDb, QR AES-GCM, portaria, Docker).

O que eu decidi a partir do PDF:

- mapa de assentos (não pista)
- login com papéis + convite staff
- hold de assento (10 min) + `SELECT … FOR UPDATE` no MySQL
- QR cifrado AES-256-GCM (`CR2.…`) — `TICKET_QR_SECRET` obrigatório
- TMDb como única API externa
- link `/i/:shareToken`
- fluxo da portaria (sessão certa, check-in único)
- Docker Compose (MySQL + API + front)

Testei o fluxo local e corrigi o que quebrou (API, seed, senhas, chave TMDb, migração SQLite → MySQL). A IA ajudou a escrever; as escolhas e a validação final foram minhas.
