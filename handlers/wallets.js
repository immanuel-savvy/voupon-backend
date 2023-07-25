import axios from "axios";
import { gds, TRANSACTIONS, USERS, VENDORS, WALLETS } from "../ds/conn";
import { paystack_secret_key } from "./admin";
import { voucher_redeemed_email } from "./emails";
import { send_mail } from "./users";
import { Paystack_private_key } from "./utils";

const rewards = new Object({
  referral_signup: 2000,
  signup: 1000,
  annual_subscription: 10000,
  daily_reward_claim: 50,
  voucher_redeemed_fee: 100,
  subscription_fee: 20000,
});

const transactions = (req, res) => {
  let { user, wallet, limit, skip } = req.body;

  let txs = TRANSACTIONS.read(null, { skip, limit, subfolder: user || wallet });

  res.json({ ok: true, message: "transactions", data: txs });
};

/**
 *
 * @api {get} /get_banks Get Banks
 * @apiName GetBanks
 * @apiGroup Utils
 *
 * @apiSuccessExample {json} Banks:
 * {
 *  ok: true,
 *  message: 'banks',
 *  data: [
 *   {
 *     active: true,
 *     code: "035A",
 *     country: "Nigeria",
 *     createdAt: "2017-11-15T12:21:31.000Z",
 *     currency: "NGN",
 *     gateway: "emandate",
 *     id: 27,
 *     is_deleted: false,
 *     longcode: "035150103",
 *     name: "ALAT by WEMA",
 *     pay_with_bank: false,
 *     slug: "alat-by-wema",
 *     type: "nuban",
 *     updatedAt: "2022-05-31T15:54:34.000Z"
 *   },
 *   ...
 * ]
 */
const get_banks = (req, res) => {
  axios({
    url: "https://api.paystack.co/bank?currency=NGN",
    headers: {
      Authorization: `Bearer ${Paystack_private_key}`,
    },
    method: "get",
  })
    .then((result) => {
      res.json({ ok: true, message: "Banks", data: result.data.data });
    })
    .catch((e) => console.log(e));
};

const withdraw_wallet = (req, res) => {
  let details = req.body;

  let wallet = WALLETS.readone(details.wallet);
  if (Number(wallet[details.balance]) < Number(details.amount))
    return res.json({
      ok: false,
      data: { message: "Insufficient wallet balance" },
    });

  let vendor = VENDORS.readone(wallet.vendor);
  let user = USERS.readone(vendor.user);
  let { firstname, lastname, email } = user;
  let { bank, amount: value } = details;
  value = Number(value);

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
      account_number: bank.account_number,
      bank_code: bank.bank.code,
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
          amount: Number(value) * 100,
          recipient,
        },
      })
        .then((result) => {
          result = result.data;

          let tx = {
            type: "vendor",
            user,
            title: "wallet withdrawn",
            vendor: wallet.vendor,
            value,
            wallet: wallet._id,
          };

          WALLETS.update(wallet._id, {
            [details.balance]: { $dec: value },
          });

          TRANSACTIONS.write(tx);

          send_mail({
            recipient: email,
            recipient_name: `${firstname} ${lastname}`,
            subject: "[Voucher Africa] Wallet Withdrawn",
            sender: "signup@udaralinksapp.com",
            sender_name: "Voupon",
            sender_pass: "signupudaralinks",
            html: voucher_redeemed_email({ ...details }),
          });

          res.json({
            ok: true,
            message: "Wallet withdrawn",
            data: { wallet: wallet._id, amount: value, done: true },
          });
        })
        .catch((err) => console.log(err, "HERE"));
    })
    .catch((err) => console.log(err, "H#$#"));
};

const wallet = (req, res) => {
  let { user } = req.body;

  user = gds.get_folder_by_id(user).readone(user);

  res.json({
    ok: true,
    message: "user wallet",
    data: WALLETS.readone(user.wallet),
  });
};

const topup = (req, res) => {
  let { value, wallet } = req.body;

  wallet = WALLETS.update(wallet, { balance: { $inc: value } });
  if (!wallet) return res.end();

  let tx = {
    type: "balance",
    user: wallet.user,
    title: "Topup",
    vendor: wallet.vendor,
    value,
    credit: true,
    wallet: wallet._id,
  };

  TRANSACTIONS.write(tx);

  res.json({ ok: false, message: "topup", data: { success: true, value } });
};

export { transactions, get_banks, withdraw_wallet, wallet, topup, rewards };
