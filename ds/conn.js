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
  PURCHASED_TICKETS,
  REDEEMED_VOUCHERS,
  COMMENTS,
  REPLIES,
  PRODUCTS,
  VENDOR_PRODUCTS,
  USER_VOUCHERS,
  COUPONS,
  EVENTS,
  TICKETS,
  CARTS,
  USER_TICKETS,
  EVENT_TICKETS,
  VENDOR_EVENTS,
  VENDORS_COUPONS,
  USER_COUPONS,
  WISHLIST,
  ACCOUNTS,
  USERS_HASH;

const ds_conn = () => {
  gds = new GDS(
    "voupon",
    process.env["PWD"].includes("www")
      ? process.env["PWD"].split("/").slice(0, -1).join("/")
      : null
  ).sync();

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
  PRODUCTS = gds.folder("products");
  VENDOR_PRODUCTS = gds.folder("vendor_products", "vendor", "product");
  TRANSACTIONS = gds.folder(
    "transactions",
    "wallet",
    new Array("data", "vendor", "customer")
  );
  WALLETS = gds.folder("wallets");
  VOUCHERS = gds.folder("vouchers", null, "vendor");
  COUPONS = gds.folder("coupons", null, "vendor");
  VENDORS_COUPONS = gds.folder("vendor_coupons", "vendor", "coupon");
  USER_COUPONS = gds.folder("user_coupons", "user", "coupon");
  COMMENTS = gds.folder("comments", "item");
  REPLIES = gds.folder("replies", "comment");

  REDEEMED_VOUCHERS = gds.folder("redeemed_vouchers");

  WISHLIST = gds.folder("wishlist", "user", "product");
  CARTS = gds.folder("carts", "user", "product");

  TICKETS = gds.folder("tickets", null, "event");
  EVENT_TICKETS = gds.folder("event_tickets", "event", "user");
  EVENTS = gds.folder("events", null, "vendor");
  VENDOR_EVENTS = gds.folder("vendor_events", "vendor", "event");
  USER_TICKETS = gds.folder("user_tickets", "user", "ticket");
  USER_VOUCHERS = gds.folder("user_vouchers", "user", "voucher");
  TRUSTEES = gds.folder("trustees");
  PURCHASED_TICKETS = gds.folder("purchased_tickets", null, "event");
  PURCHASED_VOUCHERS = gds.folder("purchased_vouchers", null, "voucher");
  CONTACT_MESSAGES = gds.folder("contact_messages", null, "interest");
  ACCOUNTS = gds.folder("accounts", "wallet");
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
  CARTS,
  EVENT_TICKETS,
  EVENTS,
  WISHLIST,
  USER_TICKETS,
  PURCHASED_VOUCHERS,
  ACCOUNTS,
  REDEEMED_VOUCHERS,
  USER_COUPONS,
  VENDOR_EVENTS,
  COMMENTS,
  OFFER_VOUCHERS,
  WALLETS,
  PRODUCTS,
  VENDOR_PRODUCTS,
  TICKETS,
  TRANSACTIONS,
  REPLIES,
  CONTACT_MESSAGES,
  VOUCHERS,
  TRUSTEES,
  OPEN_VOUCHERS,
  PURCHASED_TICKETS,
  FAQS,
  VENDORS,
  USER_VOUCHERS,
  REVIEWS,
};
export default ds_conn;
