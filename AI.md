## Uso de IA

Utilizei o Cursor como ferramenta de apoio durante o desenvolvimento, principalmente para acelerar a implementação, debugging, testes e revisão de código.

Ele me ajudou em partes como Express/MySQL, holds de assentos, integração com TMDb, QR Code com AES-256-GCM, portaria e Docker.

A partir do enunciado, defini as principais decisões do projeto, como:

- mapa de assentos;
- login com papéis e convite para Staff;
- hold de 10 minutos com `SELECT ... FOR UPDATE`;
- QR Code com AES-256-GCM e `TICKET_QR_SECRET` obrigatório;
- TMDb como única API externa;
- compartilhamento por `/i/:shareToken`;
- validação da sessão e check-in único na portaria;
- Docker Compose com MySQL, API e frontend.

Durante o desenvolvimento, também usei IA para investigar e corrigir problemas, principalmente na API, seed, credenciais, chave do TMDb e migração de SQLite para MySQL. As sugestões foram revisadas e testadas por mim antes de serem incorporadas ao projeto. As decisões finais, integração e validação dos fluxos ficaram sob minha responsabilidade.

