import { ADMINSTRATORS, ADMIN_HASH, GLOBALS, VENDORS } from "../ds/conn";
import { GLOBAL_pending_vendors } from "./starter";

const domain_name = "https://api.voupon.com";

const client_domain = "http://voupon.com";

const paystack_secret_key = "sk_test_8f53d8f0d9303a18a856d4aeba97603d0795fdcb";

const admin_login = (req, res) => {
  let { email, password } = req.body;

  let admin = ADMINSTRATORS.readone({ email });
  if (admin) {
    let hash = ADMIN_HASH.readone({ admin: admin._id });

    res.json(
      hash.key === password
        ? { ok: true, message: "admin logged-in", data: { admin } }
        : { ok: false, data: { message: "incorrect password" } }
    );
  } else res.json({ ok: false, data: { message: "admin not found" } });
};

const get_admins = (req, res) => {
  let admins = ADMINSTRATORS.read();
  res.json({ ok: true, message: "adminstrators fetched", data: admins });
};

const create_admin = (req, res) => {
  let { email, password, firstname, lastname } = req.body;

  let admin = { email, firstname, lastname };

  let result = ADMINSTRATORS.write(admin);
  admin._id = result._id;
  admin.created = result.created;

  ADMIN_HASH.write({ admin: admin._id, key: password });

  res.json({ ok: true, message: "admin created", data: admin });
};

const stats = (req, res) => {
  let stats_ = new Array();

  let pending_vendors = GLOBALS.readone({ global: GLOBAL_pending_vendors });
  stats_.push({ title: "total_vendors", value: VENDORS.config.total_entries });
  stats_.push({
    title: "pending_vendors",
    value: pending_vendors.vendors.length,
  });

  res.json({ ok: true, message: "stats", data: stats_ });
};

export {
  admin_login,
  create_admin,
  get_admins,
  client_domain,
  stats,
  domain_name,
  paystack_secret_key,
};
