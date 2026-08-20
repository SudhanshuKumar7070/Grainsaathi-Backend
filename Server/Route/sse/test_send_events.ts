import { Router, Request, Response } from "express";
import sseObj from "../../SSE/sse_store.js";

const router = Router();

router.route("/test-sse").get((req: Request, res: Response) => {
  const clientId = (req.query.clientId as string) || "mahi_bhai_client_01";

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseObj.addClient(clientId, res);

  res.write(`data: ${clientId} is connected, socket opened!\n\n`);
  sseObj.broadCastToServer("test", {
    message: "ki haal chaal bhai saab ,(testing sse store implementation) ",
  });

  req.on("close", () => {
    sseObj.removeClient(clientId);
    console.log(` Client disconnected: ${clientId} `);
  });
});

export default router;
