"use strict";

const express = require("express");
const path = require("path");
const xlsx = require("xlsx");

const app = express();

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

// Raíz (opcional, para comprobar que funciona)
app.get("/", (req, res) => {
  res.send('<h1>OK</h1><p>Prueba <a href="/cool">/cool</a> y <a href="/about">/about</a></p>');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});