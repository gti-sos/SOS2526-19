/**
 * @typedef {Object} MessageContext
 * @property {string} [recurso]
 * @property {string} [recursoPlural]
 * @property {string} [country]
 * @property {number|string} [year]
 */

/**
 * Traduce un código HTTP de la API a un mensaje comprensible.
 *
 * @param {number} status
 * @param {MessageContext} [contexto={}]
 * @returns {string}
 */
export function traducirErrorApi(status, contexto = {}) {
  const {
    recurso = 'registro',
    country,
    year
  } = contexto;

  if (status === 400) {
    return 'Los datos introducidos no son válidos. Revisa el formulario antes de continuar.';
  }

  if (status === 404) {
    if (country && year !== undefined && year !== null && year !== '') {
      return `No existe ningún ${recurso} para ${country} en el año ${year}.`;
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
    if (country && year !== undefined && year !== null && year !== '') {
      return `Ya existe un ${recurso} para ${country} en el año ${year}.`;
    }

    return `Ya existe un ${recurso} con esos datos.`;
  }

  if (status === 500) {
    return 'Se ha producido un error interno del servidor. Inténtalo de nuevo más tarde.';
  }

  return 'Se ha producido un error inesperado. Inténtalo de nuevo más tarde.';
}

/**
 * Devuelve un mensaje de éxito comprensible para el usuario.
 *
 * @param {'crear' | 'eliminar' | 'eliminarTodos' | 'editar'} accion
 * @param {MessageContext} [contexto={}]
 * @returns {string}
 */
export function traducirExitoApi(accion, contexto = {}) {
  const {
    recurso = 'registro',
    recursoPlural = 'registros',
    country,
    year
  } = contexto;

  if (accion === 'crear') {
    if (country && year !== undefined && year !== null && year !== '') {
      return `Se ha creado correctamente el ${recurso} de ${country} en el año ${year}.`;
    }

    return `Se ha creado correctamente el ${recurso}.`;
  }

  if (accion === 'eliminar') {
    if (country && year !== undefined && year !== null && year !== '') {
      return `Se ha eliminado correctamente el ${recurso} de ${country} en el año ${year}.`;
    }

    return `Se ha eliminado correctamente el ${recurso}.`;
  }

  if (accion === 'eliminarTodos') {
    return `Se han eliminado correctamente todos los ${recursoPlural}.`;
  }

  if (accion === 'editar') {
    if (country && year !== undefined && year !== null && year !== '') {
      return `Se han guardado correctamente los cambios del ${recurso} de ${country} en el año ${year}.`;
    }

    return `Se han guardado correctamente los cambios del ${recurso}.`;
  }

  return 'La operación se ha realizado correctamente.';
}