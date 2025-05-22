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
    let dbUrl = 'mongodb://localhost:27017'; // Standard-URL für MongoDB
    if (process.env.MONGO_URL) {
        dbUrl = process.env.MONGO_URL; // URL aus der Umgebungsvariable verwenden
    }
    console.log('MongoDB URL:', dbUrl);
    let dbName = 'midi'; // Standard-Datenbankname
    if (process.env.MONGO_DB_NAME) {
        dbName = process.env.MONGO_DB_NAME; // Datenbankname aus der Umgebungsvariable verwenden
    }
    console.log('MongoDB Datenbankname:', dbName);
    let dbCollection = 'midifiles'; // Standard-Collectionname
    if (process.env.MONGO_DB_COLLECTION) {
        dbCollection = process.env.MONGO_DB_COLLECTION; // Collectionname aus der Umgebungsvariable verwenden
    }
    console.log('MongoDB Collectionname:', dbCollection);
    // Initialize mongoDB
    await initMongo(dbUrl, dbName, dbCollection);
    console.log('MongoDB initialisiert');
})();

const server = app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
}).on('error', (err) => {
    console.error('Server konnte nicht gestartet werden:', err);
});
