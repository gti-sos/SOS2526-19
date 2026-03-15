import dataStore from '@seald-io/nedb';
import xlsx from "xlsx";

const EXCEL_FILE = "./SOS2526-19-Propuesta.xlsx";
//import EXCEL_SHEET_FILE

//=======================================//
//============ FUNCIONES PRA ============//
//=======================================//

const BASE_PRA = `/api/v1/drought-stats`;

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

export function loadBackendPRA(app) {
  const db_PRA = new dataStore({ filename: "droughts-stats.db", autoload: true });

// ========= Load initial data =========
  app.get(`${BASE_PRA}/loadInitialData`, async (req, res) => {

    db_PRA.count({}, async (err, count) => {

      if (err) {
        return res.status(500).send("Database error");
      }

      if (count === 0) {

        try {

          const initial = await cargarDatos(EXCEL_FILE, SHEET_NAME_PRA);

          db_PRA.insert(initial, (err, docs) => {

            if (err) {
              return res.status(500).send("Error inserting data");
            }

            return res.status(201).send({
              message: "Initial data loaded",
              total: docs.length
            });

          });

        } catch (error) {
          return res.status(500).send("Error loading data from sheet");
        }

      } else {

        return res.status(409).send({
          message: "Database already initialized"
        });

      }

    });

  });


  //app.use(BASE_PRA, requireApiKey);

  // -------- GET colección (200 OK) ----------
  app.get(`${BASE_PRA}`, (req, res) => {

    const query = {};
    // Filtro opcional por description
    if (req.query.description) {
      query.description = req.query.description;
    }

    // Filtro opcional por alert_level
    if (req.query.alert_level) {
      query.alert_level = req.query.alert_level;
    }

    // Filtro opcional por alert_score exacto
    if (req.query.alert_score) {
      query.alert_score = parseInt(req.query.alert_score);
    }

    // Filtro opcional por episode_alert_score exacto
    if (req.query.episode_alert_score) {
      query.episode_alert_score = parseFloat(req.query.episode_alert_score);
    }

    // Filtro opcional por country
    if (req.query.country) {
      query.country = req.query.country;
    }

    //Filtro de rango entre from_date y to_date
    if (req.query.from_date || req.query.to_date) {
      query.from_date = {};
      query.to_date = {};

      if (req.query.from_date) {
        const from = parseInt(req.query.from_date);
        if (!isNaN(from)) {
          query.from_date.$gte = from; // from_date >= valor
        } else {
          return res.status(400).send({ error: "from_date must be a number" });
        }
      }

      if (req.query.to_date) {
        const to = parseInt(req.query.to_date);
        if (!isNaN(to)) {
          query.to_date.$lte = to; // to_date <= valor
        } else {
          return res.status(400).send({ error: "to_date must be a number" });
        }
      }

      // Si no hay límites válidos, quitamos el filtro
      if (Object.keys(query.from_date).length === 0) delete query.from_date;
      if (Object.keys(query.to_date).length === 0) delete query.to_date;
    }
/*
    // Filtro opcional por severity_km2 mínimo
    if (req.query.min_severity) {
      const minSeverity = parseInt(req.query.min_severity);
      query.severity_km2 = { $gte: minSeverity };
    }

    // Filtro opcional por severity_km2 máximo
    if (req.query.max_severity) {
      const maxSeverity = parseInt(req.query.max_severity);
      query.severity_km2 = query.severity_km2 || {};
      query.severity_km2.$lte = maxSeverity;
    }
*/

    // Filtro opcional por severity_km2 exacto
    if (req.query.severity_km2) {
      query.severity_km2 = parseInt(req.query.severity_km2);
    }

    // Filtro opcional por iso
    if (req.query.iso) {
      query.iso = req.query.iso;
    }

    // Filtro opcional por gdacs_id
    if (req.query.gdacs_id) {
      query.gdacs_id = req.query.gdacs_id;
    }

    // Filtro opcional por duration_day exacto
    if (req.query.duration_day) {
      query.duration_day = parseInt(req.query.duration_day);
    }

    // Filtro opcional por impact
    if (req.query.impact) {
      query.impact = req.query.impact;
    }

    // Filtro opcional por longitude exacto
    if (req.query.longitude) {
      query.longitude = parseFloat(req.query.longitude);
    }

    // Filtro opcional por latitude exacto
    if (req.query.latitude) {
      query.latitude = parseFloat(req.query.latitude);
    }

    db_PRA.find(query, (err, docs) => {

      if (err) {
        return res.status(500).send({ error: "Database error" });
      }

      if (docs.length === 0) {
        return res.status(404).send({ message: "No resources found" });
      }

      return res.status(200).json(docs.map((c)=>{
        delete c._id; return c;
      }));

    });

  });

  // -------- GET recurso único (200 OK) ----------

  app.get(`${BASE_PRA}/:country/:from_date`, (req, res) => {

    const country = req.params.country;
    const from_date = parseInt(req.params.from_date);

    db_PRA.findOne({ country: country, from_date: from_date }, (err, doc) => {

      if (err) {
        return res.status(500).send({ error: "Database error" });
      }

      if (!doc) {
        return res.status(404).send({ message: "Resource not found" });
      }
      delete doc._id;
      return res.status(200).json(doc);

    });

  });

  // -------- POST crear (201 / 400 / 409) ----------
  app.post(`${BASE_PRA}`, (req, res) => {

    const { country, from_date, to_date, severity_km2 } = req.body;

    // Validar campos obligatorios
    if (!country || !from_date || !to_date || !severity_km2) {
      return res.status(400).json({
        error: "Missing required fields: country, from_date, to_date, severity_km2"
      });
    }

    // Validar tipos
    const fromDateNum = parseInt(from_date);
    const toDateNum = parseInt(to_date);
    const severityNum = parseFloat(severity_km2);

    if (isNaN(fromDateNum) || isNaN(toDateNum) || isNaN(severityNum)) {
      return res.status(400).json({ error: "from_date, to_date must be integers and severity_km2 must be a number" });
    }

    // Verificar si ya existe un registro con el mismo country + from_date
    db_PRA.findOne({ country: country, from_date: fromDateNum }, (err, existing) => {

      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (existing) {
        return res.status(409).json({
          error: "A record with the same country and from_date already exists",
          existing
        });
      }

      // Crear nuevo registro
      const newRecord = {
        country,
        from_date: fromDateNum,
        to_date: toDateNum,
        severity_km2: severityNum
      };

      delete newRecord._id;

      db_PRA.insert(newRecord, (err, doc) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }

        return res.status(201).json({
          message: "Record created successfully",
          record: doc
        });

      });

    });

  });

  // -------- PUT --------------------------------
app.put(`${BASE_PRA}/:country/:from_date`, (req, res) => {

  const originalCountry = req.params.country;
  const originalFromDate = parseInt(req.params.from_date);

  const { country, from_date, to_date, severity_km2 } = req.body;

  // Validación de campos obligatorios
  if (!country || !from_date || !to_date || !severity_km2) {
    return res.status(400).json({
      error: "Missing required fields: country, from_date, to_date, severity_km2"
    });
  }

  const newFromDate = parseInt(from_date);
  const newToDate = parseInt(to_date);
  const newSeverity = parseFloat(severity_km2);

  if (isNaN(newFromDate) || isNaN(newToDate) || isNaN(newSeverity)) {
    return res.status(400).json({
      error: "from_date, to_date must be integers and severity_km2 must be a number"
    });
  }

  // Buscar el registro original
  db_PRA.findOne({ country: originalCountry, from_date: originalFromDate }, (err, originalRecord) => {

    if (err) return res.status(500).json({ error: "Database error" });
    if (!originalRecord) return res.status(404).json({ message: "Resource not found" });

    // Verificar que no exista otro registro con la combinación country + from_date deseada
    db_PRA.findOne(
      { country: country, from_date: newFromDate, _id: { $ne: originalRecord._id } },
      (err, conflict) => {

        if (err) return res.status(500).json({ error: "Database error" });

        if (conflict) {
          return res.status(409).json({
            error: "Another record with the same country and from_date already exists",
            existing: conflict
          });
        }

        // Actualizar el registro original
        const updatedRecord = {
          country,
          from_date: newFromDate,
          to_date: newToDate,
          severity_km2: newSeverity
        };

        db_PRA.update(
          { _id: originalRecord._id },
          updatedRecord,
          {},
          (err, numUpdated) => {
            if (err) return res.status(500).json({ error: "Database error" });

            return res.status(200).json({
              message: "Record updated successfully",
              updated: updatedRecord
            });
          }
        );

      }
    );

  });

});

  // -------- DELETE colección (200 OK) ----------
  app.delete(`${BASE_PRA}`, (req, res) => {

    db_PRA.remove({}, { multi: true }, (err, numRemoved) => {

      if (err) {
        return res.status(500).send({ error: "Database error" });
      }

      return res.status(200).json({
        message: "All records deleted",
        totalDeleted: numRemoved
      });

    });

  });


  app.delete(`${BASE_PRA}/:country/:from_date`, (req, res) => {

    const country = req.params.country;
    const fromDate = parseInt(req.params.from_date);

    if (isNaN(fromDate)) {
      return res.status(400).json({ error: "from_date must be a number" });
    }

    db_PRA.remove(
      { country: country, from_date: fromDate },
      {},
      (err, numRemoved) => {

        if (err) {
          return res.status(500).json({ error: "Database error" });
        }

        if (numRemoved === 0) {
          return res.status(404).json({ message: "Resource not found" });
        }

        return res.status(200).json({
          message: "Resource deleted successfully",
          deleted: numRemoved
        });

      }
    );

  });

//=======================================//
//================ 405 ==================//
//=======================================//

app.all(BASE_PRA, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.all(`${BASE_PRA}/:country`, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

app.all(`${BASE_PRA}/:country/:from_date`, (req, res) => {
  res.status(405).json({ error: "Method Not Allowed" });
});

}



/* EJEMPLO PARA PROBAR

{
  "country": "Spain",
  "from_date": "2020",
  "to_date": 2022,
  "severity_km2": 200
}

*/