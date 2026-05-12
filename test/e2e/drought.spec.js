/** @type {Array<{ from_date: number }>} */
import { test, expect } from '@playwright/test';

test('carga la página de gestión de sequías', async ({ page }) => {
  await page.goto('http://localhost:3000/drought-stats');

  await expect(page).toHaveTitle(/Gestión de sequías/);

  const heading = page.locator('h1');
  await expect(heading).toHaveText('Gestión de sequías');
});

test('crea y borra un registro específico de sequía', async ({ page }) => {
    await page.goto('http://localhost:3000/drought-stats');

    const country = 'Argentina';
    const fromDate = '2022';

    // ---------- CREAR ----------
    await page.getByTestId('description').fill('Registro a borrar');
    await page.getByTestId('alert_level').fill('orange');
    await page.getByTestId('alert_score').fill('5');
    await page.getByTestId('episode_alert_score').fill('3');
    await page.getByTestId('country').fill(country);
    await page.getByTestId('from_date').fill('2022');
    await page.getByTestId('to_date').fill('2023');
    await page.getByTestId('severity_km2').fill('500');
    await page.getByTestId('iso').fill('ARG');
    await page.getByTestId('gdacs_id').fill('DELETE123');
    await page.getByTestId('duration_day').fill('10');
    await page.getByTestId('impact').fill('Low');
    await page.getByTestId('longitude').fill('-3.7');
    await page.getByTestId('latitude').fill('40.4');

    await page.getByRole('button', { name: 'Crear registro' }).click();

    await expect(page.locator('.mensaje.exito'))
        .toContainText('El registro se ha creado correctamente.');



    // ---------- EDITAR ----------
    const fila = page.locator('tr', { hasText: country });
    await expect(fila).toBeVisible();

    await fila.getByRole('link', { name: 'Editar' }).click();

    await expect(page).toHaveURL(`http://localhost:3000/drought-stats/edit/${encodeURIComponent(country)}/${fromDate}`);

    const toDateInput = page.getByTestId('to_date');
    await toDateInput.fill('2024');

    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    // Comprobar mensaje de éxito
    //await expect(page.locator('.mensaje.exito'))
    //    .toContainText(/actualizado|editado/i);

    await page.goto('http://localhost:3000/drought-stats');

    const filaActualizada = page.locator('tr', { hasText: `${country}` });
    await expect(filaActualizada).toContainText('2024');





    // ---------- BORRAR ----------
//    const fila = page.locator('tr', { hasText: country });
//    await expect(fila).toBeVisible();

    page.once('dialog', async (dialog) => {
        await dialog.accept();
    });

    await fila.getByRole('button', { name: 'Eliminar' }).click();

    await expect(page.locator('.mensaje.exito'))
        .toContainText('El registro se ha eliminado correctamente.');

    // ---------- BORRAR TODO ----------
    page.once('dialog', async (dialog) => {
        await dialog.accept();
    });

    await page.getByRole('button', { name: 'Borrar todos los datos' }).click();

    await expect(page.locator('.mensaje.exito'))
        .toContainText('Todos los datos se han eliminado correctamente.');

    await expect(page.locator('tbody tr')).toHaveCount(0);

    // ---------- RECARGAR ----------
    await page.getByRole('button', { name: 'Cargar registros' }).click();

    await expect(page.locator('text=Cargando datos...')).not.toBeVisible();

    const filas = page.locator('tbody tr');
    await expect(filas.first()).toBeVisible();

    // ---------- FILTRAR ----------
    await page.getByTestId('filter-alert_level').fill('Orange');
    await page.getByRole('button', { name: 'Buscar' }).click();

    const filasFiltradas = page.locator('tbody tr');
    const count = await filasFiltradas.count();
    for (let i = 0; i < count; i++) {
        await expect(filasFiltradas.nth(i)).toContainText('Orange');
    }

    // ---------- QUITAR FILTROS ----------
    await page.getByRole('button', { name: 'Quitar filtros' }).click();

    await page.waitForFunction(() => {
        const filas = document.querySelectorAll('tbody tr');
        return Array.from(filas).some(fila => fila.offsetParent !== null);
    }, { timeout: 5000 });

});