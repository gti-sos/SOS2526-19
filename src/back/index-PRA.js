import {cargarDatos, EXCEL_FILE} from './index.js'
//import EXCEL_SHEET_FILE

//=======================================//
//============ FUNCIONES PRA ============//
//=======================================//

const BASE_PRA = `/api/v1/drought-stats`;
let db_PRA = [];
const SHEET_NAME_PRA = "Pablo";
/*
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
*/

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