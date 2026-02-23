"use strict";

const path = require("path");
const xlsx = require("xlsx");

const ARCHIVO_EXCEL = path.join(__dirname, "SOS2526-19-Propuesta.xlsx");
const NOMBRE_HOJA = "Javier";

const PAIS = process.argv[2] || "Iran";

function cargarDatos(archivo, hoja) {
    const libro = xlsx.readFile(archivo);
    const sheet = libro.Sheets[hoja];

    if (!sheet) {
        throw new Error("No existe la hoja: " + hoja);
    }

    return xlsx.utils.sheet_to_json(sheet, { defval: null });
}

function mediaSeveridadPorPais(filas, pais) {
    const subset = filas.filter(f => f.country === pais);

    if (subset.length === 0) {
        console.log("No hay datos para ese país");
        return;
    }

    const valores = subset
        .map(f => Number(f["severity"]))
        .filter(v => Number.isFinite(v));

    const suma = valores.reduce((acc, v) => acc + v, 0);

    return suma / valores.length;
}

try {
    const datos = cargarDatos(ARCHIVO_EXCEL, NOMBRE_HOJA);

    const resultado = mediaSeveridadPorPais(datos, PAIS);

    console.log("=== MEDIA SEVERIDAD ===");
    console.log("País:", PAIS);
    console.log("Media severidad:", resultado);

} catch (err) {
    console.error(err.message);
}