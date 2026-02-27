"use strict";

//============ IMPORTS ============//
const express = require("express"); // framework para microservicios que permite filtrar el protocolo http y establecer el comportamiento del microsevicio con él
const xlsx = require("xlsx");

const cool = require("cool-ascii-faces");

const fs = require("fs");
const { marked } = require("marked");

//============ INICIAR LA APP WEB ============//
const app = express(); // definimos la app con express
app.use(express.json()); // parsea toda peticion de la app a formato JSON

const PORT = process.env.PORT || 3000; // Render te da el puerto en process.env.PORT
const EXCEL_FILE = "./SOS2526-19-Propuesta.xlsx";

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

//============ VARIABLES APP WEB ============//
const SHEET_NAME_RDB = "Raúl";
const SHEET_NAME_JMJ = "Javier";
const SHEET_NAME_PRA = "Pablo"; 

//============ CARGAR DATOS ============//
function cargarDatos(archivo, hoja) {
    let libro = xlsx.readFile(archivo);
    let sheet = libro.Sheets[hoja];

    if (!sheet) throw new Error("No existe la hoja: " + hoja);
    return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

//============ REDIRECCIONES PROTOCOLO HTTP ============//
const RESOURCE = "workers-productivity";
const BASE = `/api/v1/${RESOURCE}`;

let db = []; // Fuente de datos en memoria (NodeJS)

const API_KEY = process.env.API_KEY || "rdb123"; // (en Render pon API_KEY como env var)
function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

app.get("/cool", (req, res) => {
  const now = new Date();
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

// PUNTO 12: loadInitialData
app.get(`${BASE}/loadInitialData`, (req, res) => {
  // - si ya hay datos: no re-crea -> 200 OK
  if (db.length > 0) {
    return res.status(200).json({
      message: "La db contiene datos.",
      count: db.length
    });
  }

  const initial = [
    { country: "Spain", year: 1995, productivity_hour: 570.84 },
    { country: "Spain", year: 1996, productivity_hour: 589.7068541 },
    { country: "Spain", year: 1997, productivity_hour: 631.27836 },
    { country: "Spain", year: 1998, productivity_hour: 669.8616643 },
    { country: "Spain", year: 1999, productivity_hour: 696.8961129 },

    { country: "Cambodia", year: 1995, productivity_hour: 699.8581194 },
    { country: "Cambodia", year: 1996, productivity_hour: 663.1780142 },
    { country: "Cambodia", year: 1997, productivity_hour: 686.4500003 },
    { country: "Cambodia", year: 1998, productivity_hour: 654.9528481 },
    { country: "Cambodia", year: 1999, productivity_hour: 718.3701884 }
  ];

  db = initial.map((x, i) => ({ id: i, ...x }));

  // - si db está vacío: crea 10+ elementos -> 201 CREATED
  return res.status(201).json({
    message: "La db ha sido inicializada con 10 datos.",
    count: db.length
  });
});
app.use(BASE, requireApiKey);

// -------- GET colección (200 OK) ----------
app.get(BASE, (req, res) => {
  res.status(200).json(db);
});

// -------- GET por id (200 OK / 404 Not Found) ----------
app.get(`${BASE}/:id`, (req, res) => {
  const id = Number(req.params.id);
  const item = db.find((x) => x.id === id);

  if (!item) return res.status(404).json({ error: "Not Found" });

  res.status(200).json(item);
});

// -------- POST crear (201 Created / 400 Bad Request / 409 Conflict) ----------
app.post(BASE, (req, res) => {
  const obj = req.body;

  // 400: validación mínima
  if (
    !obj ||
    typeof obj.country !== "string" ||
    obj.country.trim().length === 0 ||
    !Number.isInteger(obj.year) ||
    obj.productivity_hour === undefined
  ) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const ph = Number(obj.productivity_hour);
  if (!Number.isFinite(ph)) {
    return res.status(400).json({ error: "Bad Request" });
  }

  // 409: conflicto si ya existe mismo (country, year)
  const exists = db.some((x) => x.country === obj.country && x.year === obj.year);
  if (exists) return res.status(409).json({ error: "Conflict" });

  const created = {
    id: nextId++,
    country: obj.country,
    year: obj.year,
    productivity_hour: ph
  };

  db.push(created);
  res.status(201).json(created);
});

// -------- PUT reemplazar por id (200 OK / 400 / 404 / 409) ----------
app.put(`${BASE}/:id`, (req, res) => {
  const id = Number(req.params.id);
  const obj = req.body;

  // 404: si no existe
  const idx = db.findIndex((x) => x.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not Found" });

  // 400: body inválido
  if (
    !obj ||
    typeof obj.country !== "string" ||
    obj.country.trim().length === 0 ||
    !Number.isInteger(obj.year) ||
    obj.productivity_hour === undefined
  ) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const ph = Number(obj.productivity_hour);
  if (!Number.isFinite(ph)) {
    return res.status(400).json({ error: "Bad Request" });
  }

  // 409: conflicto con otro registro
  const conflict = db.some((x) => x.id !== id && x.country === obj.country && x.year === obj.year);
  if (conflict) return res.status(409).json({ error: "Conflict" });

  db[idx] = {
    id,
    country: obj.country,
    year: obj.year,
    productivity_hour: ph
  };

  res.status(200).json(db[idx]);
});

// -------- DELETE por id (200 OK / 404 Not Found) ----------
app.delete(`${BASE}/:id`, (req, res) => {
  const id = Number(req.params.id);
  const idx = db.findIndex((x) => x.id === id);

  if (idx === -1) return res.status(404).json({ error: "Not Found" });

  const deleted = db[idx];
  db.splice(idx, 1);

  // 200 OK (no 204, porque tu cuadro verde no lo incluye)
  res.status(200).json({ message: "Deleted", deleted });
});

// -------- DELETE colección (200 OK) ----------
app.delete(BASE, (req, res) => {
  db = [];
  nextId = 1;
  res.status(200).json({ message: "All deleted" });
});

app.all(BASE, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.all(`${BASE}/:id`, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

//============ FUNCIONES RDB ============//
function meanByCountry_RDB(rows, countryValue, field) {
  const subset = rows.filter(r => r.country === countryValue);

  const values = subset
    .map(r => Number(r[field]))
    .filter(v => Number.isFinite(v));

  if (values.length === 0) return null;

  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

app.get("/samples/RDB", (req, res) => {
  try {
    const country = req.query.country || "Spain";
    const NUMERIC_FIELD_RDB = "productivity_hour";

    const rows = cargarDatos(EXCEL_FILE, SHEET_NAME_RDB);
    const mean = meanByCountry_RDB(rows, country, NUMERIC_FIELD_RDB);

    res.status(200).json({
      sample: "RDB",
      country,
      field: NUMERIC_FIELD_RDB,
      mean
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

//============ FUNCIONES JMJ ============//
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

//============ FUNCIONES PRA ============//
