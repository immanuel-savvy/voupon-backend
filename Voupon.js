import express from "express";
import cors from "cors";
import ds_conn from "./ds/conn";
import router from "./routes";
import bodyParser from "body-parser";
import { create_default_admin } from "./handlers/starter";
import { reset_vendor_id } from "./handlers/voucher";

const app = express();
app.use(cors());
app.use(express.static(__dirname + "/assets"));
app.use(bodyParser.urlencoded({ extended: true, limit: "100mb" }));
app.use(bodyParser.json({ limit: "100mb" }));

app.use((req, res) => {
  if (req.header.vendor_id)
    req.header.vendor_id = reset_vendor_id(req.header.vendor_id);
});

router(app);

app.get("/", (req, res) =>
  res.send("<div><h1>Hi, its Voupon Africa.</h1></div>")
);

app.listen(1449, () => {
  ds_conn();

  create_default_admin();
  console.log("Voupon Backend started on :1449");
});
