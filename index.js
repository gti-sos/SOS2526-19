"use strict";

//============ IMPORTS ============//
//const express = require("express"); // framework para microservicios que permite filtrar el protocolo http y establecer el comportamiento del microsevicio con él
import express from 'express';
//const xlsx = require("xlsx");
import xlsx from 'xlsx';

//const path = require("path");
import path from 'path';

//const Datastore = require("@seald-io/nedb")
import Datastore from '@seald-io/nedb';

//const cool = require("cool-ascii-faces");
import cool from 'cool-ascii-faces';

//const fs = require("fs");
import fs from 'fs';

//const { marked } = require("marked");
import {marked} from 'marked';

import { fileURLToPath } from 'url';

import {loadBackendPRA} from './src/back/index-PRA.js';

import {loadBackendRDB} from './src/back/index-RDB.js';

//============ INICIAR LA APP WEB ============//
export const app = express(); // definimos la app con express

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json()); // parsea toda peticion de la app a formato JSON
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000; // Render te da el puerto en process.env.PORT
export const EXCEL_FILE = "./SOS2526-19-Propuesta.xlsx";

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//============ VARIABLES APP WEB ============//
const SHEET_NAME_RDB = "Raúl";
const SHEET_NAME_JMJ = "Javier"; 

//============ CARGAR DATOS ============//
export function cargarDatos(archivo, hoja) {
    let libro = xlsx.readFile(archivo);
    let sheet = libro.Sheets[hoja];

    if (!sheet) throw new Error("No existe la hoja: " + hoja);
    return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

//============ REDIRECCIONES PROTOCOLO HTTP ============//
const API_KEY = process.env.API_KEY || "rdb-superkey"; // (en Render pon API_KEY como env var)
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

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

//=======================================//
//============ FUNCIONES JMJ ============//
//=======================================//

const BASE_JMJ = `/api/v1/earthquakes`;
let db_JMJ = [];

function mediaSeveridadPorPais(filas, pais) {
    let subset = filas.filter(f => f.country === pais);

    if (subset.length === 0) {
        console.log("No hay datos para ese país");
        return;
    }

    let valores = subset
        .map(f => Number(f["severity"])) // transformar los caracteres en número
        .filter(v => Number.isFinite(v)); // devuelve aquellos valores que son numericos (finitos), ya que ha podido parsear alguna letra

    let suma = valores.reduce((acc, v) => acc + v, 0); 

    return suma / valores.length;
}

app.get("/samples/JMJ", (req, res) => {
  try {
    let PAIS = req.query.pais || "Iran";
    let datos = cargarDatos(EXCEL_FILE, SHEET_NAME_JMJ);
    let resultado = mediaSeveridadPorPais(datos, PAIS);

    res.status(200).json({
      pais: PAIS,
      media_severidad: resultado
    });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get(`${BASE_JMJ}/loadInitialData`, (req, res) => {
  if (db_JMJ.length > 0) {
    return res.status(200).json({
      message: "La db ya contiene datos.",
      count: db_JMJ.length,
      data: db_JMJ
    });
  }

  let initial = cargarDatos(EXCEL_FILE, SHEET_NAME_JMJ);

  db_JMJ = initial.map((x, i) => ({ id: i + 1, ...x }));

  return res.status(201).json({
    message: `DB inicializada con ${db_JMJ.length} datos.`,
    count: db_JMJ.length
  });
});

// app.use(BASE_JMJ, requireApiKey);

// ---------------- COLECCIONES ----------------//
// -------- GET colección (200 OK) ----------
app.get(BASE_JMJ, (req, res) => {
  res.status(200).json(db_JMJ);
});

// -------- POST crear (201 / 400 / 409) ----------
app.post(BASE_JMJ, (req, res) => {
  const obj = req.body;

  if ( !obj || typeof obj.country !== "string" || obj.country.trim().length === 0 || !obj.fromdate || obj.severity === undefined || !Number.isFinite(Number(obj.severity)) ) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const c = db_JMJ.find(x => x.pais === obj.pais && x.fechaInicio === obj.fechaInicio);
  if (c.length > 0) return res.status(409).json({ error: `Ya existe un terremoto en ${c.pais} con fecha ${c.fechaInicio}` });

  const nuevo_id = db_JMJ.length > 0 ? Math.max(...db_JMJ.map(x => x.id)) + 1 : 1;
  const nuevoTerremoto = {
    id: nuevo_id,
    country: obj.country,
    fromdate: obj.fromdate,
    todate: obj.todate || obj.fromdate,
    severity: Number(obj.severity),
    alertlevel: obj.alertlevel || null,
    depth: obj.depth || null,
    exposed_population: obj.exposed_population || null
  };

  db_JMJ.push(nuevoTerremoto);
  res.status(201).json(nuevoTerremoto);
});

// -------- DELETE colección (200 OK) ----------
app.delete(BASE_JMJ, (req, res) => {
  db_JMJ = [];
  res.status(200).json({ message: "Todos los datos borrados." });
});

app.put(BASE_JMJ, (req, res) => {
  res.status(405).json({error: `No se puede editar completamente la DB de JMJ.`})
});

//---------------- ID ESPECIFICO ----------------//
// -------- GET por id (200 / 404) ----------
app.get(`${BASE_JMJ}/:id`, (req, res) => { // ":id" se usa para indicar que hay un parametro en la url que indica el elemento en especifico
  const id = Number(req.params.id);
  const item = db_JMJ.find(x => x.id === id);
  if (!item) return res.status(404).json({ error: `No se ha encontrado el objeto ${id}.` });
  res.status(200).json(item);
});

// -------- PUT por id (200 / 400 / 404 / 409) ----------
app.put(`${BASE_JMJ}/:id`, (req, res) => {
  const id = Number(req.params.id);
  const obj = req.body;

  const idx = db_JMJ.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: `No existe el objeto ${id}.` });

  if (!obj || typeof obj.country !== "string" || obj.country.trim().length === 0 || !obj.fromdate || obj.severity === undefined || !Number.isFinite(Number(obj.severity))) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const conflict = db_JMJ.some(x => x.id !== id && x.country === obj.country && x.fromdate === obj.fromdate);
  if (conflict) return res.status(409).json({ error: "Conflict" });

  db_JMJ[idx] = {
    id,
    country: obj.country,
    fromdate: obj.fromdate,
    todate: obj.todate || obj.fromdate,
    severity: Number(obj.severity),
    alertlevel: obj.alertlevel || null,
    depth: obj.depth || null,
    exposed_population: obj.exposed_population || null
  };

  res.status(200).json(db_JMJ[idx]);
});

// -------- DELETE por id (200 / 404) ----------
app.delete(`${BASE_JMJ}/:id`, (req, res) => {
  const id = Number(req.params.id);
  const idx = db_JMJ.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: `No se ha encontrado el objeto ${id}` });

  const deleted = db_JMJ[idx];
  db_JMJ.splice(idx, 1);
  res.status(200).json({ message: "Elemento eliminado.", deleted });
});

loadBackendPRA(app)
loadBackendRDB(app)