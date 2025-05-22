"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// server/app.js
var express_1 = require("express");
var path_1 = require("path");
var app = (0, express_1.default)();
var port = 3000;
var api_1 = require("./routes/api");
app.use('/api', api_1.default);
// Statische Dateien (React-Build) ausliefern
app.use(express_1.default.static(path_1.default.join(__dirname, './static')));
// Alle anderen Anfragen an die React-App weiterleiten
app.get('', function (req, res) {
    res.sendFile(path_1.default.join(__dirname, 'static', 'index.html'));
});
// // Server-Export als Funktion, damit er von Electron oder Node gestartet werden kann
// async function startServer(port = 3000):Promise<any> {
//   return new Promise((resolve) => {
var server = app.listen(port, function () {
    console.log("Server l\u00E4uft auf Port ".concat(port));
    //      resolve(server);
});
//   });
// };
