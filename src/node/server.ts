// server/app.js
import express from 'express';
import path from 'path';
import apiRouter from './routes/api.js';
import { initMongo } from '../electron/mongo/mongo';


const app = express();
const port = 3000;

// Ganz oben in server.ts nach den Imports
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

app.use(express.json()); // <-- JSON-Parser
app.use(express.urlencoded({ extended: true })); // <-- URL-Parameter-Parser

app.use('/midi', apiRouter);

app.get('/test', (req, res) => {
    res.send('Test erfolgreich!');
});

// Statische Dateien (React-Build) ausliefern
app.use(express.static(path.join(__dirname, '../static')));

// Füge dies hinzu:
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../static/index.html'));
});
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, './static/index.html'));
// });
// Alle anderen Anfragen an die React-App weiterleiten
// app.get('', (req, res) => {
//     res.sendFile(path.join(__dirname, 'static', 'index.html'));
// });

// Globaler Error-Handler
app.use((err:any, req:any, res:any, next:any) => {
    console.error('Express Error:', err);
    res.status(500).json({ error: 'Server-Fehler' });
});


(async () => {
    // Initialize mongoDB
    await initMongo();
})();

const server = app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
}).on('error', (err) => {
    console.error('Server konnte nicht gestartet werden:', err);
});
