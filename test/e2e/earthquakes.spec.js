import { test, expect } from '@playwright/test';

test('carga la página de gestión de terremotos', async ({ page }) => {

  await page.goto('http://localhost:3000/earthquakes');

  await expect(page).toHaveTitle(/Gestión de terremotos/);

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Gestión de terremotos'
    })
  ).toBeVisible();
});

test('crea, edita, filtra y borra terremotos', async ({ page }) => {

  await page.goto('http://localhost:3000/earthquakes');

  const country = `TestPais-${Date.now()}`;
  const fromdate = '2000-01-01';

  // =========================================================
  // CREAR
  // =========================================================

  const seccionCrear = page.locator('section.bloque').first();

  await seccionCrear
    .locator('#country')
    .fill(country);

  await seccionCrear
    .locator('#fromdate')
    .fill(fromdate);

  await seccionCrear
    .locator('#severity')
    .fill('6.5');

  await seccionCrear
    .locator('#alertlevel')
    .selectOption('Orange');

  await seccionCrear
    .locator('#depth')
    .fill('15');

  await seccionCrear
    .locator('#exposed_population')
    .fill('50000');

  await seccionCrear
    .getByRole('button', {
      name: 'Registrar terremoto'
    })
    .click();

  await expect(
    page.locator('.mensaje.exito')
  ).toContainText(
    'El terremoto se ha registrado correctamente.'
  );

  // =========================================================
  // VERIFICAR FILA CREADA
  // =========================================================

  const fila = page.locator('tbody tr', {
    hasText: country
  });

  await expect(fila).toBeVisible();

  await expect(fila).toContainText('6.5');

  // El texto visible es "Naranja", no "Orange"
  await expect(fila).toContainText('Naranja');

  await expect(fila).toContainText('15 km');

  await expect(fila).toContainText('50.000');

  // =========================================================
  // EDITAR
  // =========================================================

  await fila
    .getByRole('link', { name: 'Editar' })
    .click();

  await expect(page).toHaveURL(
    new RegExp(
      `/earthquakes/edit/${encodeURIComponent(country)}/${encodeURIComponent(fromdate)}`
    )
  );

  await expect(
    page.getByRole('heading', { level: 1 })
  ).toContainText('Editar terremoto');

  // usar id porque el label puede cambiar
  await page
    .locator('#severity')
    .fill('7.0');

  await page
    .getByRole('button', {
      name: 'Guardar cambios'
    })
    .click();

  await expect(
    page.locator('.mensaje.exito')
  ).toContainText(
    'Los cambios se han guardado correctamente.'
  );

  // =========================================================
  // VOLVER AL LISTADO
  // =========================================================

  await page.goto('http://localhost:3000/earthquakes');

  const filaActualizada = page.locator('tbody tr', {
    hasText: country
  });

  await expect(filaActualizada).toBeVisible();

  await expect(filaActualizada).toContainText('7');

  // =========================================================
  // FILTRAR POR PAÍS
  // =========================================================

  const seccionBuscar = page.locator('section.bloque').nth(1);

  // usamos nth() porque hay varios labels iguales
  await seccionBuscar
    .getByLabel('País')
    .fill(country);

  await seccionBuscar
    .getByRole('button', { name: 'Buscar' })
    .click();

  let filasFiltradas = page.locator('tbody tr');

  let count = await filasFiltradas.count();

  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {

    await expect(
      filasFiltradas.nth(i)
    ).toContainText(country);
  }

  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================

  await seccionBuscar
    .getByRole('button', {
      name: 'Limpiar búsqueda'
    })
    .click();

  // =========================================================
  // FILTRAR POR ALERTA
  // =========================================================

  await seccionBuscar
    .getByLabel('Nivel de alerta')
    .selectOption('Orange');

  await seccionBuscar
    .getByRole('button', { name: 'Buscar' })
    .click();

  filasFiltradas = page.locator('tbody tr');

  count = await filasFiltradas.count();

  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {

    await expect(
      filasFiltradas.nth(i)
    ).toContainText('Naranja');
  }

  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================

  await seccionBuscar
    .getByRole('button', {
      name: 'Limpiar búsqueda'
    })
    .click();

  // =========================================================
  // FILTRAR POR FECHA
  // =========================================================

  await seccionBuscar
    .getByLabel('Fecha de inicio')
    .fill(fromdate);

  await seccionBuscar
    .getByRole('button', { name: 'Buscar' })
    .click();

  filasFiltradas = page.locator('tbody tr');

  count = await filasFiltradas.count();

  expect(count).toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {

    await expect(
      filasFiltradas.nth(i)
    ).toContainText('2000-01-01');
  }

  // =========================================================
  // LIMPIAR FILTROS
  // =========================================================

  await seccionBuscar
    .getByRole('button', {
      name: 'Limpiar búsqueda'
    })
    .click();

  // =========================================================
  // BORRAR UNO
  // =========================================================

  const filaBorrar = page.locator('tbody tr', {
    hasText: country
  });

  await expect(filaBorrar).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await filaBorrar
    .getByRole('button', {
      name: 'Eliminar'
    })
    .click();

  await expect(
    page.locator('.mensaje.exito')
  ).toContainText(
    `El terremoto de "${country}"`
  );

  // =========================================================
  // CARGAR DATOS INICIALES
  // =========================================================

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page
    .getByRole('button', {
      name: 'Cargar datos iniciales'
    })
    .click();

  await expect(
    page.locator('.mensaje.exito')
  ).toContainText(
    'Datos iniciales cargados correctamente.'
  );

  // =========================================================
  // BORRAR TODOS
  // =========================================================

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page
    .getByRole('button', {
      name: 'Borrar todos'
    })
    .click();

  await expect(
    page.locator('.mensaje.exito')
  ).toContainText(
    'Todos los terremotos se han eliminado correctamente.'
  );

  await expect(
    page.locator('tbody tr')
  ).toHaveCount(0);

  // =========================================================
  // RECARGAR DATOS
  // =========================================================

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page
    .getByRole('button', {
      name: 'Cargar datos iniciales'
    })
    .click();

  await expect(
    page.locator('.mensaje.exito')
  ).toContainText(
    'Datos iniciales cargados correctamente.'
  );

  await expect(
    page.locator('tbody tr').first()
  ).toBeVisible();

  // =========================================================
  // VERIFICAR LISTADO
  // =========================================================

  const filasCount = await page
    .locator('tbody tr')
    .count();

  expect(filasCount).toBeGreaterThan(0);

  const primeraFila = page
    .locator('tbody tr')
    .first();

  await expect(
    primeraFila.locator('td').nth(0)
  ).not.toBeEmpty();

  await expect(
    primeraFila.locator('td').nth(1)
  ).not.toBeEmpty();

  await expect(
    primeraFila.locator('td').nth(3)
  ).not.toBeEmpty();
});