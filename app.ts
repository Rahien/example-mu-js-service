import { app } from "mu";
import moment from "moment";
import { getName } from "./config/config";

app.get("/hello", function (req, res) {
  const date = moment().format("YYYY-MM-DD HH:mm:ss");
  const name = getName();
  res.send(`Hello world, from ${name} at ${date}!`);
});
