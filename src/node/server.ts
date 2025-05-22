// server/app.js
import express from 'express';
import path from 'path';
import apiRouter from './routes/api';
import { initMongo } from '../electron/mongo/mongo';


const app = express();
const port = 3000;
app.use('/api', apiRouter);

// Statische Dateien (React-Build) ausliefern
app.use(express.static(path.join(__dirname, './static')));

// Alle anderen Anfragen an die React-App weiterleiten
app.get('', (req, res) => {
    res.sendFile(path.join(__dirname, 'static', 'index.html'));
});

(async () => {
    // Initialize mongoDB
    await initMongo();
})();

const server = app.listen(port, () => {
    console.log(`Server läuft auf Port ${port}`);
});
