import { generate_random_string } from "generalised-datastore/utils/functions";
import {
  EVENTS,
  EVENT_TICKETS,
  TICKETS,
  TRANSACTIONS,
  USERS,
  USER_TICKETS,
  VENDORS,
  VENDOR_EVENTS,
  WALLETS,
} from "../ds/conn";
import { voucher_otp_email, voucher_purchased_email } from "./emails";
import { default_wallet } from "./starter";
import { send_mail } from "./users";
import { save_image } from "./utils";
import { reset_vendor_id } from "./voucher";

const ticket_otp = new Object();

const create_event = (req, res) => {
  let event = req.body;

  event.images = event.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });
  let result = EVENTS.write(event);
  event._id = result._id;
  event.created = result.created;

  event._id && VENDOR_EVENTS.write({ event: event._id, vendor: event.vendor });

  res.json({
    ok: true,
    message: "event created",
    data: event,
  });
};

const update_event = (req, res) => {
  let event = req.body;

  event.images = event.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });

  EVENTS.update({ _id: event._id, vendor: event.vendor }, { ...event });

  res.json({
    ok: true,
    message: "event updated",
    data: event,
  });
};

const vendor_events = (req, res) => {
  let { vendor } = req.body;

  res.json({
    ok: true,
    message: "vouchers",
    data: VENDOR_EVENTS.read({ vendor }),
  });
};

const events = (req, res) => {
  let { limit, skip } = req.body;

  let events_ = EVENTS.read(null, { limit: Number(limit), skip: Number(skip) });

  res.json({ ok: true, message: "events", data: { events: events_ } });
};

const ticket_purchased = (req, res) => {
  let details = req.body;
  let { user, email, quantity } = details;
  quantity = Number(quantity || 1);

  let firstname, lastname;
  if (!user) {
    user = USERS.readone({ email });
    if (!user)
      return res.json({ ok: false, data: { message: "User not found" } });
    firstname = user.firstname;
    lastname = user.lastname;
    user = user._id;
  }

  let ticket_code = new Array();
  for (let i = 0; i < quantity; i++)
    ticket_code.push(generate_random_string(6, "alpha").toUpperCase());

  let event = EVENTS.update(
    { _id: details.event },
    {
      total_sales: { $inc: quantity },
      quantity: { $dec: quantity },
    }
  );

  let ticket, ticket_res;

  let user_ticket = USER_TICKETS.readone({ user, event: event._id });
  if (user_ticket) {
    USER_TICKETS.update(
      { user, _id: user_ticket._id },
      { ticket_code: { $push: ticket_code }, quantity: { $inc: quantity } }
    );
    EVENT_TICKETS.update(
      { ticket: user_ticket.ticket._id, event: event._id },
      { ticket_code: { $push: ticket_code }, quantity: { $inc: quantity } }
    );
    ticket_res = TICKETS.update(
      { user, event: event._id },
      { ticket_code: { $push: ticket_code }, quantity: { $inc: quantity } }
    );
  } else {
    ticket = {
      ticket_code,
      quantity,
      event: event._id,
      user,
      used_codes: new Array(),
    };

    ticket_res = TICKETS.write(ticket);
    ticket._id = ticket_res._id;
    ticket.created = ticket_res.created;

    EVENT_TICKETS.write({
      ticket: ticket._id,
      user,
      event: event._id,
      ticket_code,
      quantity,
    });

    USER_TICKETS.write({
      ticket_code,
      vendor: details.vendor,
      quantity,
      event: event._id,
      ticket: ticket._id,
      user,
    });
  }

  let tx = {
    event: details.event,
    user,
    type: "ticket",
    title: "ticket purchased",
    vendor: details.vendor,
    ticket_code,
    value: event.value,
    quantity,
    credit: true,
  };

  TRANSACTIONS.write(tx);

  send_mail({
    recipient: details.email,
    recipient_name: `${firstname} ${lastname}`,
    subject: "[Voucher Africa] Ticket Purchased",
    sender: "signup@udaralinksapp.com",
    sender_name: "Voucher Africa",
    sender_pass: "signupudaralinks",
    html: voucher_purchased_email({ ...details, ticket_code }),
  });

  res.json({
    ok: true,
    message: "ticket purchased",
    data: { ticket_code, _id: ticket_res._id, created: ticket_res.created },
  });
};

const user_tickets = (req, res) => {
  let { user } = req.body;

  let tickets = USER_TICKETS.read({ user });

  res.json({ ok: false, message: "User tickets", data: tickets });
};

const event_tickets = (req, res) => {
  let { event } = req.body;

  let tickets = EVENT_TICKETS.read({ event });

  res.json({ ok: true, message: "event tickets", data: tickets });
};

/**
 * @api {post} /can_transact_ticket Check Ticket's Transactable
 * @apiName CanTransactTicket
 * @apiGroup Tickets
 * @apiDescription Check if ticket is transactable before proceeding to exchange value for it.
 * @apiBody {string} ticket_code Ticket Code
 * @apiBody {string} vendor Vendor ID
 * @apiBody {string} email User email whose ticket it is.
 * @apiSuccessExample {json} Successful Response:
 * {
 *    "ok":true,
 *    "message":"can transact ticket",
 *    "data":{
 *      "can_transact":true,
 *      "ticket_code":"LCVOYCF",
 *      "user":"users~TctMXYZ2eBOAkhA3Q4I~1677750613595",
 *      "vendor":"vendors~TctMJJABOAkhA3Q4I~1677750613515",
 *      "event":"events~TctMprsteBOAkhA3Q4I~1677750603505"
 *    }
 * }
 *
 */
const can_transact_ticket = (req, res) => {
  let { ticket_code, vendor, user, email } = req.body;

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

  let ticket = USER_TICKETS.readone({ ticket_code, user });

  if (!ticket)
    return res.json({
      ok: false,
      message: "cannot transact ticket",
      data: { message: "Ticket not found" },
    });

  if (vendor && ticket.vendor !== vendor)
    return res.json({
      ok: false,
      data: { message: "ticket does not belong to vendor" },
    });

  if (ticket.used_codes && ticket.used_codes.includes(ticket_code))
    return res.json({
      ok: false,
      data: { message: `Ticket code has been used` },
    });

  if (ticket.state && ticket.state !== "unused")
    return res.json({
      ok: false,
      data: { message: `Ticket has been ${ticket.state}` },
    });

  res.json({
    ok: true,
    message: "can transact ticket",
    data: {
      can_transact: true,
      ticket_code: ticket.ticket_code,
      user,
      vendor: ticket.vendor,
      event: ticket.event._id,
    },
  });
};

/**
 * @api {post} /request_ticket_otp Authorise Ticket Usage
 * @apiName Request Ticket OTP
 * @apiGroup Tickets
 * @apiDescription Authorise access to ticket usage, by generating a One-Time password sent to owner's email
 * @apiBody {string} ticket_code Ticket Code
 * @apiBody {string} email Authorised email that ticket was purchased with.
 * @apiSuccessExample {json} Successful Response:
 * {
 *    "ok":true,
 *    "message":"ticket otp sent",
 *    "data":{
 *      "ticket":"tickets~TctMAG2eBOAkhA3Q4I~1677750613505",
 *      "email":"example@mail.com",
 *      "user":"users~TctMAG2eBOAkhA3QAD~1677750614508",
 *      "event":"events~TctMAG2eBOAkhA3Q4I~1677750613592"
 *    }
 * }
 */
const request_ticket_otp = (req, res) => {
  let { ticket_code, user, email } = req.body;

  if (!user && email) {
    user = USERS.readone({ email });
    user = user && user._id;

    if (!user) return res.json({ ok: false, message: "User not found" });
  } else if (!email && user) email = USERS.readone(user).email;

  let code = generate_random_string(6, "num");
  let ticket = TICKETS.readone({ ticket_code });

  if (!ticket) return res.json({ ok: false });

  let { _id } = ticket;

  ticket_otp[`${ticket._id}${ticket_code}`] = Number(code);

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
    subject: "[Voucher Africa] Ticket OTP",
    html: voucher_otp_email({ ...ticket, code }),
  });

  res.json({
    ok: true,
    message: "ticket otp sent",
    data: { ticket: _id, email, user, event: ticket.event._id },
  });
};

/**
 * @api {post} /use_ticket Use Ticket
 * @apiName Use Ticket
 * @apiGroup Tickets
 * @apiDescription Call this endpoint to transfer ticket's value to vendor's wallet.
 * @apiBody {string} vendor Vendor ID
 * @apiBody {string} otp One-Time password genereted from the `/request_ticket_otp` endpoint
 * @apiBody {string} ticket Ticket ID being used
 * @apiBody {string} ticket_code Ticket Code being used
 * @apiBody {string} user User ID as returned from the `/request_ticket_otp` endpoint
 * @apiSuccessExample {json} Successful Response:
 * {
 *    "ok":true,
 *    "message":"ticket used",
 *    "data":{
 *      "success":true,
 *      "ticket":"tickets~TctMAG2eBOAkhA3Q4I~1677750613505",
 *      "ticket_code":"XYZABC",
 *      "vendor":"vendors~TctMAG2eBOAkhA3KKL~1677750613691",
 *      "user": {user_object}
 *    }
 * }
 */

const use_ticket = (req, res) => {
  let { vendor, otp, ticket, ticket_code, user } = req.body;

  if (!vendor) vendor = req.header.vendor_id;
  else {
    if (vendor && !vendor.startsWith("vendor"))
      vendor = reset_vendor_id(vendor);
  }

  if (!otp || Number(otp) !== ticket_otp[`${ticket}${ticket_code}`])
    return res.json({
      ok: false,
      message: "ticket otp registration failed",
      data: { otp, ticket, message: "Ticket OTP validation failed" },
    });

  ticket = TICKETS.readone(ticket);
  USER_TICKETS.readone({ ticket, user });

  vendor = VENDORS.readone(vendor);

  let value = Number(ticket.event.value);

  let vendor_value = value * (value * 0.05);
  WALLETS.update(vendor.wallet, { tickets: { $inc: vendor_value } });

  let tx = {
    wallet: vendor.wallet,
    voucher: ticket._id,
    customer: user,
    type: "ticket",
    title: "ticket used",
    vendor: vendor._id,
    voucher_code: ticket.voucher_code,
    value: vendor_value,
    credit: true,
    data: ticket._id,
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
    voucher_code: ticket.voucher_code,
    title: "Offer Voucher Sales Commission",
    wallet: default_wallet,
    type: "ticket",
    user,
    ticket: ticket._id,
  });

  WALLETS.update(vendor.wallet, { tickets: { $inc: value } });

  USER_TICKETS.update(
    { user, ticket: ticket._id },
    { used_codes: { $push: ticket_code } }
  );
  EVENT_TICKETS.update(
    { ticket: ticket._id, event: ticket.event._id },
    { used_codes: { $push: ticket_code } }
  );
  ticket = TICKETS.update(
    { _id: ticket._id },
    { used_codes: { $push: ticket_code } }
  );

  res.json({
    ok: true,
    message: "ticket used",
    data: {
      success: true,
      ticket,
      ticket_code,
      vendor,
      user: USERS.readone(user),
    },
  });
};

const verify_ticket = (req, res) => {
  let { email, ticket_code } = req.body;

  let user = USERS.readone({ email });
  if (!user)
    return res.json({ ok: false, data: { message: "User not found!" } });

  user = user._id;

  let user_ticket = USER_TICKETS.readone({ ticket_code, user });
  if (!user_ticket)
    return res.json({
      ok: false,
      data: {
        message: `User does not have ticket with ticket code - ${ticket_code}`,
      },
    });

  console.log(user_ticket);
  let ticket = TICKETS.readone(user_ticket.ticket);
  console.log(ticket);

  if (ticket && ticket.used_codes && ticket.used_codes.includes(ticket_code))
    ticket.state = "used";

  ticket.ticket_code = new Array(ticket_code);
  console.log(ticket);

  res.json({
    ok: true,
    message: "verify ticket",
    data: { ticket, verified: true, state: ticket && ticket.state },
  });
};

const upcoming_events = (req, res) => {
  let { limit } = req.params;

  let events = EVENTS.read(
    { event_date_time: { $gt: Date.now() } },
    { limit: Number(limit) }
  );

  res.json({ ok: true, message: "upcoming events", data: events });
};

export {
  create_event,
  upcoming_events,
  request_ticket_otp,
  vendor_events,
  events,
  ticket_purchased,
  event_tickets,
  use_ticket,
  verify_ticket,
  can_transact_ticket,
  user_tickets,
  update_event,
};
