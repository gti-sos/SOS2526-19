import express from "express";
import passport from "passport";
import session from "express-session";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const router = express.Router();

function loadGoogleOAuth(app) {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const GOOGLE_CALLBACK_URL =
    process.env.GOOGLE_CALLBACK_URL || "http://localhost:3000/auth/google/callback";
  const SESSION_SECRET =
    process.env.SESSION_SECRET || "mi_session_secret_sos2526_19";

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: GOOGLE_CALLBACK_URL
      },
      function verify(accessToken, refreshToken, profile, done) {
        const user = {
          id: profile.id,
          displayName: profile.displayName,
          emails: profile.emails || [],
          photos: profile.photos || []
        };

        return done(null, user);
      }
    )
  );

  router.get(
    "/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  router.get(
    "/auth/google/callback",
    passport.authenticate("google", {
      failureRedirect: "/auth/google/failure"
    }),
    (req, res) => {
      res.redirect("/auth/google/success");
    }
  );

  router.get("/auth/google/success", (req, res) => {
    if (!req.user) {
      return res.status(401).send({ error: "No hay usuario autenticado." });
    }

    return res.status(200).send({
      message: "Autenticación OAuth correcta.",
      user: req.user
    });
  });

  router.get("/auth/google/failure", (req, res) => {
    return res.status(401).send({
      error: "La autenticación con Google ha fallado."
    });
  });

  router.get("/auth/me", (req, res) => {
    if (!req.user) {
      return res.status(401).send({
        error: "No hay sesión iniciada."
      });
    }

    return res.status(200).send(req.user);
  });

  router.get("/auth/logout", (req, res, next) => {
    req.logout(function (err) {
      if (err) return next(err);

      req.session.destroy(() => {
        res.status(200).send({
          message: "Sesión cerrada correctamente."
        });
      });
    });
  });

  app.use(router);
}

export { loadGoogleOAuth };