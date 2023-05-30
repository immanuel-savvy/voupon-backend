import {
  EVENTS,
  EVENT_TICKETS,
  SUBCRIPTIONS,
  SUBSCRIPTION_PLANS,
  TRANSACTIONS,
  WALLETS,
} from "../ds/conn";
import {
  event_reminder_emails,
  installment_payment_recieved_email,
} from "./emails";
import { send_mail, to_title } from "./users";
import crypto from "crypto";
import { paystack_secret_key } from "./admin";
import axios from "axios";

const a_day = 60 * 60 * 24 * 1000;

const refresh_subscriptions = () => {
  // setInterval(() => {
  //   let subscriptions = SUBCRIPTIONS.read(
  //     GLOBALS.readone({ global: GLOBAL_subscriptions }).subscribers
  //   );
  //   for (let s = 0; s < subscriptions.length; s++) {
  //     let subscription = subscriptions[s];
  //     let payer = USERS.readone(subscription.user);
  //     let recipient = VENDORS.readone(subscription.vendor);
  //     let title = subscription.title;
  //     let product = subscription.product;
  //     let part_payments = subscription.part_payments;
  //     let payer_wallet = WALLETS.readone(payer._id);
  //     if (payer_wallet.balance < part_payments) {
  //       NOTIFICATIONS.write({
  //         user: default_user,
  //         data: new Array(product, subscription._id),
  //         title: "Insufficient Payment Balance",
  //         vendor: recipient._id,
  //       });
  //       let tx = {
  //         type: "notification",
  //         user: payer._id,
  //         vendor: recipient._id,
  //         title: `Wallet Balance Insufficient | ${installment} Payment Fee`,
  //         value: part_payments,
  //         data: product,
  //         subscription: subscription._id,
  //         wallet: wallet_res._id,
  //       };
  //       TRANSACTIONS.write(tx);
  //       tx.wallet = WALLETS.readone(recipient._id).wallet;
  //       TRANSACTIONS.write(tx);
  //       return;
  //     }
  //     subscription.total_payments_made = subscription.total_payments_made || 0;
  //     let wallet_res = WALLETS.update(payer.wallet, {
  //       balance: { $dec: part_payments },
  //     });
  //     let tx = {
  //       type: "marketplace",
  //       user: payer._id,
  //       vendor: recipient._id,
  //       title: `${title} | ${subscription.installment} installment fee`,
  //       value: part_payments,
  //       data: product,
  //       wallet: wallet_res._id,
  //     };
  //     TRANSACTIONS.write(tx);
  //     wallet_res = WALLETS.update(recipient.wallet, {
  //       balance: { $inc: part_payments },
  //       total_earnings: { $inc: part_payments },
  //     });
  //     tx.wallet = wallet_res._id;
  //     tx.credit = true;
  //     TRANSACTIONS.write(tx);
  //     subscription.total_payments_made += 1;
  //     SUBCRIPTIONS.update(subscription._id, {
  //       total_payments_made: subscription.total_payments_made,
  //     });
  //     if (
  //       subscription.total_payments_made === subscription.number_of_payments
  //     ) {
  //       SUBCRIPTIONS.update(subscription._id, { running: false });
  //       GLOBALS.update(
  //         { global: GLOBAL_subscriptions },
  //         { subscribers: { $splice: subscription._id } }
  //       );
  //     }
  //   }
  // }, a_day);
};

const event_reminders = () => {
  setInterval(() => {
    let events = EVENTS.read({
      state: { $ne: "closed" },
      event_date_time: { $gt: Date.now() },
    });

    for (let e = 0; e < events.length; e++) {
      let event = events[e];

      let { event_date_time, _id } = event;
      if (Date.now() + a_day > event_date_time) {
        let event_tickets = EVENT_TICKETS.read({ event: _id });

        event_tickets.map((e) => {
          let user = e.user;

          send_mail({
            title: "[Voucher Africa] Event Reminder",
            recipient: user.email,
            recipient_name: to_title(`${user.firstname} ${user.lastname}`),
            html: event_reminder_emails(event, user),
          });
        });
      }
    }
  }, a_day);
};

const paystack_webhook_url = (req, res) => {
  let hash = crypto
    .createHmac("sha512", paystack_secret_key)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash == req.headers["x-paystack-signature"]) {
    // Retrieve the request's body
    let { event, data } = req.body;

    if (event === "charge.success") {
      let { customer, plan } = data;

      if (plan && plan.plan_code) {
        let subscription_plan = SUBSCRIPTION_PLANS.readone({
          plan: plan.plan_code,
          customer: customer.customer_code,
        });
        if (subscription_plan) {
          axios({
            method: "get",
            url: `https://api.paystack.co/subscription/${subscription_plan.subscription_code}`,
            headers: {
              Authorization: `Bearer ${paystack_secret_key}`,
              "Content-Type": "application/json",
            },
          })
            .then((response) => {
              response = response.data;
              let { status, data } = response;
              status &&
                SUBCRIPTIONS.update(subscription_plan.subscription._id, {
                  next_payment: new Date(data.next_payment_date).getTime(),
                });
            })
            .catch((e) =>
              console.log(
                e,
                `Cannot get subscription, ${subscription_plan._id}`
              )
            );

          let result = SUBCRIPTIONS.update(subscription_plan.subscription._id, {
            total_payments_made: { $inc: 1 },
            recent_payment: Date.now(),
          });
          if (
            result.total_payments &&
            result.total_payments_made >= result.total_payments
          ) {
          }

          let vendor = subscription_plan.subscription.product.vendor;
          WALLETS.update(vendor.wallet, {
            enpl: { $inc: data.amount / 100 },
            total_earnings: { $inc: data.amount / 100 },
          });
          let { user, product } = subscription_plan.subscription;

          let tx = {
            type: "enpl",
            user: user._id,
            vendor: vendor._id,
            title: "product installment",
            value: data.amount / 100,
            data: new Array(product._id, subscription_plan.subscription._id),
            wallet: vendor.wallet,
          };
          TRANSACTIONS.write(tx);

          tx.wallet = user.wallet;
          tx.authorisation = subscription_plan.authorisation;
          TRANSACTIONS.write(tx);

          send_mail({
            title: "[Voucher Africa] Payment Recieved",
            recipient: user.email,
            recipient_name: to_title(`${user.firstname} ${user.lastname}`),
            html: installment_payment_recieved_email(subscription_plan, true),
          });
          send_mail({
            title: "[Voucher Africa] Payment Recieved",
            recipient: vendor.email,
            recipient_name: to_title(`${vendor.name}`),
            html: installment_payment_recieved_email(subscription_plan),
          });
        }
      }
    } else if (event === "invoice.payment_failed") {
      let { subscription } = data;

      if (subscription && subscription.subscription_code) {
        let subscription_plan = SUBSCRIPTION_PLANS.readone({
          subscription_code: subscription.subscription_code,
        });

        if (subscription_plan) {
          let vendor = subscription_plan.subscription.product.vendor;
          let { user, product } = subscription_plan.subscription;

          let tx = {
            type: "enpl",
            user: user._id,
            vendor: vendor._id,
            title: "[FAILED] product installment",
            value: data.amount / 100,
            data: new Array(product._id, subscription_plan.subscription._id),
            wallet: vendor.wallet,
            status: "failed",
          };
          TRANSACTIONS.write(tx);

          tx.wallet = user.wallet;
          tx.authorisation = subscription_plan.authorisation;
          TRANSACTIONS.write(tx);

          send_mail({
            title: "[Voucher Africa] Subscription Payment Failed",
            recipient: user.email,
            recipient_name: to_title(`${user.firstname} ${user.lastname}`),
            html: installment_payment_recieved_email(
              subscription_plan,
              true,
              true
            ),
          });
          send_mail({
            title: "[Voucher Africa] Subscription Payment Failed",
            recipient: vendor.email,
            recipient_name: to_title(`${vendor.name}`),
            html: installment_payment_recieved_email(
              subscription_plan,
              null,
              true
            ),
          });
        }
      }
    }
  }
  res.send(200);
};

export { refresh_subscriptions, event_reminders, paystack_webhook_url, a_day };
