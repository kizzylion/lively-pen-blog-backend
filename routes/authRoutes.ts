import { Router } from "express";
import passport from "../config/passport";
import {
  googleCallback,
  logout,
  localCallback,
  register,
} from "../controllers/authController";
import { validateLogin, validateRegistration } from "../middleware/validation";

const router = Router();

router.post("/register", validateRegistration, register);

router.post(
  "/login",
  validateLogin,
  passport.authenticate("local", { session: false }),
  localCallback
);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  googleCallback
);

router.post("/logout", logout);

export default router;
