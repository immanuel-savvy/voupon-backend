import GDS from "generalised-datastore";

let gds;

let USERS,
  ADMINSTRATORS,
  ADMIN_HASH,
  CONTACT_MESSAGES,
  FAQS,
  WALLETS,
  TRANSACTIONS,
  REVIEWS,
  GLOBALS,
  OFFER_VOUCHERS,
  OPEN_VOUCHERS,
  VOUCHERS,
  VENDORS,
  TRUSTEES,
  PURCHASED_VOUCHERS,
  REDEEMED_VOUCHERS,
  COMMENTS,
  REPLIES,
  USER_VOUCHERS,
  COUPONS,
  VENDORS_COUPONS,
  USER_COUPONS,
  USERS_HASH;

const ds_conn = () => {
  gds = new GDS("voupon").sync();

  USERS = gds.folder("users");
  VENDORS = gds.folder("vendors");
  OFFER_VOUCHERS = gds.folder("offer_vouchers", "vendor", "voucher");
  OPEN_VOUCHERS = gds.folder("open_vouchers", "user", "voucher");
  ADMINSTRATORS = gds.folder("adminstrators");
  ADMIN_HASH = gds.folder("admin_hash", "admin");
  GLOBALS = gds.folder("globals", "global");
  USERS_HASH = gds.folder("user_hash", "user");
  REVIEWS = gds.folder("reviews");
  FAQS = gds.folder("faqs");
  TRANSACTIONS = gds.folder("transactions", new Array("wallet", "user"));
  WALLETS = gds.folder("wallets");
  VOUCHERS = gds.folder("vouchers", null, "vendor");
  COUPONS = gds.folder("coupons", null, "vendor");
  VENDORS_COUPONS = gds.folder("vendor_coupons", "vendor", "coupon");
  USER_COUPONS = gds.folder("user_coupons", "user", "coupon");
  COMMENTS = gds.folder("comments", "item");
  REPLIES = gds.folder("replies", "comment");

  REDEEMED_VOUCHERS = gds.folder("redeemed_vouchers");

  USER_VOUCHERS = gds.folder("user_vouchers", "user", "voucher");
  TRUSTEES = gds.folder("trustees");
  PURCHASED_VOUCHERS = gds.folder("purchased_vouchers", null, "voucher");
  CONTACT_MESSAGES = gds.folder("contact_messages", null, "interest");
};

export {
  gds,
  USERS,
  ADMIN_HASH,
  ADMINSTRATORS,
  USERS_HASH,
  COUPONS,
  VENDORS_COUPONS,
  GLOBALS,
  PURCHASED_VOUCHERS,
  REDEEMED_VOUCHERS,
  USER_COUPONS,
  COMMENTS,
  OFFER_VOUCHERS,
  WALLETS,
  TRANSACTIONS,
  REPLIES,
  CONTACT_MESSAGES,
  VOUCHERS,
  TRUSTEES,
  OPEN_VOUCHERS,
  FAQS,
  VENDORS,
  USER_VOUCHERS,
  REVIEWS,
};
export default ds_conn;
