# Materials Manager V25

Sistema di gestione materiali per cantieri Oil&Gas.

## Setup Veloce

1. Carica questa cartella su GitHub
2. Importa il repository su Vercel
3. Aggiungi le variabili d'ambiente:
   - `VITE_SUPABASE_URL` = il tuo Project URL
   - `VITE_SUPABASE_ANON_KEY` = la tua Publishable key
4. Deploy!

## Struttura File

```
materials-manager/
├── package.json        # Dipendenze
├── vite.config.js      # Configurazione build
├── index.html          # Pagina HTML
├── .env.example        # Esempio variabili
└── src/
    ├── main.jsx        # Entry point
    └── App.jsx         # Applicazione principale
```

## Variabili d'Ambiente

Crea un file `.env` con:

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

## Versione

V25 - Dicembre 2024
