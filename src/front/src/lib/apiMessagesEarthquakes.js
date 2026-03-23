/**
 * Traduce los códigos de error de la API de terremotos a mensajes comprensibles.
 * @param {number} status - Código HTTP de la respuesta
 * @param {Object} [contexto={}] - Información adicional para personalizar el mensaje
 * @param {string} [contexto.country] - País del terremoto
 * @param {string} [contexto.fromdate] - Fecha de inicio del terremoto
 * @returns {string} Mensaje de error en español para el usuario
 */

export function traducirErrorApiEarthquake(status, contexto = {}) {
    const { country, fromdate } = contexto;

    switch (status) {
        case 400:
            return 'Los datos introducidos no son válidos. Por favor, revisa los campos obligatorios (País, Fecha de inicio y Severidad) e inténtalo de nuevo.';
        case 404:
            if (country && fromdate) return `No existe ningún terremoto registrado en "${country}" con fecha "${fromdate}".`;
            return 'No se ha encontrado el terremoto solicitado.';
        case 405:
            return 'Esta operación no está permitida.';
        case 409:
            if (country && fromdate) return `Ya existe un terremoto registrado en "${country}" con fecha "${fromdate}". No se puede duplicar.`;
            return 'Ya existe un registro con esos datos. No se puede duplicar.';
        case 500:
            return 'Se ha producido un error interno en el servidor. Por favor, inténtalo más tarde.';
        default:
            return `Se ha producido un error inesperado (código ${status}). Por favor, inténtalo de nuevo.`;
    }
}