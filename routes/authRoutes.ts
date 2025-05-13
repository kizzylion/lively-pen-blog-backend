import { Router } from "express";
import passport from "../config/passport";
import {
  googleCallback,
  logout,
  register,
  login,
  me,
  refreshToken,
} from "../controllers/authController";
import { validateLogin, validateRegistration } from "../middleware/validation";

const router = Router();

router.post("/register", validateRegistration, register);

router.post(
  "/login",
  validateLogin,
  passport.authenticate("local", { session: false }),
  login
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

router.get("/me", me);

router.post("/refresh-token", refreshToken);

export default router;
