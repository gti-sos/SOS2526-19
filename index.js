"use strict";

//============ IMPORTS ============//
const express = require("express"); // framework para microservicios que permite filtrar el protocolo http y establecer el comportamiento del microsevicio con él
const xlsx = require("xlsx");
const path = require("path");
const Datastore = require("@seald-io/nedb");

const cool = require("cool-ascii-faces");

const fs = require("fs");
const { marked } = require("marked");

//============ INICIAR LA APP WEB ============//
const app = express(); // definimos la app con express
app.use(express.json()); // parsea toda peticion de la app a formato JSON
app.use(express.static(path.join(__dirname, "public")));

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

{//=======================================//
//============ FUNCIONES RDB ============//
//=======================================//

const BASE_RDB = "/api/v1/workers-productivity";

const db_RDB = new Datastore({
  filename: "workers-productivity.db",
  autoload: true
});

db_RDB.ensureIndex({ fieldName: "key", unique: true }, (err) => {
  if (err) {
    console.error("Error creating NeDB index for RDB:", err);
  }
});

function meanByCountry_RDB(rows, countryValue, field) {
  const subset = rows.filter(r => r.country === countryValue);

  const values = subset
    .map(r => Number(r[field]))
    .filter(v => Number.isFinite(v));

  if (values.length === 0) return null;

  const sum = values.reduce((acc, v) => acc + v, 0);
  return sum / values.length;
}

// ========= Helpers NeDB =========
function rdbFind(query = {}, projection = { _id: 0, key: 0 }) {
  return new Promise((resolve, reject) => {
    db_RDB.find(query, projection, (err, docs) => {
      if (err) return reject(err);
      resolve(docs);
    });
  });
}

function rdbFindOne(query = {}, projection = { _id: 0, key: 0 }) {
  return new Promise((resolve, reject) => {
    db_RDB.findOne(query, projection, (err, doc) => {
      if (err) return reject(err);
      resolve(doc);
    });
  });
}

function rdbInsert(doc) {
  return new Promise((resolve, reject) => {
    db_RDB.insert(doc, (err, newDoc) => {
      if (err) return reject(err);
      resolve(newDoc);
    });
  });
}

function rdbCount(query = {}) {
  return new Promise((resolve, reject) => {
    db_RDB.count(query, (err, n) => {
      if (err) return reject(err);
      resolve(n);
    });
  });
}

function rdbUpdate(query, update, options = {}) {
  return new Promise((resolve, reject) => {
    db_RDB.update(query, update, options, (err, numReplaced) => {
      if (err) return reject(err);
      resolve(numReplaced);
    });
  });
}

function rdbRemove(query, options = {}) {
  return new Promise((resolve, reject) => {
    db_RDB.remove(query, options, (err, numRemoved) => {
      if (err) return reject(err);
      resolve(numRemoved);
    });
  });
}

async function rdbNextId() {
  const docs = await rdbFind({}, { id: 1, _id: 0 });
  const maxId = docs.reduce((max, d) => {
    const current = Number(d.id) || 0;
    return current > max ? current : max;
  }, 0);

  return maxId + 1;
}

// ========= Load initial data =========
app.get(`${BASE_RDB}/loadInitialData`, async (req, res) => {
  try {
    const count = await rdbCount({});

    if (count > 0) {
      return res.status(200).json({
        message: "La db contiene datos.",
        count
      });
    }

    const initial = [
      { id: 1, country: "Spain", year: 1995, productivity_hour: 570.84 },
      { id: 2, country: "Spain", year: 1996, productivity_hour: 589.7068541 },
      { id: 3, country: "Spain", year: 1997, productivity_hour: 631.27836 },
      { id: 4, country: "Spain", year: 1998, productivity_hour: 669.8616643 },
      { id: 5, country: "Spain", year: 1999, productivity_hour: 696.8961129 },

      { id: 6, country: "Cambodia", year: 1995, productivity_hour: 699.8581194 },
      { id: 7, country: "Cambodia", year: 1996, productivity_hour: 663.1780142 },
      { id: 8, country: "Cambodia", year: 1997, productivity_hour: 686.4500003 },
      { id: 9, country: "Cambodia", year: 1998, productivity_hour: 654.9528481 },
      { id: 10, country: "Cambodia", year: 1999, productivity_hour: 718.3701884 }
    ];

    for (const item of initial) {
      await rdbInsert({
        ...item,
        key: `${item.country}-${item.year}`
      });
    }

    return res.status(201).json({
      message: "La db ha sido inicializada con 10 datos.",
      count: initial.length
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// app.use(BASE_RDB, requireApiKey);

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

//=======================================//
//================= GET =================//
//=======================================//

app.get(BASE_RDB, async (req, res) => {
  try {
    const query = {};
    const allowedQueries = ["id", "country", "year", "productivity_hour", "from", "to"];
    const queryKeys = Object.keys(req.query);

    const invalidQuery = queryKeys.find(q => !allowedQueries.includes(q));
    if (invalidQuery) {
      return res.status(400).json({ error: "Bad Request" });
    }

    if (req.query.id) {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: "Bad Request" });
      }
      query.id = id;
    }

    if (req.query.country) {
      query.country = req.query.country;
    }

    if (req.query.productivity_hour) {
      const productivityHour = Number(req.query.productivity_hour);
      if (!Number.isFinite(productivityHour)) {
        return res.status(400).json({ error: "Bad Request" });
      }
      query.productivity_hour = productivityHour;
    }

    if (req.query.year && (req.query.from || req.query.to)) {
      return res.status(400).json({ error: "Bad Request" });
    }

    if (req.query.year) {
      const year = Number(req.query.year);
      if (!Number.isInteger(year)) {
        return res.status(400).json({ error: "Bad Request" });
      }
      query.year = year;
    } else if (req.query.from || req.query.to) {
      query.year = {};

      if (req.query.from) {
        const from = Number(req.query.from);
        if (!Number.isInteger(from)) {
          return res.status(400).json({ error: "Bad Request" });
        }
        query.year.$gte = from;
      }

      if (req.query.to) {
        const to = Number(req.query.to);
        if (!Number.isInteger(to)) {
          return res.status(400).json({ error: "Bad Request" });
        }
        query.year.$lte = to;
      }
    }

    const result = await rdbFind(query);
    result.sort((a, b) => a.year - b.year);

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET por country, con o sin rango
app.get(`${BASE_RDB}/:country`, async (req, res, next) => {
  try {
    const country = req.params.country;

    if (/^\d+$/.test(country)) {
      return next();
    }

    const query = { country };

    if (req.query.from || req.query.to) {
      const from = Number(req.query.from);
      const to = Number(req.query.to);

      if (!Number.isInteger(from) || !Number.isInteger(to)) {
        return res.status(400).json({ error: "Bad Request" });
      }

      query.year = { $gte: from, $lte: to };
    }

    const result = await rdbFind(query);
    result.sort((a, b) => a.year - b.year);

    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

// GET recurso único
app.get(`${BASE_RDB}/:country/:year`, async (req, res) => {
  try {
    const country = req.params.country;
    const year = Number(req.params.year);

    if (!Number.isInteger(year)) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const item = await rdbFindOne({ country, year });

    if (!item) {
      return res.status(404).json({ error: "Not Found" });
    }

    return res.status(200).json(item);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

//=======================================//
//================ POST =================//
//=======================================//

app.post(BASE_RDB, async (req, res) => {
  try {
    const obj = req.body;

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

    const created = {
      id: await rdbNextId(),
      country: obj.country,
      year: obj.year,
      productivity_hour: ph,
      key: `${obj.country}-${obj.year}`
    };

    await rdbInsert(created);

    return res.status(201).send();
  } catch (e) {
    if (e.errorType === "uniqueViolated") {
      return res.status(409).json({ error: "Conflict" });
    }
    return res.status(500).json({ error: e.message });
  }
});

//=======================================//
//================= PUT =================//
//=======================================//

app.put(`${BASE_RDB}/:country/:year`, async (req, res) => {
  try {
    const country = req.params.country;
    const year = Number(req.params.year);
    const obj = req.body;

    if (!Number.isInteger(year)) {
      return res.status(400).json({ error: "Bad Request" });
    }

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

    if (obj.country !== country || obj.year !== year) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const current = await rdbFindOne({ country, year }, { _id: 0, key: 0 });

    if (!current) {
      return res.status(404).json({ error: "Not Found" });
    }

    const numReplaced = await rdbUpdate(
      { country, year },
      {
        $set: {
          id: current.id,
          country: obj.country,
          year: obj.year,
          productivity_hour: ph,
          key: `${obj.country}-${obj.year}`
        }
      },
      {}
    );

    if (numReplaced === 0) {
      return res.status(404).json({ error: "Not Found" });
    }

    return res.status(200).send();
  } catch (e) {
    if (e.errorType === "uniqueViolated") {
      return res.status(409).json({ error: "Conflict" });
    }
    return res.status(500).json({ error: e.message });
  }
});

//=======================================//
//=============== DELETE ================//
//=======================================//

app.delete(`${BASE_RDB}/:country/:year`, async (req, res) => {
  try {
    const country = req.params.country;
    const year = Number(req.params.year);

    if (!Number.isInteger(year)) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const numRemoved = await rdbRemove({ country, year }, { multi: false });

    if (numRemoved === 0) {
      return res.status(404).json({ error: "Not Found" });
    }

    return res.status(200).send();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

app.delete(BASE_RDB, async (req, res) => {
  try {
    await rdbRemove({}, { multi: true });
    return res.status(200).send();
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

//=======================================//
//================ 405 ==================//
//=======================================//

app.all(BASE_RDB, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.all(`${BASE_RDB}/:country`, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.all(`${BASE_RDB}/:country/:year`, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});}

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

app.post(`${BASE_JMJ}/:id`, (req, res) => {
  res.status(405).json({error: `No se puede crear un elemento nuevo en la DB de JMJ.`})
});

//=======================================//
//============ FUNCIONES PRA ============//
//=======================================//

const BASE_PRA = `/api/v1/drought-stats`;
let db_PRA = [];

function calculaMediaDuracion(datos, pais) { //recibe los datos de la hoja de excel en JSON
    let subset = datos.filter(f => f.country === pais);

    if (subset.length === 0) {
        console.log("No hay datos para ese país");
        return;
    }

    let valores = subset
        .map(f => Number(f["duration_day"]))
        .filter(v => Number.isFinite(v));

    let suma = valores.reduce((acc, v) => acc + v, 0); 

    return suma / valores.length;
}

app.get("/samples/PRA", (req, res) => {
  try {
    let pais = req.query.pais;
    let datos = cargarDatos(EXCEL_FILE, SHEET_NAME_PRA);
    let resultado = calculaMediaDuracion(datos, pais);

    res.status(200).json({
      pais: pais,
      media_duracion: resultado
    });

  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

app.get(`${BASE_PRA}/loadInitialData`, (req, res) => {
  if (db_PRA.length > 0) {
    return res.status(200).json({
      message: "La db ya contiene datos.",
      count: db_PRA.length
    });
  }

  let initial = cargarDatos(EXCEL_FILE, SHEET_NAME_PRA);

  db_PRA = initial.map((x, i) => ({ id: i + 1, ...x }));

  app.use(BASE_PRA, requireApiKey);

  return res.status(201).json({
    message: `DB inicializada con ${db_PRA.length} datos.`,
    count: db_PRA.length
  });
});

//app.use(BASE_PRA, requireApiKey);

// -------- GET colección (200 OK) ----------
app.get(BASE_PRA, (req, res) => {
  res.status(200).json(db_PRA);
});

// -------- POST crear (201 / 400 / 409) ----------
app.post(BASE_PRA, (req, res) => {
  const obj = req.body;

  if ( !obj || typeof obj.country !== "string" || obj.country.trim().length === 0 || !obj.from_date || obj.severity_km2 === undefined || !Number.isFinite(Number(obj.severity_km2)) ) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const c = db_PRA.filter(x => x.country === obj.country && x.from_date === obj.from_date);
  if (c.length > 0) return res.status(409).json({ error: `Ya existe una sequía en ${obj.country} con fecha ${obj.from_date}` });

  const nuevo_id = db_PRA.length > 0 ? Math.max(...db_PRA.map(x => x.id)) + 1 : 1;
  const nuevaSequia = {
    id: nuevo_id,
    country: obj.country,
    from_date: obj.from_date,
    to_date: obj.to_date || obj.from_date,
    severity_km2: Number(obj.severity_km2),
    alert_level: obj.alert_level || null,
    alert_score: Number(obj.alert_score) || null,
    episode_alert_score: Number(obj.episode_alert_score) || null,
    duration_day: Number(obj.duration_day) || null
  };

  db_PRA.push(nuevaSequia);
  res.status(201).json(nuevaSequia);
});

// -------- DELETE colección (200 OK) ----------
app.delete(BASE_PRA, (req, res) => {
  db_PRA = [];
  res.status(200).json({ message: "Todos los datos borrados." });
});


// -------- GET por id (200 / 404) ----------
app.get(`${BASE_PRA}/:id`, (req, res) => { // ":id" se usa para indicar que hay un parametro en la url que indica el elemento en especifico
  const id = Number(req.params.id);
  const item = db_PRA.find(x => x.id === id);
  if (!item) return res.status(404).json({ error: `No se ha encontrado el objeto ${id}.` });
  res.status(200).json(item);
});

// -------- PUT por id (200 / 400 / 404 / 409) ----------
app.put(`${BASE_PRA}/:id`, (req, res) => {
  const id = Number(req.params.id);
  const obj = req.body;

  if (obj.id !== undefined && Number(obj.id) !== id) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const idx = db_PRA.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: "Not Found" });

  if (
    !obj ||
    typeof obj.country !== "string" ||
    obj.country.trim().length === 0 ||
    !obj.from_date ||
    obj.severity_km2 === undefined ||
    !Number.isFinite(Number(obj.severity_km2))
  ) {
    return res.status(400).json({ error: "Bad Request" });
  }

  const conflict = db_PRA.some(x => x.id !== id && x.country === obj.country && x.from_date === obj.from_date);
  if (conflict) return res.status(409).json({ error: "Conflict" });

  db_PRA[idx] = {
    id,
    country: obj.country,
    from_date: obj.from_date,
    to_date: obj.to_date || obj.from_date,
    severity_km2: Number(obj.severity_km2),
    alert_level: obj.alert_level || null,
    alert_score: Number(obj.alert_score) || null,
    episode_alert_score: Number(obj.episode_alert_score) || null,
    duration_day: Number(obj.duration_day) || null
  };

  res.status(200).json(db_PRA[idx]);
});

// -------- DELETE por id (200 / 404) ----------
app.delete(`${BASE_PRA}/:id`, (req, res) => {
  const id = Number(req.params.id);
  const idx = db_PRA.findIndex(x => x.id === id);
  if (idx === -1) return res.status(404).json({ error: `No se ha encontrado el objeto ${id}` });

  const deleted = db_PRA[idx];
  db_PRA.splice(idx, 1);
  res.status(200).json({ message: "Elemento eliminado.", deleted });
});

app.all(BASE_PRA, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

/* EJEMPLO PARA PROBAR

{
  "id": 8,
  "country": "Spain",
  "from_date": "2020-01-01",
  "severity_km2": 200
}

*/