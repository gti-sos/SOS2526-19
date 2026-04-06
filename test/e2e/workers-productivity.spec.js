import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api/v1/workers-productivity`;
const PAGE_URL = `${BASE_URL}/workers-productivity`;

const registroPrueba = {
  country: 'Playwrightia',
  year: '2099',
  productivity_hour: '123.45',
  avg_annual_hours: '1600',
  gpd_per_capita: '45678.9',
  human_capital: '3.14',
  capital_stock_worker: '98765.4',
  employment: '15.25',
  household_consum: '123456.7',
  investment_share: '0.33'
};

async function resetearBaseDeDatos(request) {
  const deleteResponse = await request.delete(API_BASE);
  expect(deleteResponse.ok()).toBeTruthy();

  const loadResponse = await request.get(`${API_BASE}/loadInitialData`);
  expect(loadResponse.ok()).toBeTruthy();
}

async function abrirPaginaWorkers(page) {
  await page.goto(PAGE_URL);
  await expect(page.locator('h1')).toHaveText('Gestión de productividad laboral');
}

async function rellenarFormularioCreacion(page, registro = registroPrueba) {
  const seccionCrear = page.locator('section').nth(0);

  await seccionCrear.getByLabel('País').fill(registro.country);
  await seccionCrear.getByLabel('Año').fill(registro.year);
  await seccionCrear.getByLabel('Productividad por hora').fill(registro.productivity_hour);
  await seccionCrear.getByLabel('Horas anuales medias').fill(registro.avg_annual_hours);
  await seccionCrear.getByLabel('PIB per cápita').fill(registro.gpd_per_capita);
  await seccionCrear.getByLabel('Capital humano').fill(registro.human_capital);
  await seccionCrear.getByLabel('Capital por trabajador').fill(registro.capital_stock_worker);
  await seccionCrear.getByLabel('Empleo').fill(registro.employment);
  await seccionCrear.getByLabel('Consumo del hogar').fill(registro.household_consum);
  await seccionCrear.getByLabel('Cuota de inversión').fill(registro.investment_share);
}

function filaPorCountryYear(page, country, year) {
  return page.locator('tbody tr').filter({
    has: page.locator('td', { hasText: country })
  }).filter({
    has: page.locator('td', { hasText: String(year) })
  }).first();
}

test.describe('Workers Productivity Frontend', () => {
  test.beforeEach(async ({ request, page }) => {
    await resetearBaseDeDatos(request);
    await abrirPaginaWorkers(page);
  });

  test('lista todos los recursos al cargar la página', async ({ page }) => {
    await expect(page).toHaveTitle(/Gestión de productividad laboral/);
    await expect(page.locator('tbody tr')).toHaveCount(10);

    await expect(filaPorCountryYear(page, 'Spain', '1995')).toBeVisible();
    await expect(filaPorCountryYear(page, 'Cambodia', '1999')).toBeVisible();
  });

  test('crea un nuevo recurso desde el frontend', async ({ page }) => {
    await rellenarFormularioCreacion(page);
    await page.getByRole('button', { name: 'Crear registro' }).click();

    const filaCreada = filaPorCountryYear(page, 'Playwrightia', '2099');
    await expect(filaCreada).toBeVisible();
    await expect(filaCreada).toContainText('123.45');
  });

  test('busca recursos usando los filtros del frontend', async ({ page }) => {
    const seccionBuscar = page.locator('section').nth(1);

    await seccionBuscar.getByLabel('País').fill('Spain');
    await seccionBuscar.getByLabel('Año desde').fill('1998');
    await page.getByRole('button', { name: 'Buscar' }).click();

    await expect(page.locator('code')).toContainText('/api/v1/workers-productivity/Spain?from=1998');
    await expect(page.locator('tbody tr')).toHaveCount(2);

    await expect(filaPorCountryYear(page, 'Spain', '1998')).toBeVisible();
    await expect(filaPorCountryYear(page, 'Spain', '1999')).toBeVisible();
  });

 test('edita un recurso en una vista separada dinámica', async ({ page, request }) => {
  const fila = filaPorCountryYear(page, 'Spain', '1998');
  await expect(fila).toBeVisible();

  await fila.getByRole('link', { name: 'Editar' }).click();

  await expect(page).toHaveURL(`${BASE_URL}/workers-productivity/edit/Spain/1998`);
  await expect(page.locator('h1')).toHaveText('Editar registro');

  await page.getByLabel('Productividad por hora').fill('777.77');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();

  await expect(page.locator('.mensaje.exito')).toContainText(
    'Se han guardado correctamente los cambios del registro de productividad laboral de Spain en el año 1998.'
  );

  const response = await request.get(`${API_BASE}/Spain/1998`);
  expect(response.ok()).toBeTruthy();

  const data = await response.json();
  expect(data.productivity_hour).toBe(777.77);

  await page.goto(PAGE_URL);
  await expect(page.locator('h1')).toHaveText('Gestión de productividad laboral');
  await page.waitForTimeout(1000);

  const filaActualizada = filaPorCountryYear(page, 'Spain', '1998');
  await expect(filaActualizada).toContainText('777.77');
});

  test('borra un recurso concreto desde el listado', async ({ page, request }) => {
  await rellenarFormularioCreacion(page);
  await page.getByRole('button', { name: 'Crear registro' }).click();

  const fila = filaPorCountryYear(page, 'Playwrightia', '2099');
  await expect(fila).toBeVisible();

  page.once('dialog', async (dialog) => {
    await dialog.accept();
  });

  await fila.getByRole('button', { name: 'Eliminar' }).click();

  // Verificación robusta: el backend ya no debe tener el recurso
  const response = await request.get(`${API_BASE}/Playwrightia/2099`);
  expect(response.status()).toBe(404);

  // Refrescamos la vista antes de comprobar la desaparición visual
  await page.goto(PAGE_URL);
  await expect(page.locator('h1')).toHaveText('Gestión de productividad laboral');

  await page.getByRole('button', { name: 'Actualizar lista' }).click();

  await expect(filaPorCountryYear(page, 'Playwrightia', '2099')).toHaveCount(0);
});

  test('borra todos los recursos desde el frontend', async ({ page }) => {
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });

    await page.getByRole('button', { name: 'Borrar todos los datos' }).click();

    await expect(page.locator('tbody tr')).toHaveCount(0);
    await expect(page.getByText('No hay registros disponibles.')).toBeVisible();
  });
});