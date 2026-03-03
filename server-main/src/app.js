import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import healthRoutes from "./routes/healthRoutes.js"
import ticketRoutes from "./routes/ticketRoutes.js"
import statsRoutes from "./routes/statsRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import secretRoutes from "./routes/secretRoutes.js";
import systemRoutes from "./routes/systemRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import { notFoundMiddleware, errorMiddleware } from "./middlewares/index.js";


const app = express();

const configuredOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(",").map((value) => value.trim()).filter(Boolean)
  : [
      process.env.CLIENT_ORIGIN || "http://localhost:8080",
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:5501",
      "http://127.0.0.1:5501",
    ];

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"],
      },
    },
  }),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (configuredOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS origin not allowed"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/health", healthRoutes);
app.use("/auth", authRoutes);
app.use("/tickets", ticketRoutes);
app.use("/stats", statsRoutes);
app.use("/webhooks", webhookRoutes);
app.use("/secrets", secretRoutes);
app.use("/system", systemRoutes);
app.use("/admin", adminRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
