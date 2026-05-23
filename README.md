# The Quiz Tool

Moderne live pubquiz-plattform — mobilvennlig, quizmaster-styrt, med peer-retting for åpne spørsmål.

## Stack

- **Frontend:** React, Vite, Tailwind CSS, Socket.io client
- **Backend:** Node.js, Express, Socket.io
- **State:** In-memory (MVP)

## Kom i gang

```bash
npm install
npm run dev
```

- Klient: http://localhost:5173
- Server: http://localhost:3001

## Scripts

| Kommando | Beskrivelse |
|----------|-------------|
| `npm run dev` | Starter klient og server parallelt |
| `npm run build` | Bygger shared, client og server |
| `npm run start` | Produksjonsserver (serverer også bygget klient) |
| `npm test` | Kjører parser-tester i `shared` |

## Flyt

1. **Quizmaster:** Opprett quiz på forsiden → del join-kode/QR
2. **Lag:** Gå til `/join`, skriv kode og lagnavn
3. **Quizmaster:** Rediger spørsmål (hurtigimport eller skjema) → Start quiz
4. **Åpne/lås** spørsmål manuelt; lag svarer og kan redigere til låsing
5. **MC** rettes automatisk ved innsending
6. **Retterunde:** Lag retter hverandres åpne svar; protester håndteres av quizmaster
7. **Leaderboard** vises når quizmaster slår det på

## Hurtigimport

```
Q Hva heter hovedstaden i Frankrike?
Hint: begynner med P
A Paris

MC Hvilken planet er størst?
*Jupiter
Mars
Venus
Saturn
```

## Deploy (Render)

1. Push til GitHub
2. Opprett Web Service, koble repo
3. Build: `npm install && npm run build`
4. Start: `npm run start`
5. Sett `NODE_ENV=production`

## Manuell testplan

- [ ] Opprett rom som host; join-kode og QR vises
- [ ] Bli med med to lag via join-kode
- [ ] Importer quiz via hurtigimport; forhåndsvis og lagre
- [ ] Start quiz; åpne spørsmål; lag sender og oppdaterer svar
- [ ] Lås spørsmål; bekreft at redigering blokkeres
- [ ] MC: riktig svar gir poeng på leaderboard
- [ ] Start retterunde; lag A retter lag B sine åpne svar
- [ ] Send protest; host godkjenner/avviser
- [ ] Host overstyrer poeng
- [ ] Vis/skjul leaderboard
- [ ] Refresh side som host og lag; reconnect fungerer

## Fremtidig utvidelse

Arkitekturen er forberedt for database, flere lagmedlemmer, custom games, AI-retting og aktivitetslogg — uten at dette er implementert i MVP.
