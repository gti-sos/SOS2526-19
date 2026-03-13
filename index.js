"use strict";

//============ IMPORTS ============//
import express from 'express'; //const express = require("express"); // framework para microservicios que permite filtrar el protocolo http y establecer el comportamiento del microsevicio con él

import cool from 'cool-ascii-faces'; //const cool = require("cool-ascii-faces");

import fs from 'fs'; //const fs = require("fs");
import { marked } from 'marked'; //const { marked } = require("marked");

import { loadBackendPRA } from './src/back/index-PRA.js';
import { loadBackendRDB } from './src/back/index-RDB.js';
import { loadBackendJMJ } from './src/back/index-JMJ.js';

//============ INICIAR LA APP WEB ============//
export const app = express(); // definimos la app con express
app.use(express.json()); // parsea toda peticion de la app a formato JSON
app.use(express.static("./public"));

const PORT = process.env.PORT || 3000; // Render te da el puerto en process.env.PORT
app.listen(PORT, console.log(`Server running on port ${PORT}`));

app.get("/cool", (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <body>
            ${cool()}
        </body>
        </html>
    `);
});

app.get("/about", (req, res) => {
    const readme = fs.readFileSync("./README.md", "utf-8");
    const html = marked(readme);
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="utf-8">
            <title>About SOS2526-19</title>
        </head>
        <body>
            ${html}
        </body>
        </html>
    `);
});

loadBackendPRA(app);
loadBackendRDB(app);
loadBackendJMJ(app);