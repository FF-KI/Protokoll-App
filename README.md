# Bau-Protokoll Manager

KI-gestützter Protokoll-Manager für Bauprojekte. Aufnahme → KI-Strukturierung → Review → PDF.

## Voraussetzungen

- Node.js 18 oder neuer (https://nodejs.org)
- Google Chrome (für Sprachaufnahme)
- Claude API-Key (https://console.anthropic.com)

## Installation & Start

```bash
# 1. In den App-Ordner wechseln
cd protokoll-app

# 2. Abhängigkeiten installieren
npm install

# 3. API-Key konfigurieren
cp .env.example .env
# Dann .env öffnen und ANTHROPIC_API_KEY eintragen

# 4. App starten
npm start

# 5. Browser öffnen
# http://localhost:3000
```

## Workflow

1. **Protokoll auswählen** oder neu anlegen
2. **Aufnahme starten** (Mikrofon-Symbol unten rechts)
3. **Sprechen** – Chrome transkribiert live auf Deutsch
4. **KI analysieren** – Claude strukturiert und ordnet die Punkte zu
5. **Vorschläge prüfen** – jeden Punkt annehmen, bearbeiten oder ablehnen
6. **PDF exportieren** – Browser-Druckdialog → Als PDF speichern

## Datenspeicherung

Alle Daten werden lokal in `protokoll.db` (SQLite) gespeichert.
Beim ersten Start wird ein Beispielprotokoll automatisch angelegt.

## Späteres Hosting in Microsoft 365

Für den Produktivbetrieb in M365:
- Frontend → Azure Static Web Apps
- Backend → Azure App Service
- Daten → SharePoint Lists (statt SQLite)
- Login → Microsoft MSAL (M365-Account)
- KI → Azure OpenAI ODER weiterhin Claude API

## Problembehebung

**Sprachaufnahme funktioniert nicht?**
→ Chrome verwenden, nicht Firefox oder Safari
→ Mikrofon-Zugriff im Browser erlauben

**"ANTHROPIC_API_KEY nicht gesetzt"?**
→ .env-Datei erstellen und API-Key eintragen

**Installation schlägt fehl (better-sqlite3)?**
→ Node.js Build-Tools installieren:
  Windows: `npm install --global windows-build-tools`
  Mac: Xcode Command Line Tools installiert?
