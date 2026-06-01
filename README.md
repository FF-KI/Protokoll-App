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
# Optional: PORT anpassen (Standard: 3000)

# 4. App starten
npm start

# 5. Browser öffnen
# http://localhost:3000             (lokal)
# http://<Server-IP>:3000           (aus dem Netzwerk)
```

## Workflow

1. **Protokoll auswählen** oder neu anlegen
2. **Aufnahme starten** (Mikrofon-Symbol unten rechts)
3. **Sprechen** – Chrome transkribiert live auf Deutsch
4. **KI analysieren** – Claude strukturiert und ordnet die Punkte zu
5. **Vorschläge prüfen** – jeden Punkt annehmen, bearbeiten oder ablehnen
6. **PDF exportieren** – Browser-Druckdialog → Als PDF speichern

## Betrieb im Firmennetzwerk

Die App ist für den Betrieb als interner Server im Unternehmensnetzwerk ausgelegt.
Zugriff erfolgt ausschließlich aus dem Büro oder per VPN.

**Netzwerk-Voraussetzungen:**

| Richtung | Ziel | Protokoll | Zweck |
|----------|------|-----------|-------|
| Eingehend | Server-IP:PORT | TCP | Zugriff durch Büro / VPN |
| Ausgehend | `api.anthropic.com:443` | HTTPS | Claude KI-Analyse |
| Alle anderen ausgehenden Verbindungen | – | – | Blockiert (kein Internet nötig) |

> Die App lädt keine externen Ressourcen (keine CDNs, keine Webfonts). Alle Assets sind lokal ausgeliefert.

**Empfohlene Firewall-Regeln auf dem Server:**

- Eingehend: Port `3000` (oder konfigurierter `PORT`) nur aus dem Firmennetz / VPN-Subnetz
- Ausgehend: Nur `api.anthropic.com` auf Port `443` freigeben
- Alles andere ausgehend: blockieren

**Sicherheitshinweis:**
Die API-Routen sind aktuell ohne Authentifizierung zugänglich. Im Firmennetzwerk mit VPN-Pflicht ist das ein akzeptables Schutzniveau. Sollte die App öffentlich erreichbar werden, muss eine Authentifizierung (z. B. HTTP Basic Auth oder Bearer Token) ergänzt werden.

## Datenspeicherung

Alle Daten werden lokal in `protokoll.db` (SQLite) gespeichert.
Die Datenbankdatei liegt im App-Verzeichnis und sollte in das reguläre Server-Backup eingeschlossen werden.
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
