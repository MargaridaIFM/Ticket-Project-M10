// server-main/src/app.js
import express from "express";
import cors from "cors"; // ✅ add
import healthRoutes from "./routes/healthRoutes.js";
import ticketRoutes from "./routes/ticketRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { notFoundMiddleware, errorMiddleware } from "./middlewares/index.js";

const app = express();

app.use(cors()); // ✅ add (ou restringe: cors({ origin: ["http://localhost:5500"] }))
app.use(express.json());

app.use("/health", healthRoutes);
app.use("/tickets", ticketRoutes);
app.use("/stats", statsRoutes);
app.use("/webhooks", webhookRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;