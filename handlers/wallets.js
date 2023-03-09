import axios from "axios";
import { TRANSACTIONS } from "../ds/conn";
import { Paystack_private_key } from "./utils";

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
 * [
 *  {
 *   active: true,
 *   code: "035A",
 *   country: "Nigeria",
 *   createdAt: "2017-11-15T12:21:31.000Z",
 *   currency: "NGN",
 *   gateway: "emandate",
 *   id: 27,
 *   is_deleted: false,
 *   longcode: "035150103",
 *   name: "ALAT by WEMA",
 *   pay_with_bank: false,
 *   slug: "alat-by-wema",
 *   type: "nuban",
 *   updatedAt: "2022-05-31T15:54:34.000Z"
 *  },
 * ...
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
      res.json({ ok: true, message: "Banks", data: result.data });
    })
    .catch((e) => console.log(e));
};

export { transactions, get_banks };
