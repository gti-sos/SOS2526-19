//=======================================//
//============ FUNCIONES RDB ============//
//=======================================//

import { verifyToken } from "./jwtAuth.js";

import Datastore from '@seald-io/nedb';

const SHEET_NAME_RDB = "Raúl";


export function loadBackendRDB(app){
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

function rdbFindPaged(query = {}, skip = 0, limit = 0, projection = { _id: 0, key: 0 }) {
  return new Promise((resolve, reject) => {
    db_RDB
      .find(query, projection)
      .sort({ year: 1, country: 1 })
      .skip(skip)
      .limit(limit)
      .exec((err, docs) => {
        if (err) return reject(err);
        resolve(docs);
      });
  });
}

const RDB_RESOURCE_FIELDS = [
  "country",
  "year",
  "productivity_hour",
  "avg_annual_hours",
  "gpd_per_capita",
  "human_capital",
  "capital_stock_worker",
  "employment",
  "household_consum",
  "investment_share"
];

const RDB_QUERY_FIELDS = [
  "id",
  "country",
  "year",
  "productivity_hour",
  "avg_annual_hours",
  "gpd_per_capita",
  "human_capital",
  "capital_stock_worker",
  "employment",
  "household_consum",
  "investment_share",
  "from",
  "to",
  "offset",
  "limit"
];

function hasOnlyAllowedKeys(obj, allowedKeys) {
  return Object.keys(obj).every(k => allowedKeys.includes(k));
}

function parseFiniteNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeRdbBody(obj) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false };
  }

  if (!hasOnlyAllowedKeys(obj, RDB_RESOURCE_FIELDS)) {
    return { ok: false };
  }

  if (typeof obj.country !== "string" || obj.country.trim().length === 0) {
    return { ok: false };
  }

  if (!Number.isInteger(obj.year)) {
    return { ok: false };
  }

  const numericFields = [
    "productivity_hour",
    "avg_annual_hours",
    "gpd_per_capita",
    "human_capital",
    "capital_stock_worker",
    "employment",
    "household_consum",
    "investment_share"
  ];

  const normalized = {
    country: obj.country.trim(),
    year: obj.year
  };

  for (const field of numericFields) {
    if (obj[field] === undefined || obj[field] === null) {
      return { ok: false };
    }

    const value = parseFiniteNumber(obj[field]);
    if (value === null) {
      return { ok: false };
    }

    normalized[field] = value;
  }

  return { ok: true, value: normalized };
}

function buildRdbQueryFromParams(params) {
  const query = {};

  if (!hasOnlyAllowedKeys(params, RDB_QUERY_FIELDS)) {
    return { ok: false };
  }

  if (params.id !== undefined) {
    const id = Number(params.id);
    if (!Number.isInteger(id)) return { ok: false };
    query.id = id;
  }

  if (params.country !== undefined) {
    if (typeof params.country !== "string" || params.country.trim().length === 0) {
      return { ok: false };
    }
    query.country = params.country.trim();
  }

  if (params.year !== undefined && (params.from !== undefined || params.to !== undefined)) {
    return { ok: false };
  }

  if (params.year !== undefined) {
    const year = Number(params.year);
    if (!Number.isInteger(year)) return { ok: false };
    query.year = year;
  } else if (params.from !== undefined || params.to !== undefined) {
    query.year = {};

    if (params.from !== undefined) {
      const from = Number(params.from);
      if (!Number.isInteger(from)) return { ok: false };
      query.year.$gte = from;
    }

    if (params.to !== undefined) {
      const to = Number(params.to);
      if (!Number.isInteger(to)) return { ok: false };
      query.year.$lte = to;
    }
  }

  const numericFields = [
    "productivity_hour",
    "avg_annual_hours",
    "gpd_per_capita",
    "human_capital",
    "capital_stock_worker",
    "employment",
    "household_consum",
    "investment_share"
  ];

  for (const field of numericFields) {
    if (params[field] !== undefined) {
      const value = Number(params[field]);
      if (!Number.isFinite(value)) return { ok: false };
      query[field] = value;
    }
  }

  let offset = 0;
  let limit = 0;

  if (params.offset !== undefined) {
    offset = Number(params.offset);
    if (!Number.isInteger(offset) || offset < 0) return { ok: false };
  }

  if (params.limit !== undefined) {
    limit = Number(params.limit);
    if (!Number.isInteger(limit) || limit <= 0) return { ok: false };
  }

  return { ok: true, query, offset, limit };
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
  {
    id: 1,
    country: "Spain",
    year: 1995,
    productivity_hour: 570.84,
    avg_annual_hours: 1735.91,
    gpd_per_capita: 24852.84,
    human_capital: 2.55,
    capital_stock_worker: 347173.85,
    employment: 13.801,
    household_consum: 736156.313,
    investment_share: 0.278
  },
  {
    id: 2,
    country: "Spain",
    year: 1996,
    productivity_hour: 589.707,
    avg_annual_hours: 1740.43,
    gpd_per_capita: 25480.924,
    human_capital: 2.568,
    capital_stock_worker: 355192.076,
    employment: 14.006,
    household_consum: 756520.875,
    investment_share: 0.27
  },
  {
    id: 3,
    country: "Spain",
    year: 1997,
    productivity_hour: 631.278,
    avg_annual_hours: 1743.21,
    gpd_per_capita: 27086.133,
    human_capital: 2.585,
    capital_stock_worker: 341476.716,
    employment: 14.537,
    household_consum: 815878.75,
    investment_share: 0.257
  },
  {
    id: 4,
    country: "Spain",
    year: 1998,
    productivity_hour: 669.862,
    avg_annual_hours: 1752.44,
    gpd_per_capita: 29000.335,
    human_capital: 2.602,
    capital_stock_worker: 329083.85,
    employment: 15.184,
    household_consum: 882910.813,
    investment_share: 0.259
  },
  {
    id: 5,
    country: "Spain",
    year: 1999,
    productivity_hour: 696.896,
    avg_annual_hours: 1758.4,
    gpd_per_capita: 30114.034,
    human_capital: 2.619,
    capital_stock_worker: 316934.242,
    employment: 15.89,
    household_consum: 926556.875,
    investment_share: 0.269
  },

  {
    id: 6,
    country: "Cambodia",
    year: 1995,
    productivity_hour: 699.858,
    avg_annual_hours: 2108.37,
    gpd_per_capita: 1325.011,
    human_capital: 1.484,
    capital_stock_worker: 6080.358,
    employment: 4.423,
    household_consum: 12322.214,
    investment_share: 0.144
  },
  {
    id: 7,
    country: "Cambodia",
    year: 1996,
    productivity_hour: 663.178,
    avg_annual_hours: 2112.92,
    gpd_per_capita: 1187.25,
    human_capital: 1.495,
    capital_stock_worker: 6201.131,
    employment: 4.567,
    household_consum: 12917.146,
    investment_share: 0.156
  },
  {
    id: 8,
    country: "Cambodia",
    year: 1997,
    productivity_hour: 686.45,
    avg_annual_hours: 2122.88,
    gpd_per_capita: 1184.372,
    human_capital: 1.507,
    capital_stock_worker: 6526.872,
    employment: 4.637,
    household_consum: 12672.336,
    investment_share: 0.167
  },
  {
    id: 9,
    country: "Cambodia",
    year: 1998,
    productivity_hour: 654.953,
    avg_annual_hours: 2158.5,
    gpd_per_capita: 1160.781,
    human_capital: 1.518,
    capital_stock_worker: 6603.859,
    employment: 4.846,
    household_consum: 13797.22,
    investment_share: 0.14
  },
  {
    id: 10,
    country: "Cambodia",
    year: 1999,
    productivity_hour: 718.37,
    avg_annual_hours: 2183.7,
    gpd_per_capita: 1315.181,
    human_capital: 1.529,
    capital_stock_worker: 6814.495,
    employment: 5.101,
    household_consum: 14829.981,
    investment_share: 0.209
  }
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


app.get(`${BASE_RDB}/docs`, (req, res) => {
  res.redirect("https://documenter.getpostman.com/view/52424600/2sBXigKYBq");
});

// app.use(BASE_RDB, requireApiKey);


//=======================================//
//================= GET =================//
//=======================================//

app.get(BASE_RDB, async (req, res) => {
  try {
    const built = buildRdbQueryFromParams(req.query);

    if (!built.ok) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const result = await rdbFindPaged(built.query, built.offset, built.limit);
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

    const built = buildRdbQueryFromParams({
      ...req.query,
      country
    });

    if (!built.ok) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const result = await rdbFindPaged(built.query, built.offset, built.limit);
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

app.post(BASE_RDB, verifyToken, async (req, res) => {
  try {
    const normalized = normalizeRdbBody(req.body);

    if (!normalized.ok) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const created = {
      id: await rdbNextId(),
      ...normalized.value,
      key: `${normalized.value.country}-${normalized.value.year}`
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

app.put(`${BASE_RDB}/:country/:year`, verifyToken, async (req, res) => {
  try {
    const country = req.params.country;
    const year = Number(req.params.year);

    if (!Number.isInteger(year)) {
      return res.status(400).json({ error: "Bad Request" });
    }

    const normalized = normalizeRdbBody(req.body);

    if (!normalized.ok) {
      return res.status(400).json({ error: "Bad Request" });
    }

    if (
      normalized.value.country !== country ||
      normalized.value.year !== year
    ) {
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
          ...normalized.value,
          key: `${normalized.value.country}-${normalized.value.year}`
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

app.delete(`${BASE_RDB}/:country/:year`, verifyToken, async (req, res) => {
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

app.delete(BASE_RDB, verifyToken, async (req, res) => {
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