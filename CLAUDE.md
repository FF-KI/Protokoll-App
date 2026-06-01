# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # Produktion: Node.js direkt
npm run dev        # Entwicklung: nodemon mit Auto-Reload

# Abhängigkeiten neu installieren (z.B. nach better-sqlite3-Problemen)
npm install

# Datenbank zurücksetzen (Beispieldaten werden beim nächsten Start neu angelegt)
del protokoll.db protokoll.db-shm protokoll.db-wal
```

## Architektur

**Single-file Backend** – die gesamte Serverlogik liegt in [`server.js`](server.js). Keine Build-Pipeline, kein Bundler, kein Test-Runner.

**Frontend** – statisches Single-Page-HTML in [`public/index.html`](public/index.html), ausgeliefert von Express. Kein Framework, kein npm-Build-Schritt.

**Datenbank** – SQLite via `better-sqlite3` (synchron). Datei: `protokoll.db`. Schema wird beim Start automatisch per `CREATE TABLE IF NOT EXISTS` angelegt. `seedData()` legt beim allerersten Start ein Beispielprotokoll an.

### Datenbankschema (Hierarchie)

```
protocols
  └─ participants  (typ: 'teilnehmer' | 'verteiler')
  └─ anlagen
  └─ topics
       └─ subtopics
            └─ entries   (typ: 'Aufgabe' | 'Info' | 'Entscheidung')
```

### API-Routen

| Methode | Pfad | Funktion |
|---------|------|----------|
| GET/POST | `/api/protocols` | Liste / Neu anlegen (mit `copy_from_last` kopiert Themenstruktur) |
| GET/PUT/DELETE | `/api/protocols/:id` | Einzelprotokoll |
| PUT | `/api/protocols/:id/participants` | Teilnehmer + Verteiler komplett ersetzen |
| PUT | `/api/protocols/:id/anlagen` | Anlagen komplett ersetzen |
| POST/PUT/DELETE | `/api/topics`, `/api/subtopics`, `/api/entries` | CRUD für Hierarchie |
| POST | `/api/ki/strukturieren` | Transkript → Langdock → JSON-Vorschläge |
| POST | `/api/ki/uebernehmen` | Akzeptierte Vorschläge in DB schreiben |

### KI-Integration

`POST /api/ki/strukturieren` sendet das Sprach-Transkript plus die bestehende Themenstruktur über die **Langdock API** an `claude-haiku-4-5-20251001` und erwartet ein reines JSON-Array zurück (kein Markdown). Der Endpunkt ist ein No-op, wenn `LANGDOCK_API_KEY` nicht gesetzt ist – der Server startet trotzdem.

Die Langdock API ist Anthropic-SDK-kompatibel (gleicher `@anthropic-ai/sdk` mit angepasster `baseURL`):
- baseURL: `https://api.langdock.com/anthropic/{region}` (**ohne** `/v1` – das SDK hängt `/v1/messages` selbst an; ein zusätzliches `/v1` führt zu `/v1/v1/messages` → 404)
- Region via `LANGDOCK_REGION` (Standard: `eu`)
- Verfügbare Modelle des Workspaces abrufbar via `GET /anthropic/{region}/v1/models`

`POST /api/ki/uebernehmen` ordnet akzeptierte Vorschläge anhand von Titel-Match oder Nummern-Match bestehenden Themen zu; neue Themen/Unterthemen werden on-the-fly angelegt. Alle so erstellten Einträge erhalten `is_new = 1`.

## Konfiguration

Kopiere `.env.example` → `.env` und trage `LANGDOCK_API_KEY` ein. `LANGDOCK_REGION` (`eu`/`us`) und `PORT` sind optional.

## Bekannte Einschränkungen

- `better-sqlite3` enthält nativen Code → auf neuen Maschinen ggf. `npm install --global windows-build-tools` (Windows) oder Xcode CLI Tools (Mac) nötig.
- Sprachaufnahme (Web Speech API) funktioniert nur in Chrome.
- PDF-Export läuft über den Browser-Druckdialog (Datei → Drucken → Als PDF speichern).
