import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const app: Express = express();

// Trust the first proxy (Render) for rate-limiting IP detection
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Request timing middleware - logs request duration, uptime, and pool stats
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    logger.info({
      method: req.method,
      path: req.url?.split("?")[0],
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      uptime: Math.round(process.uptime() * 100) / 100,
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
    }, "http.request");
  });
  next();
});
const allowedOrigins = [
  "https://am-i-normal.onrender.com",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "http://192.168.100.140:3001",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Global rate limiter (generous, for API abuse protection) ─────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

// ── Stricter limiters for sensitive endpoints ────────────────────────────────
// Auth endpoints: 5 requests per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts, please try again later." },
});

// Admin endpoints: 20 requests per minute per IP
const adminLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin requests, please try again later." },
});

// Admin PIN endpoint: very strict — 3 attempts per 5 minutes per IP
const pinLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many PIN attempts, please try again later." },
});

// Apply limiters before the main router
app.use("/api/auth", authLimiter);
app.use("/api/admin", adminLimiter);
app.use("/api/admin/auth", pinLimiter);

app.use("/api", router);

export default app;
