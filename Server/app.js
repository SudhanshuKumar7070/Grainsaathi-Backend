import express, { urlencoded } from "express";

import cors from "cors";

const app = express();

app.use(cors());

app.use(express.json());

app.use(urlencoded({ limit: "10kb", extended: true }));

app.use(express.static("public"));
// router imports

import authRoute from "./Route/auth.routes.js";
import traderRoute from "./Route/trader.route.js";
import farmerRoute from "./Route/farmers.route.js";
import orgRoute from "./Route/organisation.route.js";
import sseRoute from "./Route/sse/test_send_events.js"
app.use("/api/v1/auth", authRoute);
app.use("/api/v1/trader", traderRoute);
app.use("/api/v1/farmer", farmerRoute);
app.use("/api/v1/org", orgRoute);
app.use("/sse_event",sseRoute)
export default app;
