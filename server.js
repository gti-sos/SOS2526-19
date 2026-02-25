"use strict";

const express = require("express");
const path = require("path");
const xlsx = require("xlsx");

const app = express();
app.use(express.json());

// Render te da el puerto en process.env.PORT
const PORT = process.env.PORT || 3000;

const EXCEL_FILE = path.join(__dirname, "SOS2526-19-Propuesta.xlsx");
const SHEET_NAME_RDB = "Raúl"; 
const NUMERIC_FIELD_RDB = "productivity_hour"; 



function loadRowsFromExcel_RDB() {
  const wb = xlsx.readFile(EXCEL_FILE);
  const sheet = wb.Sheets[SHEET_NAME_RDB];

  if (!sheet) {
    throw new Error(`No existe la hoja "${SHEET_NAME_RDB}"`);
  }

  return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

function meanByCountry_RDB(rows, countryValue, field) {
  const subset = rows.filter(r => r.country === countryValue);

  const values = subset
    .map(r => Number(r[field]))
    .filter(v => Number.isFinite(v));

  if (values.length === 0) return null;

  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

// 1) Página estática /about (HTML con express.static)
app.use("/about", express.static(path.join(__dirname, "public")));

// 2) Ruta dinámica /cool
app.get("/cool", (req, res) => {
  const now = new Date();
  res.send(`
    <h1>Cool route 😎</h1>
    <p>Fecha y hora: ${now.toISOString()}</p>
    <p>Un número random: ${Math.floor(Math.random() * 1000)}</p>
  `);
});

// ===== Ruta requerida: /samples/RDB =====
app.get("/samples/RDB", (req, res) => {
  try {
    const country = req.query.country || "Spain";

    const rows = loadRowsFromExcel_RDB();
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

const RESOURCE = "workers-productivity";
const BASE = `/api/v1/${RESOURCE}`;

const API_KEY = process.env.API_KEY || "rdb123"; // (en Render pon API_KEY como env var)

function requireApiKey(req, res, next) {
  const key = req.header("x-api-key");
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// Fuente de datos en memoria (NodeJS)
let db = [];
let nextId = 1;

// Validación mínima
function isValidItem(o) {
  return (
    o &&
    typeof o.country === "string" &&
    o.country.trim().length > 0 &&
    Number.isInteger(o.year) &&
    typeof o.productivity_hour === "number" &&
    Number.isFinite(o.productivity_hour)
  );
}

// PUNTO 12: loadInitialData
// - si db está vacío: crea 10+ elementos -> 201
// - si ya hay datos: no re-crea -> 200

app.get(`${BASE}/loadInitialData`, (req, res) => {
  if (db.length > 0) {
    return res.status(200).json({
      message: "Data already initialized",
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

  db = initial.map((x) => ({ id: nextId++, ...x }));

  return res.status(201).json({
    message: "Initial data loaded",
    count: db.length
  });
});

// Aplica 401 a todo el recurso
// (si quieres que /loadInitialData sea público, coloca este app.use DESPUÉS de esa ruta)
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});