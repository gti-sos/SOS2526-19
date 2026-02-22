"use strict";

const path = require("path");
const xlsx = require("xlsx");

const EXCEL_FILE = path.join(__dirname, "SOS2526-19-Propuesta.xlsx");
const SHEET_NAME = "Raúl";

const COUNTRY = process.argv[2] || "Spain";

// 👉 CAMPO NUMÉRICO (cambiado)
const NUMERIC_FIELD = "productivity_hour";


function loadDataFromExcel(file, sheetName) {

    const workbook = xlsx.readFile(file);
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
        throw new Error("No existe la hoja: " + sheetName);
    }

    return xlsx.utils.sheet_to_json(sheet, { defval: null });
}


function meanByCountry(rows, countryValue, field) {

    const subset = rows.filter(r => r.country === countryValue);

    if (subset.length === 0) {
        console.log("No hay datos para ese país");
        return;
    }

    const values = subset
        .map(r => Number(r[field]))
        .filter(v => Number.isFinite(v));

    const sum = values.reduce((acc, v) => acc + v, 0);

    return sum / values.length;
}


try {

    const data = loadDataFromExcel(EXCEL_FILE, SHEET_NAME);

    const result = meanByCountry(data, COUNTRY, NUMERIC_FIELD);

    console.log("=== MEDIA ===");
    console.log("Country:", COUNTRY);
    console.log("Campo:", NUMERIC_FIELD);
    console.log("Media:", result, "PPA");

} catch(err) {
    console.error(err.message);
}
