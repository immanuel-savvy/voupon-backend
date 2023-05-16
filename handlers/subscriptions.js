import {
  EVENTS,
  EVENT_TICKETS,
  GLOBALS,
  NOTIFICATIONS,
  SUBCRIPTIONS,
  TRANSACTIONS,
  USERS,
  VENDORS,
  WALLETS,
} from "../ds/conn";
import { event_reminder_emails } from "./emails";
import { GLOBAL_subscriptions } from "./marketplace";
import { default_user } from "./starter";
import { send_mail, to_title } from "./users";

const a_day = 60 * 60 * 24 * 1000;

const refresh_subscriptions = () => {
  setInterval(() => {
    let subscriptions = SUBCRIPTIONS.read(
      GLOBALS.readone({ global: GLOBAL_subscriptions }).subscribers
    );

    for (let s = 0; s < subscriptions.length; s++) {
      let subscription = subscriptions[s];

      let payer = USERS.readone(subscription.user);
      let recipient = VENDORS.readone(subscription.vendor);
      let title = subscription.title;
      let product = subscription.product;
      let part_payments = subscription.part_payments;

      let payer_wallet = WALLETS.readone(payer._id);
      if (payer_wallet.balance < part_payments) {
        NOTIFICATIONS.write({
          user: default_user,
          data: new Array(product, subscription._id),
          title: "Insufficient Payment Balance",
          vendor: recipient._id,
        });

        let tx = {
          type: "notification",
          user: payer._id,
          vendor: recipient._id,
          title: `Wallet Balance Insufficient | ${installment} Payment Fee`,
          value: part_payments,
          data: product,
          subscription: subscription._id,
          wallet: wallet_res._id,
        };

        TRANSACTIONS.write(tx);
        tx.wallet = WALLETS.readone(recipient._id).wallet;

        TRANSACTIONS.write(tx);

        return;
      }

      subscription.total_payments_made = subscription.total_payments_made || 0;

      let wallet_res = WALLETS.update(payer.wallet, {
        balance: { $dec: part_payments },
      });

      let tx = {
        type: "marketplace",
        user: payer._id,
        vendor: recipient._id,
        title: `${title} | ${subscription.installment} installment fee`,
        value: part_payments,
        data: product,
        wallet: wallet_res._id,
      };

      TRANSACTIONS.write(tx);

      wallet_res = WALLETS.update(recipient.wallet, {
        balance: { $inc: part_payments },
        total_earnings: { $inc: part_payments },
      });

      tx.wallet = wallet_res._id;
      tx.credit = true;

      TRANSACTIONS.write(tx);

      subscription.total_payments_made += 1;
      SUBCRIPTIONS.update(subscription._id, {
        total_payments_made: subscription.total_payments_made,
      });

      if (
        subscription.total_payments_made === subscription.number_of_payments
      ) {
        SUBCRIPTIONS.update(subscription._id, { running: false });
        GLOBALS.update(
          { global: GLOBAL_subscriptions },
          { subscribers: { $splice: subscription._id } }
        );
      }
    }
  }, a_day);
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

export { refresh_subscriptions, event_reminders };
