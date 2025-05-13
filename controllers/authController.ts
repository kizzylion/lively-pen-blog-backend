import { Request, Response } from "express";
import { signJwtWithExpiry, signJwt, verifyJwt } from "../utils/jwt";
import { prisma } from "../config/database";
import bcrypt from "bcrypt";
import { User } from "@prisma/client";

interface GoogleUser {
  id: string;
  displayName: string;
  email: string;
  photos?: { value: string }[];
}

function generateAccessToken(userId: string) {
  return signJwtWithExpiry({ userId }, "15m"); // 15 minutes
}

function generateRefreshToken(userId: string) {
  return signJwtWithExpiry({ userId }, "7d"); // 7 days
}

// save the refresh token in the database
async function saveRefreshToken(token: string) {
  await prisma.refreshToken.create({
    data: {
      token,
    },
  });
}

// delete the refresh token from the database
async function deleteRefreshToken(token: string) {
  await prisma.refreshToken.delete({
    where: { token },
  });
}

// check if the refresh token is in the database
async function checkRefreshToken(token: string) {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
  });
  return refreshToken;
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
    const _refreshToken = generateRefreshToken(user.id);
    const _accessToken = generateAccessToken(user.id);

    // save the refresh token in the database
    await saveRefreshToken(_refreshToken);

    //  set token in cookies
    setAuthTokens(res, user, _accessToken, _refreshToken);
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  } catch (err) {
    console.error("Google callback error:", err);
    return res.status(500).send("Internal Server Error");
  }
}

function setAuthTokens(
  res: Response,
  user: User,
  accessToken: string,
  refreshToken: string
) {
  // set the cookies
  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 1000 * 60 * 15, // 15 minutes
  });
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "strict",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  });
}

export async function logout(req: Request, res: Response) {
  // get the previous url
  const { refreshToken } = req.body;
  // remove the cookies
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  if (refreshToken) {
    await deleteRefreshToken(refreshToken);
  }
  res.status(200).json({ message: "Logged out successfully" });
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

// New: Login handler
export async function login(req: any, res: any) {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: "Email and password required" });

  let user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (!user) return res.status(401).send("Invalid credentials");

  if (!user.password) return res.status(401).send("Invalid credentials");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).send("Invalid credentials");

  const _refreshToken = generateRefreshToken(user.id);
  const _accessToken = generateAccessToken(user.id);

  // save the refresh token in the database
  await saveRefreshToken(_refreshToken);

  setAuthTokens(res, user, _accessToken, _refreshToken);
  res.status(200).json({
    accessToken: _accessToken,
    refreshToken: _refreshToken,
    user,
    message: "Logged in successfully",
  });
}

export async function me(req: any, res: any) {
  const token = req.cookies.accessToken;
  if (!token) return res.status(401).json({ error: "Not authorized" });
  try {
    const decoded = verifyJwt(token);
    if (!decoded) return res.status(401).json({ error: "Not authorized" });
    const user = await prisma.user.findUnique({
      where: { id: (decoded as any).userId },
      include: { role: true },
    });
    res.status(200).json({ user });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
}

export async function refreshToken(req: any, res: any) {
  const { refreshToken } = req.body;
  // check if there is a refresh token
  if (!refreshToken) return res.status(401).json({ error: "Not authorized 1" });

  const checkRefreshTokenInDB = await checkRefreshToken(refreshToken);
  if (!checkRefreshTokenInDB)
    return res.status(401).json({ error: "Refresh token not found" });

  // verify the refresh token
  const decoded = verifyJwt(refreshToken);

  if (!decoded)
    return res.status(401).json({
      error: "Not authorized or refresh token expired",
    });

  // delete the refresh token from the database
  await deleteRefreshToken(refreshToken);

  // get the user from the decoded token
  const userId = (decoded as any).userId;

  if (!userId) return res.status(401).json({ error: "User not found" });

  // check if the user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!user) return res.status(401).json({ error: "User not found" });

  // generate a new access token
  const _accessToken = generateAccessToken(userId);
  const _refreshToken = generateRefreshToken(userId);

  // save the refresh token in the database
  await saveRefreshToken(_refreshToken);

  res.status(200).json({
    accessToken: _accessToken,
    refreshToken: _refreshToken,
    user,
    message: "Refreshed token successfully",
  });
}
