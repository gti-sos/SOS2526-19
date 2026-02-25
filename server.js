"use strict";

const express = require("express");
const path = require("path");

const app = express();

// Render te da el puerto en process.env.PORT
const PORT = process.env.PORT || 3000;

// 1) Página estática /about (HTML con express.static)
app.use("/about", express.static(path.join(__dirname, "public")));

// 2) Ruta dinámica /cool
app.get("/cool", (req, res) => {
  const now = new Date();
  res.send(`
    <h1>Cool route 😎</h1>
    <p>Fecha y hora: ${now.toISOString()}</p>
    <p>Un número random: ${Math.floor(Math.random() * 1000)}</p>
  `);
});

// Raíz (opcional, para comprobar que funciona)
app.get("/", (req, res) => {
  res.send('<h1>OK</h1><p>Prueba <a href="/cool">/cool</a> y <a href="/about">/about</a></p>');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});