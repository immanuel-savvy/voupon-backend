import {
  ACCOUNTS,
  GLOBALS,
  TRANSACTIONS,
  USERS,
  VENDORS,
  WALLETS,
} from "../ds/conn";
import { vendor_verified } from "./emails";
import { GLOBAL_pending_vendors } from "./starter";
import { send_mail } from "./users";
import { save_file, save_image } from "./utils";

const vendor = (req, res) => {
  let { vendor: vendor_ } = req.params;

  res.json({ ok: true, message: "vendor", data: VENDORS.readone(vendor_) });
};

const vendors = (req, res) => {
  let { limit } = req.params;

  let vendors_ = VENDORS.read(null, { limit: Number(limit) }).filter(
    (v) => v.verified
  );

  res.json({ ok: true, message: "vendors", data: vendors_ });
};

const vendors_by_category = (req, res) => {
  let { category } = req.params;
  let { limit, skip } = req.body;

  let vendors = VENDORS.read(
    { category },
    { limit: Number(limit), skip: Number(skip) }
  );

  res.json({ ok: true, message: "vendors by category", data: vendors });
};

const request_to_become_a_vendor = (req, res) => {
  let documents = req.body;

  let { ID, cac, user, logo, logo_filename, cac_filename, ID_filename } =
    documents;
  documents.logo = save_image(logo, logo_filename);
  documents.cac = save_file(cac, cac_filename);
  documents.ID = save_file(ID, ID_filename);

  delete documents.cac_filename;
  delete documents.logo_filename;
  delete documents.ID_filename;

  let result = VENDORS.write(documents);
  documents._id = result._id;
  documents.created = result.created;

  USERS.update(user, {
    vendor: result._id,
    vendor_status: "pending",
  });

  GLOBALS.update(
    { global: GLOBAL_pending_vendors },
    { vendors: { $push: result._id } }
  );

  res.json({ ok: true, message: "vendor request sent", data: documents });
};

const unverified_vendors = (req, res) => {
  let data = GLOBALS.readone({ global: GLOBAL_pending_vendors });
  res.json({
    ok: true,
    message: "unverified vendors",
    data: VENDORS.read(data.vendors),
  });
};

const verify_vendor = (req, res) => {
  let { vendor } = req.params;

  let c_vendor = VENDORS.readone(vendor);
  if (!c_vendor)
    return res.json({ ok: false, data: { message: "vendor not found" } });
  else if (c_vendor.verified)
    return res.json({ ok: true, data: { message: "vendor verified already" } });

  GLOBALS.update(
    { global: GLOBAL_pending_vendors },
    { vendors: { $splice: vendor } }
  );
  vendor = VENDORS.update(vendor, { verified: Date.now() });

  if (vendor) {
    USERS.update(vendor.user, { vendor_status: "verified" });
    let { director, name, email, _id } = vendor;

    let director_name = `${director.firstname} ${director.lastname}`;
    send_mail({
      recipient: vendor.director.email,
      recipient_name: `${director_name}`,
      subject: "[Voucher Africa] Vendor Verified",
      html: vendor_verified(vendor),
    });

    let wallet_res = WALLETS.write({
      vendor: _id,
    });
    VENDORS.update(_id, { wallet: wallet_res._id });

    send_mail({
      recipient: email,
      recipient_name: `${name}`,
      subject: "[Voucher Africa] Vendor Verified",
      html: vendor_verified(vendor),
    });
  }

  res.json({
    ok: true,
    message: "verify vendor",
    data: { verified: !!(vendor && vendor.verified) },
  });
};

const close_vendor_account = (req, res) => {
  let { vendor } = req.params;

  vendor = VENDORS.remove(vendor);
  if (!vendor) return res.json({ ok: false });

  USERS.update(vendor.user, { vendor: null, vendor_status: null });

  TRANSACTIONS.remove_several({ wallet: WALLETS.remove(vendor.wallet)._id });

  res.json({
    ok: true,
    message: "vendor account closed",
    data: { _id: vendor._id },
  });
};

const accounts = (req, res) => {
  let { wallet } = req.params;

  res.json({
    ok: true,
    message: "wallet account",
    data: ACCOUNTS.read({ wallet }),
  });
};

const add_account = (req, res) => {
  let details = req.body;

  let result = ACCOUNTS.write(details);

  if (result)
    res.json({
      ok: true,
      message: "add account",
      data: { _id: result._id, created: result.created },
    });
  else res.json({ ok: false, data: { message: "cannot add account" } });
};

const top_vendors = (req, res) => {
  res.json({ ok: true, data: VENDORS.read(null, { limit: 10 }) });
};

export {
  request_to_become_a_vendor,
  top_vendors,
  vendor,
  unverified_vendors,
  verify_vendor,
  close_vendor_account,
  vendors,
  vendors_by_category,
  accounts,
  add_account,
};
