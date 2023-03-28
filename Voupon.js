import express from "express";
import cors from "cors";
import ds_conn from "./ds/conn";
import router from "./routes";
import bodyParser from "body-parser";
import { create_default_admin } from "./handlers/starter";
import { reset_vendor_id } from "./handlers/voucher";
import { send_mail } from "./handlers/users";

const app = express();
app.use(cors());
app.use(express.static(__dirname + "/assets"));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(bodyParser.json({ limit: "100mb" }));

app.use((req, res, next) => {
  if (req.header.vendor_id) {
    req.header.vendor_id = reset_vendor_id(req.header.vendor_id);
    req.body.vendor = req.header.vendor_id;
    console.log(req.body.vendor);
  }

  next();
});

router(app);

app.get("/", (req, res) =>
  res.send("<div><h1>Hi, its Voucher Africa.</h1></div>")
);

app.get("/developer", (req, res) => {
  res.sendFile(__dirname + "/assets/docs/index.html");
});

app.listen(1449, () => {
  ds_conn();

  create_default_admin();
  console.log("Voupon Backend started on :1449");
});
