"use strict";

import xlsx from 'xlsx';
import dataStore from 'nedb'; //const Datastore = require("@seald-io/nedb")

// ---------------- VARIABLES BASE DE DATOS ---------------- //
const EXCEL_FILE = "./SOS2526-19-Propuesta.xlsx";
const SHEET_NAME_JMJ = "Javier"; 
const BASE_JMJ = `/api/v1/earthquakes`;

const db = new dataStore({ filename: "./earthquakes.db", autoload: true });

db.count({}, (err, count) => {
	if (count === 0) {
		const initial = cargarDatos(EXCEL_FILE, SHEET_NAME_JMJ);
		const db_JMJ = initial.map((x) => ({ ...x }));
		
		db.insert(db_JMJ, (err) => {
			if (err) console.error("Error insertando datos iniciales:", err);
		});
	}
});

// ---------------- VARIABLES SCRIPT ---------------- //
const CAMPOS_PERMITIDOS = new Set([	"country", "fromdate", "todate", "severity", "alertlevel", "depth", "exposed_population" ]);
const limit = 10;

// ---------------- FUNCIONES BACKEND ---------------- //
export function loadBackendJMJ(app) {
	// ---------------- REDIRECCIÓN A DOCS ---------------- //
	app.get(`${BASE_JMJ}/docs`, (req, res) => {
		res.redirect("https://documenter.getpostman.com/view/52414959/2sBXigMZPE");
	});

	// ---------------- LOAD INITIAL DATA ---------------- //

	app.get(`${BASE_JMJ}/loadInitialData`, (req, res) => {
		db.count({}, (err, count) => {
			if (count === 0) {
				const initial = cargarDatos(EXCEL_FILE, SHEET_NAME_JMJ);
				const db_JMJ = initial.map((x) => ({ ...x }));
				
				db.insert(db_JMJ, (err) => {
					if (err) console.error("Error insertando datos iniciales:", err);
				});
			}
		});

		return res.status(201).json({ message: `DB inicializada.` });
	});

	// ---------------- COLECCIONES ---------------- //
	// -------- GET colección (200 OK) ----------
	app.get(BASE_JMJ, (req, res) => {
		const { page: qPage, ...filters } = req.query;
		const page = parseInt(qPage) || 1;
		const skip = (page - 1) * limit;

		const query = {};
		for (const campo of CAMPOS_PERMITIDOS) {
			if (filters[campo] !== undefined) {
				const val = filters[campo];
				const num = Number(val);
				query[campo] = (!isNaN(num) && val.trim() !== '') ? num : val;
			}
		}

		db.count(query, (err, total) => {
			if (err) return res.status(500).json({ error: "Error al contar datos." });

			db.find(query).skip(skip).limit(limit).exec((err, docs) => {
				if (err) return res.status(500).json({ error: "Error al obtener datos." });
				res.status(200).json(docs.map(({ _id, ...rest }) => rest));
			});
		});
	});

	// -------- POST crear (201 / 400 / 409) ----------
	app.post(BASE_JMJ, (req, res) => {
		const error = validarEstructura(req.body);
		if (error) return res.status(400).json({ error: `Bad Request: ${error}` });

		const obj = req.body;

		db.findOne({ country: obj.country, fromdate: obj.fromdate }, (err, earthquakeExisting) => {
			if (err) return res.status(500).json({ error: "Error buscando datos conflicto." });
			if (earthquakeExisting) return res.status(409).json({ error: `Ya existe un terremoto en ${obj.country} con fecha ${obj.fromdate}.` });

			const nuevoTerremoto = {
				country: obj.country,
				fromdate: obj.fromdate,
				todate: obj.todate || obj.fromdate,
				severity: Number(obj.severity),
				alertlevel: obj.alertlevel || null,
				depth: obj.depth !== undefined ? Number(obj.depth) : null,
				exposed_population: obj.exposed_population !== undefined ? Number(obj.exposed_population) : null
			};

			db.insert(nuevoTerremoto, (err, earthquake) => {
				if (err) return res.status(500).json({ error: "Error al insertar el nuevo dato." });
				let { _id, ...rest } = earthquake;
				res.status(201).json(rest);
			});
		});
	});

	// -------- DELETE colección (200 OK) ----------
	app.delete(BASE_JMJ, (req, res) => {
		db.remove({}, { multi: true }, (err) => {
			if (err) return res.status(500).json({ error: "Error al borrar datos." });
			res.status(200).json({ message: "Todos los datos borrados." });
		});
	});

	// -------- PUT colección (no está permitido) ----------
	app.put(BASE_JMJ, (req, res) => {
		res.status(405).json({ error: `No se puede editar completamente la DB de JMJ.` });
	});

	// ---------------- ID ESPECIFICO ---------------- //
	// -------- GET por id (200 / 404) ----------
	app.get(`${BASE_JMJ}/:country/:date`, (req, res) => {
		const { country, date } = req.params;
		const query = {};

		if (country && date) { query.country = country; query.fromdate = date; }

		db.findOne(query, (err, item) => {
			if (err) return res.status(500).json({ error: "Error en la base de datos." });
			if (!item) return res.status(404).json({ error: "No se encontraron resultados." });

			let { _id, ...rest } = item;
			res.status(200).json(rest);
		});
	});

	// -------- PUT por id (200 / 400 / 404 / 409) ----------
	app.put(`${BASE_JMJ}/:country/:date`, (req, res) => {
		const { country, date } = req.params;

		const error = validarEstructura(req.body);
		if (error) return res.status(400).json({ error: `Bad Request: ${error}` });

		const obj = req.body;

		db.findOne({ country: country, fromdate: date }, (err, item) => {
			if (err) return res.status(500).json({ error: "Error buscando datos." });
			if (!item) return res.status(404).json({ error: `No existe un terremoto en ${country} con fecha ${date}.` });

			db.findOne({ country: obj.country, fromdate: obj.fromdate }, (err, conflict) => {
				if (err) return res.status(500).json({ error: "Error buscando conflicto." });
				if (conflict && conflict._id.toString() !== item._id.toString()) return res.status(409).json({ error: `Ya existe un terremoto en ${obj.country} con fecha ${obj.fromdate}.` });

				const updated = {
					country: obj.country,
					fromdate: obj.fromdate,
					todate: obj.todate || obj.fromdate,
					severity: Number(obj.severity),
					alertlevel: obj.alertlevel || null,
					depth: obj.depth !== undefined ? Number(obj.depth) : null,
					exposed_population: obj.exposed_population !== undefined ? Number(obj.exposed_population) : null
				};

				db.update({ _id: item._id }, { $set: updated }, {}, (err) => {
					if (err) return res.status(500).json({ error: "Error al actualizar." });
					res.status(200).json(updated);
				});
			});
		});
	});

	// -------- DELETE por id (200 / 404) ----------
	app.delete(`${BASE_JMJ}/:country/:date`, (req, res) => {
		const { country, date } = req.params;

		db.findOne({ country, fromdate: date }, (err, item) => {
			if (err)   return res.status(500).json({ error: "Error buscando datos." });
			if (!item) return res.status(404).json({ error: `No se ha encontrado un terremoto en ${country} con fecha ${date}.` });

			db.remove({ _id: item._id }, {}, (err) => {
				if (err) return res.status(500).json({ error: "Error al borrar." });
				let { _id, ...rest } = item;
				res.status(200).json({ message: "Elemento eliminado.", deleted: rest });
			});
		});
	});

	// -------- POST a country y date (no está permitido) ----------
	app.post(`${BASE_JMJ}/:country/:date`, (req, res) => {
		res.status(405).json({ error: `No se puede hacer post sobre un elemento ya creado.` });
	});
}

function cargarDatos(archivo, hoja) {
	let libro = xlsx.readFile(archivo);
	let sheet = libro.Sheets[hoja];

	if (!sheet) throw new Error("No existe la hoja: " + hoja);
	
	const datos = xlsx.utils.sheet_to_json(sheet, { defval: null, raw: true });

	return datos.map(row => ({
		...row,
		fromdate: parsearFecha(row.fromdate),
		todate: parsearFecha(row.todate),
	}));
}

function parsearFecha(valor) {
	if (!valor) return null;

	if (typeof valor === "number") {
		const date = xlsx.SSF.parse_date_code(valor);
		return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
	}

	if (typeof valor === "string") return valor.split(" ")[0];
	return null;
}

function validarEstructura(obj) {
	if (!obj || typeof obj !== "object" || Array.isArray(obj)) return "El cuerpo debe ser un objeto JSON.";

	const camposRecibidos = Object.keys(obj);
	const camposExtras = camposRecibidos.filter(c => !CAMPOS_PERMITIDOS.has(c));
	if (camposExtras.length > 0) return `Campos no permitidos: ${camposExtras.join(", ")}.`;

	if (typeof obj.country !== "string" || obj.country.trim().length === 0) return "El campo 'country' es obligatorio y debe ser un string no vacío.";
	if (!obj.fromdate) return "El campo 'fromdate' es obligatorio.";
	if (obj.severity === undefined || !Number.isFinite(Number(obj.severity))) return "El campo 'severity' es obligatorio y debe ser un número finito.";

	return null;
}