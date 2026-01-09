// server/app.js
import express from 'express';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api.js';
import { initMongo } from '../electron/mongo/mongo';

// Extend Express Request interface to include basePath
declare global {
    namespace Express {
        interface Request {
            basePath?: string;
        }
    }
}


const app = express();
const port = 3000;


app.use((req, res, next) => {
    const basePath = req.headers['x-forwarded-prefix'] as string || '';
    req.basePath = basePath;

    const originalSend = res.send;
    res.send = function (body) {
        if (typeof body === 'string' && req.basePath) {
            // Rewrite href="/..." and src="/..." to include basePath
            body = body.replace(/(href|src)=["']\/([^"']*)["']/g, `$1="${req.basePath}/$2"`);
            // Inject basePath into a global variable for the frontend
            body = body.replace('__BASE_PATH__', req.basePath);
        }
        return originalSend.call(this, body);
    };
    next();
});

app.use(express.json()); // <-- JSON-Parser
app.use(express.urlencoded({ extended: true })); // <-- URL-Parameter-Parser

app.get('/healthcheck', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/midi', apiRouter);

app.get('/test', (req, res) => {
    res.send('Test erfolgreich!');
});

// Statische Dateien (React-Build) ausliefern
app.use(express.static(path.join(__dirname, '../static')));

// Füge dies hinzu:
app.get(/.*/, (req, res) => {
    const indexPath = path.join(__dirname, '../static/index.html');
    if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        res.send(content);
    } else {
        res.status(404).send('index.html not found');
    }
});
// app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, './static/index.html'));
// });
// Alle anderen Anfragen an die React-App weiterleiten
// app.get('', (req, res) => {
//     res.sendFile(path.join(__dirname, 'static', 'index.html'));
// });

// Globaler Error-Handler
app.use((err: any, req: any, res: any, next: any) => {
    console.error('Express Error:', err);
    res.status(500).json({ error: 'Server-Fehler' });
});


(async () => {
    let dbUrl = 'localhost:27017'; // Standard-URL für MongoDB
    if (process.env.MONGO_URL) {
        dbUrl = process.env.MONGO_URL; // URL aus der Umgebungsvariable verwenden
    }
    console.log('MongoDB URL:', dbUrl);
    let dbName = 'mididb'; // Standard-Datenbankname
    if (process.env.MONGO_DB_NAME) {
        dbName = process.env.MONGO_DB_NAME; // Datenbankname aus der Umgebungsvariable verwenden
    }
    console.log('MongoDB Datenbankname:', dbName);
    let dbCollection = 'midifiles'; // Standard-Collectionname
    if (process.env.MONGO_DB_COLLECTION) {
        dbCollection = process.env.MONGO_DB_COLLECTION; // Collectionname aus der Umgebungsvariable verwenden
    }
    // Initialize mongoDB
    console.log('Initialisiere MongoDB...');
    console.log(`server: dbUrl: ${dbUrl}, dbName: ${dbName}, dbCollection: ${dbCollection}`);
    await initMongo(dbUrl, dbName, dbCollection);
    console.log('MongoDB initialisiert');
})();

const server = app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
}).on('error', (err) => {
    console.error('Server konnte nicht gestartet werden:', err);
});
