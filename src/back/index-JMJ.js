//=======================================//
//============ FUNCIONES JMJ ============//
//=======================================//

import {cargarDatos, EXCEL_FILE} from '../../index.js'
import Datastore from '@seald-io/nedb'; //const Datastore = require("@seald-io/nedb")

const SHEET_NAME_JMJ = "Javier"; 
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



export function loadBackendJMJ(app){

    app.get("/samples/JMJ", (req, res) => {
        try {
            let PAIS = req.query.pais || "Iran";
            let datos = cargarDatos(EXCEL_FILE, SHEET_NAME_JMJ);
            let resultado = mediaSeveridadPorPais(datos, PAIS);

            res.status(200).json({
                pais: PAIS,
                media_severidad: resultado
            });
        } catch (e) {
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

        if (!obj || typeof obj.country !== "string" || obj.country.trim().length === 0 || !obj.fromdate || obj.severity === undefined || !Number.isFinite(Number(obj.severity))) {
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
        res.status(405).json({ error: `No se puede editar completamente la DB de JMJ.` })
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
}

