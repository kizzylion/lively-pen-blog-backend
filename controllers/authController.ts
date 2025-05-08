import { Request, Response } from "express";
import { signJwt } from "../utils/jwt";
import { prisma } from "../config/database";
import bcrypt from "bcrypt";

interface GoogleUser {
  id: string;
  displayName: string;
  email: string;
  photos?: { value: string }[];
}

export async function googleCallback(req: any, res: any) {
  // User will be in req.user, establish a session or return JWT
  // For APIs: send back a JWT, for SSR: redirect with session
  //   if (!req.user) return res.status(401).send("User not found");
  //   const token = signJwt({ userId: (req.user as any).id });
  //   res.json({ token, user: req.user });

  try {
    const googleUser = req.user as GoogleUser;

    if (!googleUser) {
      return res.status(401).send("User not found");
    }

    // Check if the user already exists in the database using their email
    let user = await prisma.user.findUnique({
      where: {
        email: googleUser.email,
      },
    });

    if (!user) {
      // create a new user with the google user data and role of user
      user = await prisma.user.create({
        data: {
          name: googleUser.displayName,
          email: googleUser.email,
          googleId: googleUser.id,
          avatarUrl: googleUser.photos?.[0]?.value, // Optional: Save the user's avatar if available
        },
        include: {
          role: true,
        },
      });
    }

    // Generate a JWT
    const token = signJwt({ userId: user.id });

    // Return the token and user data in the response
    res.redirect(`${process.env.FRONTEND_URL}/?token=${token}`);
  } catch (err) {
    console.error("Google callback error:", err);
    return res.status(500).send("Internal Server Error");
  }
}

export function logout(req: Request, res: Response) {
  req.logout(() => {
    res.status(200).send("Logged out");
  });
}

// New: Local login handler
export function localCallback(req: any, res: any) {
  console.log("req.user", req.user);
  if (!req.user) return res.status(401).send("Invalid credentials");
  const token = signJwt({ userId: (req.user as any).id });
  res.json({ token, user: req.user });
}

// New: Registration handler
export async function register(req: any, res: any) {
  const { email, password, name } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(409).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
}
