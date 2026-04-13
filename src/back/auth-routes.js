import express from "express";
import { generateToken } from "./jwtAuth.js";

const router = express.Router();

const DEMO_USER = {
    username: "admin",
    password: "admin123",
    role: "admin"
};

router.post("/api/v1/auth/login", (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send({
            error: "Debes enviar username y password."
        });
    }

    if (username !== DEMO_USER.username || password !== DEMO_USER.password) {
        return res.status(401).send({
            error: "Credenciales incorrectas."
        });
    }

    const token = generateToken({
        username: DEMO_USER.username,
        role: DEMO_USER.role
    });

    return res.status(200).send({
        message: "Login correcto.",
        token
    });
});

export default router;


