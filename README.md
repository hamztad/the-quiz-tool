# Gruiz

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

1. **Quizmaster:** Gå til `/host` og opprett quiz → del QR-kode (peker til `/join/:kode`)
2. **Deltaker:** Skann QR eller gå til `/join` — kun deltakernavn og romkode, ingen admin-funksjoner
3. **Quizmaster:** Rediger spørsmål (hurtigimport eller skjema) → Start quiz
4. **Åpne/lås** spørsmål manuelt; deltakere svarer og kan redigere til låsing
5. **MC** rettes automatisk ved innsending
6. **Retterunde:** Deltakere retter hverandres åpne svar; protester håndteres av quizmaster
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

### E-postvarsler (valgfritt, GDPR)

For at spillere kan registrere e-post og få beskjed når Gruizen avsluttes:

| Variabel | Beskrivelse |
|----------|-------------|
| `RESEND_API_KEY` | API-nøkkel fra [Resend](https://resend.com) |
| `EMAIL_FROM` | Avsender, f.eks. `Gruiz <varsler@dittdomene.no>` (domene må verifiseres hos Resend) |
| `PUBLIC_APP_URL` | Full URL til appen (brukes i e-postlenker), f.eks. `https://gruiz.example.com` |

Uten `RESEND_API_KEY` skjules e-postregistrering for spillere. E-post lagres kun på serveren til rommet utløper; samtykke kan trekkes tilbake i spilleren.

## Manuell testplan

- [ ] Opprett rom som host; join-kode og QR vises
- [ ] Bli med med to deltakere via join-kode
- [ ] Importer quiz via hurtigimport; forhåndsvis og lagre
- [ ] Start quiz; åpne spørsmål; deltaker sender og oppdaterer svar
- [ ] Lås spørsmål; bekreft at redigering blokkeres
- [ ] MC: riktig svar gir poeng på leaderboard
- [ ] Start retterunde; deltaker A retter deltaker B sine åpne svar
- [ ] Send protest; host godkjenner/avviser
- [ ] Host overstyrer poeng
- [ ] Vis/skjul leaderboard
- [ ] Refresh side som host og deltaker; reconnect fungerer
- [ ] Prøv quizen (testmodus) med én testdeltaker; avslutt test før ekte deltakere

## Fremtidig utvidelse

Arkitekturen er forberedt for database, flere lagmedlemmer, custom games, AI-retting og aktivitetslogg — uten at dette er implementert i MVP.
