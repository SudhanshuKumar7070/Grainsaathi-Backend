import {Router} from "express"

const router = Router();

const clientsStore = [];

router.route("/test-sse").get((req,res)=>{

const clientId = req.query.clientId || "mahi_bhai_client_01"
  clientsStore.push(clientId);
res.setHeader('Content-Type','text/event_stream');
res.setHeader('Cache-Control','no_cache');
res.setHeader('Connection','keep_alive');
res.flushHeaders();

res.write(`${clientId} is connected , socket opened ! `);
  
 const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat); // Fix 3 — clear heartbeat on disconnect
    const index = clients.findIndex(c => c.id === clientId && c.res === res);
    if (index !== -1) clients.splice(index, 1);
    console.log(`❌ Client disconnected: ${clientId} | Total: ${clients.length}`);
  });
  
})

export default router