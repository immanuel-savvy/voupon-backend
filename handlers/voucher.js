import axios from "axios";
import { _id } from "generalised-datastore/utils/functions";
import {
  COUPONS,
  OFFER_VOUCHERS,
  OPEN_VOUCHERS,
  PURCHASED_VOUCHERS,
  REDEEMED_VOUCHERS,
  TRANSACTIONS,
  USERS,
  USER_VOUCHERS,
  VENDORS,
  VOUCHERS,
  WALLETS,
} from "../ds/conn";
import { generate_random_string, shuffle_array } from "../functions";
import { paystack_secret_key } from "./admin";
import {
  voucher_otp_email,
  voucher_purchased_email,
  voucher_redeemed_email,
} from "./emails";
import { default_wallet } from "./starter";
import { send_mail } from "./users";
import { save_image } from "./utils";
import { rewards } from "./wallets";
import { calculate_coupon_discount } from "./coupons";

/**
 * @api {post} /vendor_id Vendor ID
 * @apiName identification
 * @apiGroup Get Started
 * @apiDescription Vendor ID can also be found in the vendor profile.
 * @apiBody {string} email Vendor email address
 * @apiSuccessExample {json} Successful Response:
 * {
 *    "ok": true,
 *    "message": "vendor ID"
 *    "data":{
 *      "vendor_id":"16764$Jimt9GmEFdjUCO1$61418603"
 *     }
 * }
 */

const voucher_otp = new Object();

const parse_vendor_id = (vendor_id) => {
  vendor_id = vendor_id.split("~");
  vendor_id.splice(0, 1);
  vendor_id.unshift(vendor_id[1].slice(5));
  vendor_id[2] = vendor_id[2].slice(0, 5);

  return vendor_id.join("$");
};

const reset_vendor_id = (vendor_id, folder) => {
  vendor_id = vendor_id.split("$");
  vendor_id = [
    folder || "vendors",
    vendor_id[1],
    `${vendor_id[2]}${vendor_id[0]}`,
  ];

  return vendor_id.join("~");
};

const mask_id = (_id) => parse_vendor_id(_id);

const unmask_id = (_id, folder) => _id && reset_vendor_id(_id, folder);

const vendor_id = (req, res) => {
  let { email } = req.body;

  let user = USERS.readone({ email });
  if (!user)
    return res.json({ ok: false, message: "user not found", data: { email } });

  if (!user.vendor || (user.vendor && user.vendor_status !== "verified"))
    res.json({ ok: false, message: "user vendor invalid", data: { email } });

  let vendor = VENDORS.readone(user.vendor);

  res.json({
    ok: true,
    message: "vendor ID",
    data: { vendor_id: parse_vendor_id(vendor._id) },
  });
};

const create_offer_voucher = (req, res) => {
  let voucher = req.body;

  voucher.images = voucher.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });
  let result = OFFER_VOUCHERS.write(voucher);
  voucher._id = result._id;
  voucher.created = result.created;

  VENDORS.update(voucher.vendor, { vouchers: { $inc: 1 } });

  res.json({
    ok: true,
    message: "offer_voucher",
    data: voucher,
  });
};

const offer_vouchers = (req, res) => {
  let { vendor } = req.params;

  res.json({
    ok: true,
    message: "vouchers",
    data: OFFER_VOUCHERS.read({ vendor }),
  });
};

const open_vouchers = (req, res) => {
  let { user } = req.params;

  res.json({
    ok: true,
    message: "vouchers",
    data: OPEN_VOUCHERS.read({ user }),
  });
};

const get_offer_vouchers = (req, res) => {
  let { limit } = req.params;

  let vendors = VENDORS.read();

  let vouchers = new Array();

  vendors.map((vendor) =>
    vouchers.push(
      ...OFFER_VOUCHERS.read({
        vendor: vendor._id,
        duration: { $gt: Date.now() },
        quantities: { $gt: 0 },
        state: { $ne: "closed" },
      })
    )
  );

  shuffle_array(vouchers);

  let n = new Object();
  vendors.map((v) => (n[v._id] = v));
  res.json({
    ok: true,
    message: "offer vouchers",
    data: { vendors: n, vouchers, total: OFFER_VOUCHERS.config.total_entries },
  });
};

const voucher_purchased = (req, res) => {
  let details = req.body;
  let { coupon } = details;

  if (coupon) coupon = COUPONS.readone(coupon);

  let voucher_code = generate_random_string(6, "alpha").toUpperCase();
  while (PURCHASED_VOUCHERS.readone({ voucher_code }))
    voucher_code = generate_random_string(6, "alpha").toUpperCase();

  let vendor = VENDORS.readone(details.vendor);
  if (vendor.suspended)
    return res.json({
      ok: false,
      data: { message: "Cannot purchase from Vendor at the moment." },
    });

  let result = PURCHASED_VOUCHERS.write({
    ...details,
    voucher_code,
  });

  let offer_voucher = OFFER_VOUCHERS.update(
    { _id: details.voucher, vendor: details.vendor },
    {
      total_sales: { $inc: 1 },
      quantities: { $dec: 1 },
    }
  );

  delete offer_voucher.total_sales;
  delete offer_voucher.quantities;

  offer_voucher.offer_voucher = offer_voucher._id;
  offer_voucher.user = details.user;

  delete offer_voucher._id;
  delete offer_voucher.created;
  delete offer_voucher.updated;

  offer_voucher.email = details.email;
  let voucher = VOUCHERS.write(offer_voucher);
  details.voucher = voucher._id;

  USER_VOUCHERS.write({
    voucher: details.voucher,
    user: details.user,
    email: details.email,
    voucher_code,
    value: calculate_coupon_discount(coupon, offer_voucher.value),
    state: "unused",
    coupon: coupon && coupon._id,
  });

  let tx = {
    voucher: details.voucher,
    user: details.user,
    type: "voucher",
    title: "voucher purchased",
    vendor: details.vendor,
    coupon,
    voucher_code,
    value: calculate_coupon_discount(coupon, offer_voucher.value),
    credit: true,
  };

  TRANSACTIONS.write(tx);

  send_mail({
    recipient: details.email,
    recipient_name: `${details.firstname} ${details.lastname}`,
    subject: "[Voucher Africa] Voucher Purchased",
    html: voucher_purchased_email({ ...details, voucher_code }),
  });

  send_mail({
    recipient: vendor.email,
    recipient_name: `${vendor.name}`,
    subject: "[Voucher Africa] New Voucher Purchased",
    html: voucher_purchased_email({ ...details, ...vendor, voucher_code }),
  });

  res.json({
    ok: true,
    message: "voucher purchased",
    data: { voucher_code, _id: result._id, created: result.created },
  });
};

const voucher_creation_fees = (details) => {
  let user = USERS.readone(details.user);
  let fee = user.premium ? 50 : 100;
  WALLETS.update(default_wallet, {
    total_earning: { $inc: fee },
    balance: { $inc: fee },
  });

  TRANSACTIONS.write({
    wallet: default_wallet,
    value: fee,
    type: "voucher",
    title: "Voucher Created",
    user: user._id,
    credit: true,
  });

  if (user.referral) {
    let ref_fee = fee * 0.1;
    let ref = USERS.readone(user._id);
    WALLETS.update(ref.wallet, { balance: { $inc: ref_fee } });
    TRANSACTIONS.write({
      wallet: ref.wallet,
      value: ref_fee,
      type: "voucher",
      title: "Affiliate Created Voucher",
      user: ref._id,
      credit: true,
    });

    WALLETS.update(default_wallet, {
      balance: { $dec: ref_fee },
      total_disburse: { $inc: ref_fee },
    });

    TRANSACTIONS.write({
      wallet: default_wallet,
      value: ref_fee,
      type: "voucher",
      title: "Paid out referral created voucher",
      user: ref._id,
    });
  }
};

const create_open_voucher = (req, res) => {
  let details = req.body;

  let voucher_code = generate_random_string(6, "alpha").toUpperCase();

  details.voucher_code = voucher_code;
  let result = VOUCHERS.write(details);
  details._id = result._id;
  details.created = result.created;

  result = OPEN_VOUCHERS.write({
    voucher: details._id,
    user: details.user,
    value: details.value,
    voucher_code,
  });
  result = {
    _id: result._id,
    created: result.created,
    voucher: details,
    voucher_code,
    user: details.user,
  };

  voucher_creation_fees(details);
  let user = USERS.readone(details.user);

  send_mail({
    recipient: details.email,
    recipient_name: `${user.firstname} ${user.lastname}`,
    subject: "[Voucher Africa] Voucher Purchased",
    sender: "signup@udaralinksapp.com",
    sender_name: "Voupon",
    sender_pass: "signupudaralinks",
    html: voucher_purchased_email({ ...details, voucher_code }),
  });

  res.json({
    ok: true,
    message: "open_voucher",
    data: result,
  });
};

const user_vouchers = (req, res) => {
  let { user } = req.params;

  let open_vouchers = OPEN_VOUCHERS.read({ user }),
    offer_vouchers = USER_VOUCHERS.read({ user });

  res.json({
    ok: true,
    message: "user vouchers",
    data: { open_vouchers, offer_vouchers },
  });
};

/**
 * @apiDefine offer_voucher Vouchers that are created by a vendor for a precise service
 * @apiDefine open_voucher Vouchers user created and ready to be used by any available vendor
 *
 * */

/**
 * @api {post} /verify_voucher_for_transaction Verify Voucher
 * @apiName VerifyVoucherIsTransactable
 * @apiGroup Vouchers
 *
 * @apiDescription You can confirm the state of a voucher with respect to a transaction value, to note if a user has the value for the service to be offered before hand.
 *
 * @apiBody {string} voucher_code Voucher Code
 * @apiBody {string} voucher_type='offer_voucher' Voucher Type
 * @apiBody {string} [vendor] Vendor ID - as in the case of an Offer Voucher
 * @apiBody {string} email User registered email
 * @apiBody {number} [amount] Amount to confirm voucher against
 *
 */

const can_redeem_voucher = (
  req,
  res,
  minimal = false,
  donot_use_response = false
) => {
  let { voucher_code, vendor, email, amount, user, voucher_type } = req.body;

  voucher_type = voucher_type && voucher_type.replace(/ /g, "_");

  if (!user && !email) {
    return res.json({
      ok: false,
      data: { message: "No user credentials found!" },
    });
  }
  if (!user && email) {
    user = USERS.readone({ email });
    if (!user)
      return res.json({ ok: false, data: { message: "User not found" } });

    user = user._id;
  }

  if (!new Array("open_voucher", "offer_voucher").includes(voucher_type))
    return res.json({
      ok: false,
      data: { message: "Voucher type is invalid" },
    });

  let voucher = (
    voucher_type === "offer_voucher" ? USER_VOUCHERS : OPEN_VOUCHERS
  ).readone({ user, voucher_code });

  if (!voucher)
    return res.json({
      ok: false,
      message: "cannot redeem voucher",
      data: { message: "Voucher not found" },
    });

  if (voucher_type === "offer_voucher") {
    if (vendor && voucher.voucher.vendor._id !== vendor) {
      return res.json({
        ok: false,
        data: { message: "Voucher does not belong to vendor." },
      });
    }

    if (voucher.state !== "unused")
      return res.json({
        ok: false,
        data: { message: `Voucher has already been ${voucher.state}` },
      });
  } else {
    if (voucher.voucher.value <= 0)
      return res.json({
        ok: false,
        data: { message: "Voucher has no balance" },
      });
    if (Number(amount) > 0 && voucher.voucher.value < Number(amount))
      return res.json({
        ok: false,
        data: {
          message: `Voucher has insufficient balance, Available balance is - ${voucher.voucher.value}`,
        },
      });
    else if (Number(amount) && Number(amount) < 0)
      return res.json({
        ok: false,
        data: { message: "Invalid amount data" },
      });
    if (voucher.state && voucher.state !== "unused") {
      return res.json({
        ok: false,
        data: { message: `Voucher has already been ${voucher.state}` },
      });
    }
  }

  if (!donot_use_response)
    res.json({
      ok: true,
      message: minimal ? "success" : "can redeem voucher",
      data: minimal
        ? {
            can_transact: true,
            voucher_code: voucher.voucher_code,
            voucher_type: voucher_type,
          }
        : {
            can_redeem: true,
            owner_voucher: voucher._id,
            user: voucher.user,
            voucher: voucher.voucher._id,
            email,
            voucher_type,
            voucher_code: voucher.voucher_code,
            voucher_details: voucher,
          },
    });
  else return "proceed";
};

/**
 * @api {post} /redeem_voucher Redeem voucher
 * @apiName RedeemVoucher
 * @apiGroup Vouchers
 *
 * @apiDescription To redeem a voucher, you ought to have generated a One-Time Password from the /request_voucher_otp endpoint
 *
 * @apiBody {string} voucher_code Voucher Code
 * @apiBody {string} voucher_type Voucher Type [`offer_voucher` | `open_voucher`]
 * @apiBody {number} otp Voucher One-Time Password
 * @apiBody {string} bank Bank.code from /get_banks endpoint
 * @apiBody {string} account_number Account number to deposit voucher value into
 * @apiBody {string} email Registered email of user whose voucher it is
 *
 *
 */

const redeem_voucher = (req, res) => {
  let details = req.body;

  let {
    voucher_code,
    voucher_type,
    otp,
    bank,
    account_number,
    email,
    user,
    voucher,
  } = details;

  if (!user) {
    user = USERS.readone({ email });

    if (!user)
      return res.json({
        ok: false,
        message: "user not found",
        data: { user, email },
      });

    user = user._id;
  }

  voucher = (
    voucher_type === "open_voucher" ? OPEN_VOUCHERS : USER_VOUCHERS
  ).readone(!voucher ? { voucher_code, user } : { _id: voucher, user });

  if (Number(otp) !== Number(voucher_otp[voucher._id]))
    return res.json({
      ok: false,
      message: "voucher otp incorrect",
      data: { message: "voucher otp invalid" },
    });
  delete voucher_otp[voucher._id];

  let reference = generate_random_string(20, "alnum");

  let { _id } = voucher;
  let user_ = USERS.readone(user);
  let { firstname, lastname, referral } = user_;
  email = email || user_.email;

  let { value, coupon } = voucher;
  voucher = voucher.voucher;

  if (!voucher) return res.json({ ok: false, message: "voucher not found" });
  if (voucher.state && voucher.state !== "unused")
    return res.json({
      ok: false,
      data: { message: "Voucher is not `unused`" },
    });

  if (!email) {
    email = USERS.readone(user);
    email = email && email.email;
    if (!email)
      return res.json({ ok: false, data: { message: "Email not found" } });
  }

  value = Number(value);
  if (value <= 0) {
    if (voucher_type === "open_voucher")
      VOUCHERS.update(voucher._id, { redeemed: true, state: "redeemed" });

    (voucher_type === "offer_voucher" ? USER_VOUCHERS : OPEN_VOUCHERS).update(
      { user, _id },
      { state: "redeemed" }
    );

    let tx = {
      voucher: _id,
      type: "voucher",
      user,
      title: "voucher redeemed",
      vendor: voucher.vendor,
      voucher_code: voucher_code,
      coupon,
      value: value,
      wallet: USERS.readone(user).wallet,
    };

    TRANSACTIONS.write(tx);

    send_mail({
      recipient: email,
      recipient_name: `${firstname} ${lastname}`,
      subject: "[Voucher Africa] Voucher Redeemed",
      html: voucher_redeemed_email({ ...details, voucher_code }),
    });

    res.json({
      ok: true,
      message: "voucher redeemed",
      data: { voucher: _id, redeemed: true },
    });

    return;
  }

  axios({
    url: "https://api.paystack.co/transferrecipient",
    method: "post",
    headers: {
      Authorization: `Bearer ${paystack_secret_key}`,
      "Content-Type": "application/json",
    },
    data: {
      type: "nuban",
      name: `${firstname} ${lastname}`,
      account_number,
      bank_code: bank,
      currency: "NGN",
    },
  })
    .then((result) => {
      result = result.data;

      let recipient = result.data.recipient_code;

      axios({
        url: "https://api.paystack.co/transfer",
        method: "post",
        headers: {
          Authorization: `Bearer ${paystack_secret_key}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        data: {
          source: "balance",
          amount: value - rewards.voucher_redeemed_fee,
          recipient,
        },
      })
        .then((result) => {
          result = result.data;

          if (voucher_type === "open_voucher")
            VOUCHERS.update(voucher._id, { redeemed: true, state: "redeemed" });

          (voucher_type === "offer_voucher"
            ? USER_VOUCHERS
            : OPEN_VOUCHERS
          ).update({ user, _id }, { state: "redeemed" });

          REDEEMED_VOUCHERS.write({
            voucher: voucher._id,
            transfer_details: {
              recipient,
              reference: result.data.reference,
              transfer_code: result.data.transfer_code,
              reference,
              email,
            },
            transfer_status: null,
          });

          let tx = {
            voucher: _id,
            type: "voucher",
            user,
            title: "voucher redeemed",
            vendor: voucher.vendor,
            voucher_code: voucher_code,
            coupon,
            value: value - rewards.voucher_redeemed_fee,
            wallet: USERS.readone(user).wallet,
          };

          TRANSACTIONS.write(tx);

          let tx_fee = rewards.voucher_redeemed_fee;
          if (referral) {
            referral = USERS.readone(referral);

            tx_fee = tx_fee - tx_fee * (referral.premium ? 0.2 : 0.1);
          }

          WALLETS.update(default_wallet, {
            balance: { $inc: tx_fee },
            total_earning: { $inc: tx_fee },
          });
          TRANSACTIONS.write({
            voucher: _id,
            type: "voucher",
            user,
            title: "voucher redeemed fee",
            vendor: voucher.vendor,
            coupon,
            voucher_code: voucher_code,
            value: tx_fee,
            wallet: default_wallet,
          });

          if (referral) {
            let ref_fee = rewards.voucher_redeemed_fee - tx_fee;
            WALLETS.update(referral.wallet, {
              balance: { $inc: ref_fee },
              vouchers: { $inc: ref_fee },
            });
            TRANSACTIONS.write({
              voucher: _id,
              type: "voucher",
              user,
              title: "voucher redeemed referral token",
              vendor: voucher.vendor,
              voucher_code: voucher_code,
              value: ref_fee,
              wallet: referral.wallet,
            });
          }

          send_mail({
            recipient: email,
            recipient_name: `${firstname} ${lastname}`,
            subject: "[Voucher Africa] Voucher Redeemed",
            html: voucher_redeemed_email({ ...details, voucher_code }),
          });

          res.json({
            ok: true,
            message: "voucher redeemed",
            data: { voucher: _id, redeemed: true },
          });
        })
        .catch((err) => console.log(err, "HERE"));
    })
    .catch((err) => console.log(err, "H#$#"));
};

/**
 * @api {post} /generate_voucher_otp Generate Voucher OTP
 * @apiName GenerateVoucherOTP
 * @apiGroup Vouchers
 *
 * @apiDescription Once this is called, an OTP is generated and sent to the authorised email linked to the voucher, the user is to return this OTP for verification.
 *
 * @apiBody {String} voucher_code Voucher Code
 * @apiBody {String} voucher_type Voucher Type [`offer_voucher` | `open_voucher`]
 * @apiBody {String} email User email linked to voucher
 * @apiBody {String} [value] Only required if voucher_type is `open_voucher`
 *
 * @apiSuccessExample {json} Success Response:
 *  {
 *     "ok": true,
 *     "message": "voucher otp sent",
 *     "data": {
 *       "voucher": "user_vouchers~xMexATpLEj03Z~1678358344593",
 *       "email": "immanuelsavvy@gmail.com",
 *       "user": "users~DuqM6Sef1vqIofd5n~1675764912550"
 *     }
 *   }
 *
 */
const generate_voucher_otp = (req, res) => {
  let proceed = can_redeem_voucher({ body: req.body }, res, true, true);

  if (proceed !== "proceed") return;

  request_voucher_otp(req, res);
};

const request_voucher_otp = (req, res) => {
  let { voucher_code, user, voucher_type, email } = req.body;

  if (!user && email) {
    user = USERS.readone({ email });
    user = user && user._id;

    if (!user) return res.json({ ok: false, message: "User not found" });
  } else if (!email && user) email = USERS.readone(user).email;

  let code = generate_random_string(6, "num");
  let voucher = (
    voucher_type === "open_voucher" ? OPEN_VOUCHERS : USER_VOUCHERS
  ).readone({ user, voucher_code });

  if (!voucher) return res.json({ ok: false });

  voucher_otp[voucher._id] = Number(code);

  let { _id } = voucher;
  let { firstname, lastname } = USERS.readone(user);

  if (!email) {
    email = USERS.readone(user);
    email = email && email.email;
    if (!email)
      return res.json({ ok: false, data: { message: "Email not found" } });
  }

  send_mail({
    recipient: email,
    recipient_name: `${firstname} ${lastname}`,
    subject: "[Voucher Africa] Voucher OTP",
    html: voucher_otp_email({ ...voucher, code }),
  });

  res.json({
    ok: true,
    message: "voucher otp sent",
    data: { voucher: _id, email, user },
  });
};

/**
 * @api {post} /transfer_voucher Transfer Voucher Ownership
 * @apiName TransferVoucher
 * @apiGroup Vouchers
 *
 * @apiDescription Transfer voucher ownership from one user to another.
 *
 * @apiBody {Number} otp Voucher one time password; You must have queried the /request_voucher_otp to provide to OTP to the user email
 * @apiBody {String} destination_email New user email to be used as voucher's authorised email
 * @apiBody {String} owner Current email linked to voucher
 * @apiBody {String} voucher_type [`offer_voucher` | `open_voucher`]
 * @apiBody {String} voucher Voucher returned from success response of /request_voucher_otp
 *
 * @apiSuccessExample {json} Successful-Response:
 *  {
 *    ok: true,
 *    message: "transfer voucher",
 *    data: {
 *      voucher: "user_vouchers~eccevnivnwiioieiwcw~239485020201",
 *      transferred: true,
 *    },
 *  }
 */
const transfer_voucher = (req, res) => {
  let details = req.body;

  let { otp, email2, user, destination_email, owner, voucher_type, voucher } =
    details;
  email2 = email2 || destination_email;

  if (Number(otp) !== Number(voucher_otp[voucher]))
    return res.json({
      ok: false,
      message: "voucher otp verification",
      data: { message: "Invalid OTP code" },
    });

  let Voucher =
    voucher_type === "offer_voucher" ? USER_VOUCHERS : OPEN_VOUCHERS;
  let user_voucher = Voucher.remove({ _id: voucher, user: owner });

  user_voucher.user = user;
  Voucher.write(user_voucher);

  voucher_type === "open_voucher" &&
    VOUCHERS.update(user_voucher.voucher, { email: email2, user });

  res.json({
    ok: true,
    message: "transfer voucher",
    data: {
      voucher,
      transferred: true,
    },
  });
};

const verify_voucher = (req, res) => {
  let { email, voucher_code, user, voucher_type } = req.body;
  user = user || USERS.readone({ email: email.toLowerCase() });

  user = (user && user._id) || user;

  let voucher = (
    voucher_type === "offer_voucher" ? USER_VOUCHERS : OPEN_VOUCHERS
  ).readone({ user, voucher_code });

  res.json({
    ok: true,
    message: "verifying voucher",
    data: voucher
      ? {
          state: voucher.state || "unused",
          voucher: { ...voucher, user: USERS.readone(voucher.user) },
          _id: voucher._id,
        }
      : { message: "Voucher not found" },
  });
};

const close_voucher = (req, res) => {
  let { voucher, previous_state, vendor } = req.body;

  let result = OFFER_VOUCHERS.update(
    { _id: voucher, vendor },
    { state: "closed", previous_state: previous_state || "running" }
  );

  res.json({
    ok: true,
    message: "offer closed",
    data: { voucher: result && result._id },
  });
};

const remove_from_closed_voucher = (req, res) => {
  let { voucher, previous_state, vendor } = req.body;

  if (previous_state === "closed") previous_state = "running";

  OFFER_VOUCHERS.update(
    { _id: voucher, vendor },
    { state: previous_state, previous_state: null }
  );

  res.end();
};

/**
 * @api {post} /use_voucher Use Voucher
 * @apiName Use Voucher
 * @apiGroup Vouchers
 *
 * @apiDescription Calling the endpoint, would cause the value of a voucher to be transfered to the stated vendor, provided the call returned a successful response.
 *
 * @apiBody {String} voucher Voucher
 * @apiBody {Number} [value] Only required if voucher is an Open Voucher
 * @apiBody {String} user Owner of said voucher
 * @apiBody {Number} otp Voucher One-Time-Password
 * 
 * @apiSuccessExample {json} Response-Success:
 * {
    ok: true,
    message: "vouchers just got used",
    data: { 
      success: true, 
      voucher: "voucher~9niDNQ1JNUnu~2394201191", 
      vendor: "vendors~p39iDNQiDJNUnu~2394201128", 
      user: "users~uniDNQiDJNUnu~23942012635"
    },
  }
 */
const use_voucher = (req, res) => {
  let { vendor, otp, voucher, value, user } = req.body;

  if (!vendor) {
    vendor = req.header.vendor_id;
  } else {
    if (vendor && !vendor.startsWith("vendor"))
      vendor = reset_vendor_id(vendor);
  }

  if (!otp || Number(otp) !== voucher_otp[voucher])
    return res.json({
      ok: false,
      message: "voucher otp registration failed",
      data: { otp, voucher, message: "Voucher OTP validation failed" },
    });

  voucher = (
    voucher.startsWith("user") ? USER_VOUCHERS : OPEN_VOUCHERS
  ).readone({ _id: voucher, user });

  vendor = VENDORS.readone(vendor);

  value = Number(voucher.voucher.vendor ? Number(voucher.value) : value);

  let vendor_value = value - value * (vendor.commision_fee / 100 || 0.25);
  WALLETS.update(vendor.wallet, { vouchers: { $inc: vendor_value } });

  let tx = {
    wallet: vendor.wallet,
    voucher: voucher._id,
    customer: user,
    type: "voucher",
    title: "voucher used",
    vendor: vendor._id,
    voucher_code: voucher.voucher_code,
    value: vendor_value,
    credit: true,
    data: voucher._id,
  };

  TRANSACTIONS.write(tx);
  tx.value = value;
  tx.wallet = USERS.readone(user).wallet;
  tx.credit = false;
  TRANSACTIONS.write(tx);

  WALLETS.update(default_wallet, {
    balance: { $inc: value - vendor_value },
    total_earnings: { $inc: value - vendor_value },
  });

  TRANSACTIONS.write({
    credit: true,
    value: value - vendor_value,
    voucher_code: voucher.voucher_code,
    title: "Offer Voucher Sales Commission",
    wallet: default_wallet,
    type: "voucher",
    user,
    voucher: voucher._id,
  });
  if (voucher.voucher.vendor) {
    USER_VOUCHERS.update({ user, _id: voucher._id }, { state: "used" });

    VOUCHERS.update(voucher.voucher._id, { state: "used" });
  } else {
    VOUCHERS.update(voucher.voucher._id, { value: { $dec: value } });
  }

  res.json({
    ok: true,
    data: { success: true, voucher, vendor, user: USERS.readone(user) },
  });
};

const update_voucher = (req, res) => {
  let voucher = req.body;

  voucher.images = voucher.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });

  OFFER_VOUCHERS.update(
    { _id: voucher._id, vendor: voucher.vendor },
    { ...voucher }
  );

  res.json({
    ok: true,
    message: "offer_voucher",
    data: voucher,
  });
};

const voucher_page = (req, res) => {
  let { voucher, vendor } = req.params;

  vendor = VENDORS.readone({ uri: vendor });
  if (!vendor) return res.end();

  voucher = OFFER_VOUCHERS.readone({ uri: voucher, vendor: vendor._id });

  voucher
    ? res.json({ ok: true, data: { voucher, vendor: voucher.vendor } })
    : res.end();
};

const voucher_availability = (req, res) => {
  let { uri, vendor } = req.body;

  let v = OFFER_VOUCHERS.readone({ uri, vendor });
  res.json({
    ok: !v,
    data: { available: !v },
  });
};

export {
  get_offer_vouchers,
  create_offer_voucher,
  create_open_voucher,
  voucher_availability,
  offer_vouchers,
  verify_voucher,
  voucher_page,
  open_vouchers,
  update_voucher,
  voucher_purchased,
  user_vouchers,
  redeem_voucher,
  can_redeem_voucher,
  request_voucher_otp,
  transfer_voucher,
  remove_from_closed_voucher,
  close_voucher,
  parse_vendor_id,
  reset_vendor_id,
  use_voucher,
  vendor_id,
  generate_voucher_otp,
  unmask_id,
  mask_id,
};
