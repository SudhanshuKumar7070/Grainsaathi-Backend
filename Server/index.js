import "dotenv/config";
import app from "./app.js";


const port = process.env.PORT;
console.log("check env configuratrion , port", port);


app.get("/test", (req, res) => {
  return res.send("server is running");
});

app.listen(port, () => {
  console.log("the auth server is listening at port ", port);
});
