import {
  PRODUCTS,
  PRODUCT_SUBSCRIPTIONS,
  SUBCRIPTIONS,
  TRANSACTIONS,
  USERS,
  USER_SUBSCRIPTIONS,
  VENDORS,
  VENDOR_PRODUCTS,
  VENDOR_SUBSCRIPTIONS,
  WALLETS,
  WISHLIST,
} from "../ds/conn";
import { save_image } from "./utils";

const create_product_et_service = (req, res) => {
  let product = req.body;

  product.images = product.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });
  let result = PRODUCTS.write(product);
  product._id = result._id;
  product.created = result.created;

  product._id &&
    VENDOR_PRODUCTS.write({ product: product._id, vendor: product.vendor });

  VENDORS.update(product.vendor, { products: { $inc: 1 } });

  res.json({
    ok: true,
    message: "product created",
    data: product,
  });
};

const update_product = (req, res) => {
  let product = req.body;

  product.images = product.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });

  PRODUCTS.update(product._id, { ...product });

  res.json({
    ok: true,
    message: "product updated",
    data: product,
  });
};

const vendor_products_et_service = (req, res) => {
  let { vendor } = req.params;
  let { limit, skip } = req.body;

  let products = VENDOR_PRODUCTS.read({ vendor }, { limit, skip });

  res.json({
    ok: true,
    messsage: "vendor products and services",
    data: products,
  });
};

const add_to_wishlist = (req, res) => {
  let data = req.body;

  !!WISHLIST.readone(data) ? null : WISHLIST.write(data);

  res.end();
};

const remove_from_wishlist = (req, res) => {
  let data = req.body;

  WISHLIST.remove(data);

  res.end();
};

const wishlist = (req, res) => {
  let { user } = req.params;

  res.json({ ok: true, data: WISHLIST.read({ user }) });
};

const products = (req, res) => {
  let { skip, limit } = req.body;

  res.json({ ok: true, data: PRODUCTS.read(null, { skip, limit }) });
};

const product_subscription = (req, res) => {
  let { user, product, installment } = req.body;

  let subscription = USER_SUBSCRIPTIONS.readone({ user, product, installment });

  res.json({ ok: true, message: "product subscription", data: subscription });
};

let GLOBAL_subscriptions = "product_subscriptions";

const subscribe_to_product = (req, res) => {
  let {
    value,
    payer,
    part_payments,
    total,
    installment,
    recipient,
    title,
    number_of_payments,
    product,
  } = req.body;

  payer = USERS.readone(payer);
  if (!payer)
    return res.json({
      ok: false,
      data: { message: "Payer is not found in the system" },
    });

  recipient = VENDORS.readone(recipient);
  if (!recipient)
    return res.json({
      ok: false,
      data: { message: "Vendor is not found in the system" },
    });

  if (recipient.suspended)
    return res.json({
      ok: false,
      data: { message: "Cannot subscribe to Vendor at the moment." },
    });

  let wallet_res = WALLETS.update(payer.wallet, { balance: { $dec: value } });
  let tx = {
    type: "marketplace",
    user: payer._id,
    vendor: recipient._id,
    title: "product subscription",
    value,
    data: product,
    wallet: wallet_res._id,
  };
  TRANSACTIONS.write(tx);

  wallet_res = WALLETS.update(recipient.wallet, {
    balance: { $inc: value },
    total_earnings: { $inc: value },
  });

  tx.wallet = wallet_res._id;
  tx.credit = true;

  TRANSACTIONS.write(tx);

  let subscription = {
    user: payer,
    vendor: recipient,
    title,
    product,
    total,
    value,
    number_of_payments,
    part_payments,
    recent_payment: Date.now(),
    running: true,
    installment,
    total_payments_made: 0,
  };

  let result = SUBCRIPTIONS.write(subscription);

  GLOBAL_subscriptions.update(
    { global: GLOBAL_subscriptions },
    { subcribers: { $push: result._id } }
  );

  PRODUCT_SUBSCRIPTIONS.write({
    product,
    installment,
    subscription: result._id,
  });
  VENDOR_SUBSCRIPTIONS.write({
    vendor: recipient._id,
    subscription: result._id,
    installment,
  });
  USER_SUBSCRIPTIONS.write({
    user: payer._id,
    installment,
    subscription: result._id,
  });

  res.json({
    ok: true,
    message: "product subscription",
    data: SUBCRIPTIONS.readone(result._id),
  });
};

export {
  create_product_et_service,
  update_product,
  subscribe_to_product,
  vendor_products_et_service,
  product_subscription,
  add_to_wishlist,
  remove_from_wishlist,
  products,
  wishlist,
  GLOBAL_subscriptions,
};
