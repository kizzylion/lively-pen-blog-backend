import { RequestHandler } from "express";
import { z } from "zod";

// Define Zod schemas
const registerSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Middleware for registration validation
export const validateRegistration: RequestHandler = (req, res, next) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.errors });
    return;
  }
  next();
};

// Middleware for login validation
export const validateLogin: RequestHandler = (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ errors: result.error.errors });
    return;
  }
  next();
};
