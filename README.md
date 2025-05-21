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

---

## Lizenz

MIT License

---

**Fragen oder Feedback?**  
Bitte im Repository ein Issue eröffnen oder direkt Kontakt aufnehmen.