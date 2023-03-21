import {
  login,
  signup,
  update_user,
  user,
  user_by_email,
  verify_email,
} from "./handlers/users";

import {
  about_statement,
  add_trusted_by,
  user_review,
  approve_review,
  faqs,
  new_faq,
  new_review,
  remove_faq,
  remove_review,
  remove_trustee,
  reviews,
  trusted_by,
  update_user_review,
  update_faq,
  post_about_statement,
} from "./handlers/sections";

import {
  contact_messages,
  contact_message_seen,
  newsletter_subscribers,
  new_contact_message,
  remove_contact_messages,
  remove_subscriber,
  subscribe_newsletter,
} from "./handlers/starter";

import { admin_login, create_admin, get_admins, stats } from "./handlers/admin";

import {
  accounts,
  add_account,
  close_vendor_account,
  request_to_become_a_vendor,
  unverified_vendors,
  vendor,
  vendors,
  vendor_wallet,
  verify_vendor,
} from "./handlers/vendors";
import {
  can_redeem_voucher,
  close_voucher,
  create_offer_voucher,
  create_open_voucher,
  generate_voucher_otp,
  get_offer_vouchers,
  offer_vouchers,
  open_vouchers,
  redeem_voucher,
  request_voucher_otp,
  transfer_voucher,
  user_vouchers,
  use_voucher,
  vendor_id,
  verify_voucher,
  voucher_purchased,
} from "./handlers/voucher";
import { get_banks, transactions, withdraw_wallet } from "./handlers/wallets";
import {
  applied_coupon,
  coupons,
  new_coupon,
  premium_coupon_obtained,
  retrieve_coupon,
  search_coupons,
  user_coupons,
  vendor_coupons,
  verify_coupon,
} from "./handlers/coupons";
import {
  comments,
  comment_dislike,
  comment_heart,
  comment_like,
  comment_rating,
  new_comment,
  new_reply,
  replies,
} from "./handlers/comments";
import {
  can_transact_ticket,
  create_event,
  events,
  event_tickets,
  request_ticket_otp,
  ticket_purchased,
  upcoming_events,
  user_tickets,
  use_ticket,
  vendor_events,
  verify_ticket,
} from "./handlers/tickets";

const router = (app) => {
  app.get("/user/:user_id", user);
  app.get("/newsletter_subscribers", newsletter_subscribers);
  app.get("/about_statement", about_statement);
  app.get("/trusted_by", trusted_by);
  app.get("/user_review", user_review);
  app.get("/get_admins", get_admins);
  app.get("/stats", stats);
  app.get("/vendor/:vendor", vendor);
  app.get("/vendor_wallet/:vendor", vendor_wallet);
  app.get("/vendors/:limit", vendors);
  app.get("/unverified_vendors", unverified_vendors);
  app.get("/offer_vouchers/:vendor", offer_vouchers);
  app.get("/open_vouchers/:user", open_vouchers);
  app.get("/get_offer_vouchers/:limit", get_offer_vouchers);
  app.get("/user_vouchers/:user", user_vouchers);
  app.get("/user_coupons/:user", user_coupons);
  app.get("/get_banks", get_banks);
  app.get("/accounts/:wallet", accounts);

  app.post("/request_to_become_a_vendor", request_to_become_a_vendor);
  app.post("/verify_vendor/:vendor", verify_vendor);
  app.post("/voucher_purchased", voucher_purchased);
  app.post("/create_open_voucher", create_open_voucher);
  app.post("/can_redeem_voucher", can_redeem_voucher);
  app.post("/redeem_voucher", redeem_voucher);
  app.post("/transfer_voucher", transfer_voucher);
  app.post("/request_voucher_otp", request_voucher_otp);
  app.post("/close_vendor_account/:vendor", close_vendor_account);

  app.post("/signup", signup);
  app.post("/login", login);
  app.post("/user_by_email", user_by_email);
  app.post("/verify_email", verify_email);
  app.post("/create_admin", create_admin);
  app.post("/update_user/:user", update_user);
  app.post("/admin_login", admin_login);
  app.post("/contact_messages", contact_messages);
  app.post("/contact_message_seen/:message", contact_message_seen);
  app.post("/remove_contact_message/:message", remove_contact_messages);
  app.post("/new_contact_message", new_contact_message);
  app.post("/subscribe_newsletter", subscribe_newsletter);
  app.post("/remove_subscriber", remove_subscriber);

  app.post("/create_offer_voucher", create_offer_voucher);
  app.post("/use_voucher", use_voucher);

  app.post("/reviews", reviews);
  app.post("/new_review", new_review);
  app.post("/remove_review/:review", remove_review);
  app.post("/remove_faq/:faq", remove_faq);
  app.post("/update_faq", update_faq);
  app.post("/new_faq", new_faq);
  app.post("/faqs", faqs);
  app.post("/post_about_statement", post_about_statement);
  app.post("/update_user_review", update_user_review);
  app.post("/approve_review/:review", approve_review);
  app.post("/add_trusted_by", add_trusted_by);
  app.post("/remove_trustee/:trustee", remove_trustee);
  app.post("/verify_voucher", verify_voucher);
  app.post("/close_voucher", close_voucher);

  app.post("/new_comment", new_comment);
  app.post("/comment_like", comment_like);
  app.post("/comment_dislike", comment_dislike);
  app.post("/comment_heart", comment_heart);
  app.post("/comment_rating", comment_rating);
  app.post("/new_reply", new_reply);
  app.post("/comments", comments);
  app.post("/replies", replies);

  app.post("/vendor_id", vendor_id);
  app.post("/add_account", add_account);
  app.post("/withdraw_wallet", withdraw_wallet);

  app.post("/coupons", coupons);
  app.post("/new_coupon", new_coupon);
  app.post("/search_coupons", search_coupons);
  app.post("/verify_coupon", verify_coupon);
  app.post("/premium_coupon_obtained", premium_coupon_obtained);
  app.post("/vendor_coupons/:vendor", vendor_coupons);

  app.post("/retrieve_coupon", retrieve_coupon);
  app.post("/applied_coupon", applied_coupon);
  app.post("/transactions", transactions);
  app.post("/generate_voucher_otp", generate_voucher_otp);

  app.post("/verify_voucher_for_transaction", (req, res) =>
    can_redeem_voucher(req, res, true)
  );

  app.post("/events", events);
  app.post("/create_event", create_event);
  app.post("/vendor_events", vendor_events);
  app.post("/user_tickets", user_tickets);
  app.post("/event_tickets", event_tickets);
  app.post("/ticket_purchased", ticket_purchased);
  app.post("/request_ticket_otp", request_ticket_otp);
  app.post("/can_transact_ticket", can_transact_ticket);
  app.post("/use_ticket", use_ticket);
  app.post("/verify_ticket", verify_ticket);
  app.post("/upcoming_events/:limit", upcoming_events);
};

export default router;
