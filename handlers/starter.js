import {
  ADMINSTRATORS,
  ADMIN_HASH,
  CONTACT_MESSAGES,
  GLOBALS,
  USERS,
  USERS_HASH,
  WALLETS,
} from "../ds/conn";
import { GLOBAL_pending_user_verification } from "./users";

let default_admin = "adminstrators~123voupon~1234567890123",
  default_user = "users~123voupon~1234567890123",
  default_wallet;

const GLOBAL_newsletter = "newsletter",
  GLOBAL_unseen_messages = "contact_messages",
  GLOBAL_pending_vendors = "pending_vendors";

const create_default_admin = () => {
  if (!ADMINSTRATORS.readone(default_admin)) {
    ADMINSTRATORS.write({
      firstname: "Voupon",
      lastname: "Africa",
      image: "logo_single.png",
      email: "admin@voupon.com",
      _id: default_admin,
    });
    ADMIN_HASH.write({ admin: default_admin, key: "adminstrator#1" });
  }

  let user_ = USERS.readone(default_user);
  if (!user_) {
    USERS.write({
      _id: default_user,
      firstname: "Voupon",
      lastname: "Africa",
      verified: true,
      email: "vouponafrica@gmail.com",
    });
    USERS_HASH.write({ user: default_user, key: "adminstrator#1" });
  } else if (!user_.wallet) {
    let wallet = WALLETS.write({ user: default_user });

    default_wallet = wallet._id;
    USERS.update(default_user, { wallet: default_wallet });
  }

  !GLOBALS.readone({ global: GLOBAL_pending_vendors }) &&
    GLOBALS.write({ global: GLOBAL_pending_vendors, vendors: new Array() });

  !GLOBALS.readone({ global: GLOBAL_pending_user_verification }) &&
    GLOBALS.write({
      global: GLOBAL_pending_user_verification,
      users: new Array(),
    });
};

const subscribe_newsletter = (req, res) => {
  let { email } = req.body;
  if (email && typeof email === "string") {
    email = email.trim().toLowerCase();
    if (GLOBALS.readone({ global: GLOBAL_newsletter }))
      GLOBALS.update(
        { global: GLOBAL_newsletter },
        { subscribers: { $set: email } }
      );
    else {
      GLOBALS.write({
        global: GLOBAL_newsletter,
        subscribers: new Array(email),
      });
    }
  }

  res.end();
};

const remove_subscriber = (req, res) => {
  let { email } = req.body;

  email &&
    typeof email === "string" &&
    GLOBALS.update(
      { global: GLOBAL_newsletter },
      { subscribers: { $splice: email.trim().toLowerCase() } }
    );

  res.end();
};

const newsletter_subscribers = (req, res) => {
  let subscribers = GLOBALS.readone({ global: GLOBAL_newsletter });
  res.json({
    ok: true,
    message: "newsletter subscribers",
    data: subscribers ? subscribers.subscribers : new Array(),
  });
};

const contact_messages = (req, res) => {
  let { seen } = req.body || new Object();

  let msgs = (
      GLOBALS.read({ global: GLOBAL_unseen_messages }) || {
        messages: new Array(),
      }
    ).messages,
    messages;
  messages = seen
    ? CONTACT_MESSAGES.read({ _id: { $ne: msgs } })
    : CONTACT_MESSAGES.read(msgs);

  res.json({ ok: true, message: "contact messages fetched", data: messages });
};

const remove_contact_messages = (req, res) => {
  let { message } = req.params;

  CONTACT_MESSAGES.remove(message);
  res.end();
};

const contact_message_seen = (req, res) => {
  let { message } = req.params;

  GLOBALS.update(
    { global: GLOBAL_unseen_messages },
    { messages: { $splice: message } }
  );
  CONTACT_MESSAGES.update(message, { seen: true });

  res.end();
};

const new_contact_message = (req, res) => {
  let message = req.body;

  let result = CONTACT_MESSAGES.write(message);
  if (GLOBALS.readone({ global: GLOBAL_unseen_messages }))
    GLOBALS.update(
      { global: GLOBAL_unseen_messages },
      { messages: { $push: result._id } }
    );
  else
    GLOBALS.write({
      global: GLOBAL_unseen_messages,
      messages: new Array(result._id),
    });

  res.end();
};

export {
  remove_subscriber,
  create_default_admin,
  subscribe_newsletter,
  contact_messages,
  new_contact_message,
  newsletter_subscribers,
  remove_contact_messages,
  contact_message_seen,
  GLOBAL_newsletter,
  GLOBAL_pending_vendors,
  default_wallet,
};
