// server/app.js
import express from 'express';
import path from 'path';
const app = express();

// API-Routen
app.use('/api', require('./routes/api'));

// Statische Dateien (React-Build) ausliefern
app.use(express.static(path.join(__dirname, '../build/client')));

// Alle anderen Anfragen an die React-App weiterleiten
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build/client/index.html'));
});

// Server-Export als Funktion, damit er von Electron oder Node gestartet werden kann
module.exports = function startServer(port = 3000) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Server läuft auf Port ${port}`);
      resolve(server);
    });
  });
};
