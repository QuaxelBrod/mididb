# Basis-Image: Node.js LTS
FROM node:20-slim

# Arbeitsverzeichnis im Container
WORKDIR /app

# Abhängigkeiten zuerst kopieren und installieren für besseres Caching
COPY package*.json ./
RUN npm install

# Anwendungs-Quellcode kopieren
# Nur die notwendigen Dateien kopieren
COPY tsconfig*.json ./
COPY webpack.*.ts ./
COPY src/ ./src/
COPY soundfont/ ./soundfont/

# Build der Server-Anwendung
RUN npm run build:server

# Port freigeben
EXPOSE 3000

# Non-Root-Benutzer für Sicherheit
USER node

# Anwendung starten
CMD ["node", "dist/node/server.js"]