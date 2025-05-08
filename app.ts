import express, { Request, Response } from "express";
import passport from "./config/passport";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import routes from "./routes";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// You may switch to stateless JWT only, or use sessions if needed.
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8080",
    credentials: true,
  })
);

// Mount API routes
app.use("/api", routes);

app.get("/", (_req: Request, res: Response) => {
  res.send("Backend API is working!");
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
