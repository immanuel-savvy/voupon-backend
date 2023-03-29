import { TRANSACTIONS, USERS, USERS_HASH, WALLETS } from "../ds/conn";
import nodemailer from "nodemailer";
import { generate_random_string } from "generalised-datastore/utils/functions";
import { verification } from "./emails";
import { remove_image, save_image } from "./utils";
import { unmask_id } from "./voucher";
import { rewards } from "./wallets";

let email_verification_codes = new Object();

const to_title = (string) => {
  if (!string) return string;

  let str = "";
  string.split(" ").map((s) => {
    if (s) str += " " + s[0].toUpperCase() + s.slice(1);
  });
  return str.trim();
};

const send_mail = ({
  recipient,
  recipient_name,
  sender_name,
  sender,
  subject,
  text,
  html,
  to,
}) => {
  let transporter;

  text = text || "";
  html = html || "";
  sender = "voucherafrica@digitaladplanet.com";
  sender_name = sender_name || "Voucher Africa";

  try {
    transporter = nodemailer.createTransport({
      host: "mail.digitaladplanet.com",
      name: "digitaladplanet.com",
      port: 465,
      secure: true,
      auth: {
        user: sender,
        pass: "voucherdigiadplanet",
      },
    });

    console.log("in here with", recipient);
  } catch (e) {}

  try {
    transporter
      .sendMail({
        from: `${sender_name} <${sender}>`,
        to: to || `${recipient_name} <${recipient}>`,
        subject,
        text,
        html,
      })
      .then((res) => {})
      .catch((e) => console.log(e));
    console.log("Email sent", recipient);
  } catch (e) {}
};

const signup = (req, res) => {
  let user = req.body;

  let key = user.password;
  delete user.password;
  user.email = user.email.toLowerCase().trim();

  let user_exists = USERS.readone({ email: user.email });
  if (user_exists && user_exists.verified)
    return res.json({
      ok: false,
      message: "user exists",
      data: "email already used.",
    });

  if (user_exists) {
    user._id = user_exists._id;
    USERS.update(user._id, {
      firstname: user.firstname,
      lastname: user.lastname,
    });

    USERS_HASH.update({ user: user._id }, { key });
  } else {
    user.image = save_image(user.image);
    let result = USERS.write(user);
    user._id = result._id;
    user.created = result.created;

    let wallet = WALLETS.write({ user: user._id });
    user.wallet = wallet._id;
    USERS.update(user._id, { wallet: wallet._id });

    if (user.referral) {
      user.referral = unmask_id(user.referral, "users");

      let referral_user = USERS.readone(user.referral);
      WALLETS.update(referral_user.wallet, {
        reward_token: { $inc: rewards.referral_signup },
      });

      let tx = {
        type: "reward_token",
        user: referral_user._id,
        title: "Referred User Signup",
        value: rewards.referral_signup,
        wallet: referral_user.wallet,
      };
      TRANSACTIONS.write(tx);
    }

    let tx = {
      type: "reward_token",
      user: referral_user._id,
      title: "Welcome Token",
      value: rewards.signup,
      wallet: user.wallet,
    };
    TRANSACTIONS.write(tx);
    WALLETS.update(wallet._id, { reward_token: { $inc: rewards.signup } });

    USERS_HASH.write({ user: user._id, key });
  }

  let code = generate_random_string(6);
  email_verification_codes[user.email] = code;

  let fullname = to_title(`${user.firstname} ${user.lastname}`);

  send_mail({
    recipient: user.email,
    recipient_name: fullname,
    subject: "[Voucher Africa] Please verify your email",
    sender: "signup@udaralinksapp.com",
    sender_name: "Voupon",
    sender_pass: "signupudaralinks",
    html: verification(code, fullname),
  });

  res.json({
    ok: true,
    message: "user signup",
    data: { email: user.email, _id: user._id },
  });
};

const user_by_email = (req, res) => {
  let { email } = req.body;

  res.json({
    ok: true,
    message: "user by email",
    data: USERS.readone({ email }) || "User not found",
  });
};

const update_user = (req, res) => {
  let { user } = req.params;

  let user_obj = req.body;

  let prior_user = USERS.readone(user);
  if (prior_user.image && user_obj.image && !user_obj.image.endsWith(".jpg"))
    remove_image(prior_user.image);

  user_obj.image = save_image(user_obj.image);

  user = USERS.update(user, { ...user_obj });

  res.json({
    ok: true,
    message: "user updated",
    data: { ...user, image: user_obj.image },
  });
};

const user = (req, res) => {
  let { user_id } = req.params;

  res.json({ ok: true, message: "user fetched", data: USERS.readone(user_id) });
};

const verify_email = (req, res) => {
  let { email, verification_code } = req.body;
  email = email && email.trim().toLowerCase();
  verification_code = verification_code && verification_code.trim();

  let code = email_verification_codes[email];

  if (!code || code !== verification_code)
    return res.json({
      ok: false,
      message: "",
      data: "Email verification failed.",
    });

  let user = USERS.readone({ email });
  USERS.update(user._id, { verified: true });

  res.json({ ok: true, message: "user email verified", data: user });
};

const login = (req, res) => {
  let { email, password } = req.body;

  let user = USERS.readone({ email: email.toLowerCase() });
  if (!user)
    return res.json({
      ok: false,
      message: "user not found",
      data: "User not found",
    });

  let user_hash = USERS_HASH.readone({ user: user._id });
  if (!user_hash || (user_hash && user_hash.key !== password))
    return res.json({
      ok: false,
      message: "invalid password",
      data: "Invalid password",
    });

  if (!user.wallet) {
    let wallet_res = WALLETS.write({
      user: user._id,
    });
    USERS.update(user._id, { wallet: wallet_res._id });
  }

  res.json({ ok: true, message: "user logged-in", data: user });
};

const premium_user_subscription = (req, res) => {
  let { user } = req.params;

  let date = Date.now();
  user = USERS.update(user, { premium: date });

  WALLETS.update(user.wallet, {
    reward_token: { $inc: rewards.annual_subscription },
  });

  let tx = {
    type: "reward_token",
    user: user._id,
    title: "Annual Subscription Reward Token",
    value: rewards.annual_subscription,
    wallet: user.wallet,
  };
  TRANSACTIONS.write(tx);

  res.json(
    user
      ? {
          ok: true,
          message: "Premium user subscription successful",
          data: { date, user: user._id },
        }
      : {
          ok: false,
          message:
            "Couldn't find user, Please contact our customer support at voucherafrica@digitaladplanet.com to rectify any charges incur.",
        }
  );
};

const claim_daily_reward_token = (req, res) => {
  let { user } = req.params;

  user = USERS.readone(user);

  WALLETS.update(user.wallet, {
    reward_token: { $inc: rewards.daily_reward_claim },
  });

  let tx = {
    type: "reward_token",
    user: user._id,
    title: "Daily Reward Token",
    value: rewards.daily_reward_claim,
    wallet: user.wallet,
  };
  TRANSACTIONS.write(tx);

  res.end();
};

export {
  signup,
  login,
  user_by_email,
  user,
  send_mail,
  verify_email,
  to_title,
  update_user,
  premium_user_subscription,
  claim_daily_reward_token,
};
