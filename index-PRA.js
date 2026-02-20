//PARA LEER TODAS LAS FILAS DEL CSV
/*
const fs = require("fs");
const csv = require("csv-parser");

const filas = [];

fs.createReadStream("drought-stats.csv")
  .pipe(csv())
  .on("data", (data) => filas.push(data))
  .on("end", () => {
    console.log(filas[0]);
  });

*/

const XLSX = require("xlsx");

const workbook = XLSX.readFile("SOS2526-19-Propuesta.xlsx");
const nombreHoja = workbook.SheetNames[3];
const hoja = workbook.Sheets[nombreHoja];
const datos = XLSX.utils.sheet_to_json(hoja);

//console.log(datos);

function calculaMediaDuracion(lista) {
    const grupos = {};

    datos.forEach(obj => {
        const clave = obj['country'];
        const valor = Number(obj['duration_day']);

        if (!grupos[clave]) {
        grupos[clave] = [];
        }

        grupos[clave].push(valor);
    });

    const resultado = {};

    for (const clave in grupos) {
        if (grupos[clave].length > 1) {
        const suma = grupos[clave].reduce((acc, val) => acc + val, 0);
        resultado[clave] = suma / grupos[clave].length;
        }
    }

    return resultado;
}

console.log(calculaMediaDuracion(datos));