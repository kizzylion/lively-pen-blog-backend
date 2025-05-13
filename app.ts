import express, { Request, Response } from "express";
import passport from "./config/passport";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./routes/Index";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// You may switch to stateless JWT only, or use sessions if needed.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(
  cors({
    origin: (origin: string | undefined, callback: any) => {
      if (whitelist.indexOf(origin || "") !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());

const whitelist = [process.env.FRONTEND_URL || "http://localhost:8080"];

// Mount API routes
app.use("/api", routes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Backend API is working!");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
