import { test, expect } from '@playwright/test';

test('carga la página de gestión de terremotos', async ({ page }) => {
  await page.goto('http://localhost:3000/earthquakes');

  await expect(page).toHaveTitle(/Gestión de terremotos/);

  const heading = page.locator('h1');
  await expect(heading).toHaveText('Gestión de terremotos');
});

test('crea, edita, borra y filtra terremotos', async ({ page }) => {
  await page.goto('http://localhost:3000/earthquakes');

  const country = 'TestPais';
  const fromdate = '2000-01-01';

  // ---------- CREAR ----------
  await page.getByLabel('País').first().fill(country);
  await page.getByLabel('Fecha de inicio').first().fill(fromdate);
  await page.getByLabel('Severidad (escala Richter)').fill('6.5');

  await page.getByRole('button', { name: 'Registrar terremoto' }).click();

  await expect(page.locator('.mensaje.exito'))
    .toContainText('El terremoto se ha registrado correctamente.');

  // ---------- EDITAR ----------
  const fila = page.locator('tr', { hasText: country });
  await expect(fila).toBeVisible();

  await fila.getByRole('link', { name: 'Editar' }).click();

  await expect(page).toHaveURL(
    `http://localhost:3000/earthquakes/${encodeURIComponent(country)}/${encodeURIComponent(fromdate)}`
  );

  await expect(page.locator('h1')).toContainText('Editar terremoto');

  const inputSeveridad = page.getByLabel('Severidad (escala Richter)');
  await inputSeveridad.fill('7.0');

  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.locator('.mensaje.exito'))
    .toContainText('Los cambios se han guardado correctamente.');

  await page.goto('http://localhost:3000/earthquakes');

  const filaActualizada = page.locator('tr', { hasText: country });
  await expect(filaActualizada).toContainText('7');

  // ---------- FILTRAR ----------
  await page.getByLabel('País').nth(1).fill(country);
  await page.getByRole('button', { name: 'Buscar' }).click();

  const filasFiltradas = page.locator('tbody tr');
  const count = await filasFiltradas.count();
  for (let i = 0; i < count; i++) {
    await expect(filasFiltradas.nth(i)).toContainText(country);
  }

  // ---------- QUITAR FILTROS ----------
  await page.getByRole('button', { name: 'Limpiar búsqueda' }).click();

  await page.waitForFunction(() => {
    const filas = document.querySelectorAll('tbody tr');
    return Array.from(filas).some(fila => fila.offsetParent !== null);
  }, { timeout: 5000 });

  // ---------- BORRAR UNO ----------
  const filaBorrar = page.locator('tr', { hasText: country });
  await expect(filaBorrar).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await filaBorrar.getByRole('button', { name: 'Eliminar' }).click();

  await expect(page.locator('.mensaje.exito'))
    .toContainText(`El terremoto de "${country}"`);

  // ---------- BORRAR TODOS ----------
  // Primero recargar datos iniciales para tener algo que borrar
  await page.goto('http://localhost:3000/api/v1/earthquakes/loadInitialData');
  await page.goto('http://localhost:3000/earthquakes');

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await page.getByRole('button', { name: 'Borrar todos los terremotos' }).click();

  await expect(page.locator('.mensaje.exito'))
    .toContainText('Todos los terremotos se han eliminado correctamente.');

  await expect(page.locator('tbody tr')).toHaveCount(0);

  // ---------- RECARGAR DATOS ----------
  await page.goto('http://localhost:3000/api/v1/earthquakes/loadInitialData');
  await page.goto('http://localhost:3000/earthquakes');

  await expect(page.locator('tbody tr').first()).toBeVisible();
});