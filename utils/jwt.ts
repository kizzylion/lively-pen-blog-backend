import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export function signJwtWithExpiry(payload: object, expiresIn: any) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: expiresIn,
  });
}

export function signJwt(payload: object) {
  return jwt.sign(payload, JWT_SECRET);
}

export function verifyJwt(token: string, options?: any) {
  try {
    return jwt.verify(token, JWT_SECRET, options);
  } catch (err) {
    return null;
  }
}
