"use strict";

const XLSX = require("xlsx");

const ARCHIVO_EXCEL = "./SOS2526-19-Propuesta.XLSX";
const NOMBRE_HOJA = "Javier";

function cargarDatos(archivo, hoja) {
    let libro = XLSX.readFile(archivo);
    let sheet = libro.Sheets[hoja];

    if (!sheet) throw new Error("No existe la hoja: " + hoja);
    return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

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

//////////////////////// TEST ////////////////////////

let PAIS = "Iran";
let datos = cargarDatos(ARCHIVO_EXCEL, NOMBRE_HOJA);
let resultado = mediaSeveridadPorPais(datos, PAIS);

console.log("=== MEDIA SEVERIDAD ===");
console.log("País:", PAIS);
console.log("Media severidad:", resultado);