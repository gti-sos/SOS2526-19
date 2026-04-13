import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "claveSecreta";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "2h";

/**
 * Genera un token JWT a partir de un payload.
 * @param {Object} payload
 * @returns {string}
 */
function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Middleware para verificar el token JWT.
 * Espera el header:
 * Authorization: Bearer <token>
 */
function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).send({
            error: "No autorizado. Falta el token Bearer en la cabecera Authorization."
        });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).send({
            error: "Token inválido o expirado."
        });
    }
}

export { generateToken, verifyToken };