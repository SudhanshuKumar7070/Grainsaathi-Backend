import express, { urlencoded, Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json());
app.use(urlencoded({ limit: "10kb", extended: true }));
app.use(express.static("public"));

// router imports
import authRoute from "./Route/auth.routes.js";
import traderRoute from "./Route/trader.route.js";
import farmerRoute from "./Route/farmers.route.js";
import orgRoute from "./Route/organisation.route.js";
import superAdminRoute from "./Route/superadmin.route.js";
import adminRoute from "./Route/admin.route.js";
import contractRoute from "./Route/contract.route.js";
import sseRoute from "./Route/sse/test_send_events.js";

import "./Architecture/cron/contractExpiry.cron.js";

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/trader", traderRoute);
app.use("/api/v1/farmer", farmerRoute);
app.use("/api/v1/org", orgRoute);
app.use("/api/v1/superadmin", superAdminRoute);
app.use("/api/v1/admin", adminRoute);
app.use("/api/v1/contracts", contractRoute);
app.use("/sse_event", sseRoute);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(statusCode).json({
    statusCode,
    message,
    success: false,
    data: null,
  });
});

export default app;
