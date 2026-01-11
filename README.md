# MIDI DB – Web MIDI Player & Datenbank

## Übersicht

**MIDI DB** ist eine Electron/React-Anwendung zum Verwalten, Durchsuchen und Bearbeiten von MIDI-Dateien.  
Das Programm liest MIDI-Dateien ein, ergänzt sie mit Informationen aus einem LLM (Large Language Model) und von MusicBrainz, und speichert alles in einer MongoDB-Datenbank.  
Die Anwendung bietet eine komfortable Suchfunktion, redaktionierbare Felder, einen MIDI-Player und eine übersichtliche Darstellung aller Metadaten.

---

## Hauptfunktionen

- **MIDI-Dateien einlesen:**  
  MIDI-Dateien können von der Festplatte geladen und analysiert werden.

- **Metadaten-Anzeige:**  
  Anzeige von Informationen aus der Datei (z.B. Titel, Artist, Lyrics, Tempo, Signature).

- **MusicLLM-Integration:**  
  Automatische Ergänzung von Metadaten durch ein Large Language Model (z.B. Titel, Artist, Album, Text).

- **MusicBrainz-Integration:**  
  Automatische Recherche und Anzeige von passenden Releases, Alben, Tags etc. aus der MusicBrainz-Datenbank.

- **Redaktionierte Felder:**  
  Alle wichtigen Felder (Artist, Title, Album, Release, Text, Tags, Note, Tempo, Signature) können manuell bearbeitet und gespeichert werden.

- **Suchfunktion:**  
  Schnelle Volltextsuche über alle gespeicherten MIDI-Dokumente mit Filter auf redaktionierte Einträge.

- **MIDI-Player:**  
  Abspielen der geladenen MIDI-Dateien direkt in der Anwendung.

- **MongoDB-Speicherung:**  
  Alle Daten werden in einer MongoDB-Datenbank gespeichert und können jederzeit durchsucht und bearbeitet werden.

---

## Konfiguration

### MongoDB

- Die Anwendung benötigt eine laufende MongoDB-Instanz.
- Standardmäßig wird auf `mongodb://localhost:27017` zugegriffen.
- Die Datenbank und Collection können im Code angepasst werden (z.B. in `src/electron/mongo/mongo.ts`):

  ```typescript
  const uri = 'mongodb://localhost:27017';
  const dbName = 'mididb';
  const collectionName = 'midifiles';
  ```

- **MongoDB-IP ändern:**  
  Passe die Variable `uri` an, z.B. für einen Server im Netzwerk:
  ```typescript
  const uri = 'mongodb://192.168.1.100:27017';
  ```

### LLM-Integration (Ollama)

Die Anwendung nutzt ein lokales Large Language Model (LLM) über [Ollama](https://ollama.com/), um Metadaten zu MIDI-Dateien automatisch zu ergänzen.  
Das LLM wird verwendet, um aus vorhandenen MIDI-Informationen (z.B. Lyrics, Copyright, Dateiname) möglichst passende Angaben zu Artist, Titel, Album und Release zu generieren.

**Funktionsweise:**
- Das LLM wird beim Start automatisch über die Ollama-API geladen (Standard: `localhost:11434`).
- Die Kommunikation erfolgt über die Funktion `soft_search`, die einen Prompt an das Modell sendet und ein JSON mit den erkannten Feldern erwartet.
- Das Modell kann in der Datei `src/electron/ollama/ollama.ts` angepasst werden (z.B. `"llama3.2:3b"`).
- Die Ergebnisse werden im Bereich „MusicLLM Result“ angezeigt und können übernommen oder gelöscht werden.

**Konfiguration:**
- Stelle sicher, dass Ollama lokal läuft und das gewünschte Modell (`llama3.2:3b` oder ein anderes) verfügbar ist.
- Modellwechsel: Passe die Variable `MODEL` in `src/electron/ollama/ollama.ts` an.
- Bei Problemen mit der Modellverfügbarkeit prüfe die Ollama-Konsole oder lade das Modell manuell mit `ollama pull <modellname>`.

**Hinweis:**  
Für die Nutzung des LLM ist keine Internetverbindung nötig, solange Ollama und das Modell lokal installiert sind.


### Soundfont

- Die Datei `alex_gm.sf2` wird als Soundfont für den MIDI-Player verwendet.
  Der SoundFont ist von: https://musical-artifacts.com/ Hier können noch andere Soundfonts gefunden werden.
- Stelle sicher, dass diese Datei im Projektverzeichnis unter `soundfont` vorhanden ist oder passe den Dateinamen in `loadSoundfont()` an.

---

## ToDo-Liste

Jede Menge... Derzeit reicht der Kram aber für mich

---

## Hinweise

- Die Anwendung ist für den Einsatz auf Desktop-Systemen (Windows, Mac, Linux) gedacht.
- Für die Nutzung von MusicBrainz und LLM ist eine Internetverbindung erforderlich.
- Die Anwendung ist für den lokalen Einsatz konzipiert, kann aber mit Anpassungen auch im Netzwerk genutzt werden.

---

## Entwicklung & Start

1. **MongoDB starten:**  
   Stelle sicher, dass MongoDB läuft (`mongod`).

2. **OLLAMA installieren und Model installieren:**  
    Ollama von https://ollama.com/ laden und mit
    ```ollama run llama3.2``` das Model laden

3. **Abhängigkeiten installieren:**  
   ```sh
   npm install
   ```

4. **App starten:**  
   ```sh
   npm run electron
   ```
## Massen-Import Script (Pattern Import)

Ein leistungsfähiges Tool zum Importieren großer Mengen von MIDI/KAR-Dateien (`src/tools/import_pattern.ts`).

**Features:**
- **Unterstützte Formate:** `.mid`, `.midi`, `.kar`
- **Intelligentes Filename-Parsing:** Erkennt `Artist - Title.mid` sowie `ARTIST_TITLE.mid` (ersetzt Unterstriche durch Leerzeichen).
- **Metadata Enrichment:** Sucht automatisch auf MusicBrainz nach Metadaten. Wenn die exakte Suche fehlschlägt, wird eine breite Suche mit dem bereinigten Dateinamen versucht.
- **Lyrics/Text Extraktion:** Liest Songtexte aus MIDI/KAR-Dateien und speichert sie im Feld `redacted.text`.
- **Hashing & Deduplizierung:** Verwendet inhaltsbasiertes Hashing (ignoriert Metadaten), um echte Duplikate zu erkennen.
- **Tagging:** Optionaler Style/Genre-Tag als Argument.

**Nutzung:**
```bash
npx ts-node src/tools/import_pattern.ts <Verzeichnis> [OptionalerStyleTag]
# Beispiel:
npx ts-node src/tools/import_pattern.ts ./archiv/pop "Pop"
```

---

## Erweiterte Suche

Die Suche unterstützt nun verschiedene Modi:
- **Volltextsuche:** Eingabe von Titel, Artist, Lyrics, etc.
- **ID-Suche:** Eingabe einer 24-stelligen MongoDB ObjectId (findet exaktes Dokument).
- **Hash-Suche:** Eingabe eines 64-stelligen SHA256-Hashes (findet exaktes MIDI-File).
- **Case-Insensitivity:** Hashes werden automatisch normalisiert.

---

## Automatisierte Importe (n8n / API)

Der Server bietet einen Endpunkt für automatisierte Importe (z.B. via n8n, Reddit-Crawler):

**Endpoint:** `POST /midi/importFromUrl`
**Body:**
```json
{
  "url": "https://example.com/song.mid",
  "sourceMetadata": {
    "title": "Reddit Post Title",
    "postId": "t3_xyz123"
  }
}
```
**Funktion:** Lädt die Datei herunter, hasht sie, prüft Duplikate, reichert Daten via MusicBrainz an und speichert alles.
## Dedupe-Tool für MIDI-Inhalte (Text ignorieren)

- Script: `npm run dedupe:content` – berechnet Content-Hashes, die Text-Metaevents ignorieren.
- Shell-Wrapper mit Defaults: `bash scripts/dedupe_content.sh`
  - Optional: `MONGO_URL`, `MONGO_DB_NAME`, `MONGO_DB_COLLECTION` setzen (Defaults: `192.168.178.29:27017`, `mididb`, `midifiles`).
  - Nur zählen (read-only): `bash scripts/dedupe_content.sh`
  - Merge (behalten + zusammenführen + Duplikate löschen): `bash scripts/dedupe_content.sh --merge`
  - Merge-Trockenlauf: `bash scripts/dedupe_content.sh --merge --dry-run`
- Merge-Logik: Wählt pro Content-Hash den “reichsten” Datensatz (reviewed/redacted/musicbrainz/musicLLM) als Primär, sammelt alle `fileName`-Einträge, füllt fehlende Felder aus MusicLLM/Redacted/MusicBrainz auf, setzt `validationState` auf reviewed wenn vorhanden, aktualisiert Primär und löscht die übrigen Duplikate.


## Hilfs-Skripte

Im Ordner `scripts/` befinden sich Shell-Wrapper für häufige Aufgaben. Diese können konfiguriert werden, indem Umgebungsvariablen (`MONGO_URL`, `MONGO_DB_NAME`, `MONGO_DB_COLLECTION`) gesetzt werden.

### 1. `import_pattern.sh`
Wrapper für das Massen-Import-Tool.
```bash
# Einfacher Import
bash scripts/import_pattern.sh /pfad/zu/dateien

# Import mit Style-Tag
bash scripts/import_pattern.sh /pfad/zu/dateien "GenreName"
```

### 2. `dedupe_content.sh`
Tool zum Finden und Zusammenführen von Duplikaten (basierend auf musikalischem Inhalt).
```bash
# Nur analysieren (Dry Run)
bash scripts/dedupe_content.sh

# Zusammenführen (Merge) & Duplikate löschen
bash scripts/dedupe_content.sh --merge
```

## Docker

Einfach das Dockerfile starten. 

```# Container-Image bauen
docker build -t mididb-server .

# Container starten und Port 3000 freigeben
docker run -p 3000:3000 mididb-server
# Container starten und Port 3000 freigeben (Empfohlen: Nutzung mit Docker Compose und Caddy)
docker compose up -d --build
```

**Subpath Deployment:**
Die Anwendung unterstützt den Betrieb unter einem Subpfad (z.B. `/mididb`), wenn ein Reverse Proxy (wie Caddy) den Header `X-Forwarded-Prefix` setzt. Der Server injiziert dann automatisch den korrekten `basePath` in das Frontend.

Environment Variablen für die Datenbank:

- MONGO_URL: default: 'mongodb://localhost:27017'
- MONGO_DB_NAME: default midi
- MONGO_DB_COLLECTION: default midifiles
- OLLAMA_API_URL: default localhost:11434

Network = host, dann teilt sich der Container den host und kann das lokale OLLama sehen
```docker run --rm --name mididb -p 3000:3000 --network=host -e MONGO_URL=mongodb://localhost:27017 mididb-server```

---

## Lizenz

MIT License

---

**Fragen oder Feedback?**  
Bitte im Repository ein Issue eröffnen oder direkt Kontakt aufnehmen.
