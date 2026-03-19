/**
 * @typedef {Object} ErrorContext
 * @property {string} [recurso]
 * @property {string} [country]
 * @property {number|string} [from_date]
 */

/**
 * Traduce un código HTTP de la API a un mensaje comprensible.
 *
 * @param {number} status
 * @param {ErrorContext} [contexto={}]
 * @returns {string}
 */
export function traducirErrorApiDrought(status, contexto = {}) {
  const {
    recurso = 'registro',
    country,
    from_date
  } = contexto;

  if (status === 400) {
    return 'Los datos introducidos no son válidos. Revisa el formulario antes de continuar.';
  }

  if (status === 404) {
    if (country && from_date !== undefined && from_date !== null && from_date !== '') {
      return `No existe ningún ${recurso} para ${country} en el año ${from_date}.`;
    }

    if (country) {
      return `No existe ningún ${recurso} para ${country}.`;
    }

    return `No se ha encontrado el ${recurso} solicitado.`;
  }

  if (status === 405) {
    return 'La acción solicitada no está permitida.';
  }

  if (status === 409) {
    if (country && from_date !== undefined && from_date !== null && from_date !== '') {
      return `Ya existe un ${recurso} para ${country} en el año ${from_date}.`;
    }

    return `Ya existe un ${recurso} con esos datos.`;
  }

  if (status === 500) {
    return 'Se ha producido un error interno del servidor. Inténtalo de nuevo más tarde.';
  }

  return 'Se ha producido un error inesperado. Inténtalo de nuevo más tarde.';
}