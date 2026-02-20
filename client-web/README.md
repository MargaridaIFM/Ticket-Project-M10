# M10 • Gestor de Tickets (Frontend)

## Requisitos cumpridos
- 3 páginas HTML: `index.html`, `stats.html`, `about.html`
- Navbar + Footer em todas as páginas
- Listas e tabela (tabela é usada no desktop; cards no mobile)
- CSS consistente e responsivo (iPhone 14 Pro Max + Desktop Chrome)
- JavaScript vanilla (sem bibliotecas externas) com `fetch` + `async/await`
- Operações HTTP: GET/POST/PUT/DELETE contra a API

## Como executar
1) Iniciar a API (server-main):
```bash
cd server-main
npm install
node src/server.js --csv ../data.csv
```

2) Abrir o frontend:
- Abrir `client-web/index.html` no Chrome (ou usar o Live Server do VSCode).

> A API por defeito é `http://localhost:3000`. Podes mudar em `stats.html` (fica em `localStorage.apiBaseUrl`).

## Notas
- O backend foi ajustado para aceitar `PUT /tickets/:id` (alias do PATCH existente).
- O endpoint `/stats` devolve também `recent_7_days`.
