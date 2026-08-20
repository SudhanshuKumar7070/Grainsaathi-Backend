import "dotenv/config";
import app from "./app.js";
import "./Architecture/worker/notification.worker.js";

const port = process.env.PORT || 8000;
console.log("check env configuration, port:", port);

app.get("/test", (req, res) => {
  return res.send("server is running");
});

app.listen(port, () => {
  console.log("the auth server is listening at port ", port);
});
