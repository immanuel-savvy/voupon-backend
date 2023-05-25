import axios from "axios";
import {
  LOGS,
  PAYMENT_DATA,
  PRODUCTS,
  PRODUCT_SUBSCRIPTIONS,
  SUBCRIPTIONS,
  TRANSACTIONS,
  USERS,
  USER_SUBSCRIPTIONS,
  VENDORS,
  VENDOR_PRODUCTS,
  VENDOR_SUBSCRIPTIONS,
  GLOBALS,
  WISHLIST,
} from "../ds/conn";
import { client_domain, paystack_secret_key } from "./admin";
import { save_image } from "./utils";

const user_subscriptions = (req, res) => {
  let { user } = req.body;
  res.json({ ok: true, data: USER_SUBSCRIPTIONS.read({ user }) });
};

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

  product.installments.map((installment) => {
    let i_price = Number(product[`${installment}_product_price`]),
      i_interval = Number(product[`number_if_${installment}_payments`]);

    axios({
      url: "https://api.paystack.co/plan",
      method: "post",
      headers: {
        Authorization: `Bearer ${paystack_secret_key}`,
        "Content-Type": "application/json",
      },
      data: {
        name: product.title,
        interval: installment,
        amount: String((i_price / i_interval) * 100),
        invoice_limit: Number(i_interval),
      },
    })
      .then((data) => {
        data = data.data;
        if (data.status)
          PRODUCTS.update(product._id, {
            [`${installment}_plan_code`]: data.data.plan_code,
          });
      })
      .catch((err) => console.log(err));
  });

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

  let products = VENDOR_PRODUCTS.read(
    { vendor, state: { $ne: "closed" } },
    { limit, skip }
  );

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

  res.json({
    ok: true,
    data: PRODUCTS.read({ state: { $ne: "closed" } }, { skip, limit }),
  });
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

  // let wallet_res = WALLETS.update(payer.wallet, { balance: { $dec: value } });
  let tx = {
    type: "marketplace",
    user: payer._id,
    vendor: recipient._id,
    title: "product subscription",
    value,
    data: product,
    wallet: payer.wallet,
  };
  TRANSACTIONS.write(tx);

  // wallet_res = WALLETS.update(recipient.wallet, {
  //   balance: { $inc: value },
  //   total_earnings: { $inc: value },
  // });

  tx.wallet = recipient.wallet;
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

  GLOBALS.update(
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
    data: {
      ...SUBCRIPTIONS.readone(result._id),
      redirect: `${client_domain}/product?${
        (product && product._id) || product
      }`,
    },
  });
};

const close_product = (req, res) => {
  let { product, vendor } = req.body;

  VENDOR_PRODUCTS.update({ product, vendor }, { state: "closed" });
  PRODUCTS.update(product, { state: "closed" });

  res.end();
};

const unclose_product = (req, res) => {
  let { product, vendor } = req.body;

  VENDOR_PRODUCTS.update({ product, vendor }, { state: "running" });
  PRODUCTS.update(product, { state: { $ne: "running" } });

  res.end();
};

const vendor_closed_products = (req, res) => {
  let { vendor } = req.body;

  res.json({
    ok: true,
    message: "Vendor closed products",
    data: VENDOR_PRODUCTS.read({ vendor, state: "closed" }),
  });
};

const payment_data = (req, res) => {
  let data = req.body;

  let result = PAYMENT_DATA.write(data);

  res.json({ ok: true, data: { _id: result._id } });
};

const update_payment_data_with_reference = (req, res) => {
  let { payment_data, reference } = req.body;
  if (!payment_data || !reference)
    return res.json({ ok: false, data: { message: "payment data invalid" } });

  PAYMENT_DATA.update(payment_data, { reference });

  res.end();
};

const remove_payment_data = (req, res) => {
  let { payment_data } = req.params;

  PAYMENT_DATA.remove(payment_data);

  res.end();
};

const installment_days = new Object({
  daily: 1,
  weekly: 7,
  monthly: 30,
  biannually: 182,
  annually: 365,
});

const payment_callbacks = (req, res) => {
  let { reference } = req.params;
  console.log(reference, "REFREEN");
  let data = PAYMENT_DATA.readone({ reference, resolved: { $ne: true } });
  console.log(data, "GHERE");

  console.log(LOGS.write(data));

  axios({
    url: `https://api.paystack.co/transaction/verify/${reference}`,
    method: "get",
    headers: {
      Authorization: `Bearer ${paystack_secret_key}`,
      "Content-Type": "application/json",
    },
  })
    .then((response) => {
      response = response.data;
      console.log(response, "11");

      if (response.status) {
        response = response.data;
        console.log("RESP1", response.status);
        if (response.status === "success") {
          console.log(response.status, "YOYO");
          data.authorization = response.authorization;
          data.customer = response.customer;

          console.log(data.product, "PRODUCT MANAGER");
          let product = PRODUCTS.readone(data.product);
          console.log(product, product[`${data.installment}_plan_code`]);
          axios({
            url: "https://api.paystack.co/subscription",
            method: "post",
            headers: {
              Authorization: `Bearer ${paystack_secret_key}`,
              "Content-Type": "application/json",
            },
            data: {
              customer: data.customer.customer_code,
              plan: product[`${data.installment}_plan_code`],
              authorization: data.authorization.authorization_code,
              start_date: new Date(
                Date.now() +
                  installment_days[data.installment] * 24 * 60 * 60 * 1000
              ).toISOString(),
            },
          })
            .then((result) => {
              result = result.data;
              console.log(result, "22");

              if (result.status) {
                data.subscription_details = {
                  subscription_code: result.data.subscription_code,
                  email_token: result.data.email_token,
                };

                subscribe_to_product({ body: data }, res);
                PAYMENT_DATA.update(data._id, { resolved: true });
              }
            })
            .catch((err) => {
              console.log(err.response.data, "4");
              res.json({ ok: false, data: { message: err.response.data } });
            });
        }
      } else {
      }
    })
    .then((err) => {
      console.log(err.response.data, "3");
      res.json({ ok: false, data: { message: err.response.data } });
    });
};

export {
  payment_data,
  update_payment_data_with_reference,
  remove_payment_data,
  create_product_et_service,
  update_product,
  payment_callbacks,
  vendor_closed_products,
  close_product,
  unclose_product,
  subscribe_to_product,
  vendor_products_et_service,
  product_subscription,
  add_to_wishlist,
  remove_from_wishlist,
  products,
  wishlist,
  GLOBAL_subscriptions,
  user_subscriptions,
};
