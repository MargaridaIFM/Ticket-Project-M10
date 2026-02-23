import express from "express"
import healthRoutes from "./routes/healthRoutes.js"
import ticketRoutes from "./routes/ticketRoutes.js"
import statsRoutes from "./routes/statsRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import { notFoundMiddleware, errorMiddleware } from "./middlewares/index.js";


const app = express();

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());

app.use("/health", healthRoutes);

app.use("/tickets", ticketRoutes);
app.use("/stats", statsRoutes);
app.use("/webhooks", webhookRoutes);

app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;