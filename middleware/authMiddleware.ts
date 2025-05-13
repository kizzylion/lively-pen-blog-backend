import { Request, Response, NextFunction } from "express";
import { verifyJwt } from "../utils/jwt";
import { prisma } from "../config/database";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.header("Authorization")?.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = verifyJwt(token);
    if (!decoded)
      return res.status(401).json({ message: "You are not authorized" });
    const user = await prisma.user.findUnique({
      where: { id: (decoded as any).userId },
      include: { role: true },
    });
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(403).json({ message: "Invalid token" });
  }
};

export const isAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  if (user.role.name.toLowerCase() !== "admin")
    return res.status(403).json({ message: "You are not authorized" });
  next();
};

export const isUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  if (user.role.name.toLowerCase() !== "user")
    return res.status(403).json({ message: "You are not authorized" });
  next();
};

// IS EDITOR
export const isEditor = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user = (req as any).user;
  if (user.role.name.toLowerCase() !== "editor")
    return res.status(403).json({ message: "You are not authorized" });
  next();
};
