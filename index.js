"use strict";

//============ IMPORTS ============//
import express from 'express'; //const express = require("express"); // framework para microservicios que permite filtrar el protocolo http y establecer el comportamiento del microsevicio con él
import fs from "fs";
import { marked } from "marked";

import cors from 'cors';

import { loadBackendPRA } from './src/back/index-PRA.js';
import { loadBackendRDB } from './src/back/index-RDB.js';
import { loadBackendJMJ } from './src/back/index-JMJ.js';

import {handler} from './src/front/build/handler.js';

//============ INICIAR LA APP WEB ============//
export const EXCEL_FILE = "./SOS2526-19-Propuesta.xlsx";

export const app = express(); // definimos la app con express

app.use(cors());

app.use(express.json()); // parsea toda peticion de la app a formato JSON
//app.use(express.static("./public"));

const PORT = process.env.PORT || 3000; // Render te da el puerto en process.env.PORT
app.listen(PORT, console.log(`Server running on port ${PORT}`));

loadBackendPRA(app);
loadBackendRDB(app);
loadBackendJMJ(app);

app.use(handler);

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

export function cargarDatos(archivo, hoja) {
    let libro = xlsx.readFile(archivo);
    let sheet = libro.Sheets[hoja];

    if (!sheet) throw new Error("No existe la hoja: " + hoja);
    return xlsx.utils.sheet_to_json(sheet, { defval: null });
}
//