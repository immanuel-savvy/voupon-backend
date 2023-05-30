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
  PRODUCT_SUBSCRIPTIONS,
  VENDOR_SUBSCRIPTIONS,
  SUBSCRIPTION_PLANS,
  USER_SUBSCRIPTIONS,
  SUBCRIPTIONS,
  COMMENTS,
  REPLIES,
  PRODUCTS,
  VENDOR_PRODUCTS,
  USER_VOUCHERS,
  COUPONS,
  EVENTS,
  TICKETS,
  USER_TICKETS,
  EVENT_TICKETS,
  VENDOR_EVENTS,
  VENDORS_COUPONS,
  USER_COUPONS,
  SUBSCRIPTION_AUTHORIZATIONS,
  WISHLIST,
  ACCOUNTS,
  LOGS,
  PAYMENT_DATA,
  NOTIFICATIONS,
  USER_VERIFICATION_DETAILS,
  USERS_HASH;

const ds_conn = () => {
  gds = new GDS(
    "voupon",
    process.env["PWD"].includes("www")
      ? process.env["PWD"].split("/").slice(0).join("/")
      : null
  ).sync();

  USERS = gds.folder("users");
  VENDORS = gds.folder("vendors");
  SUBSCRIPTION_AUTHORIZATIONS = gds.folder("subscription_authorisation");
  OFFER_VOUCHERS = gds.folder("offer_vouchers", "vendor", "voucher");
  OPEN_VOUCHERS = gds.folder("open_vouchers", "user", "voucher");
  ADMINSTRATORS = gds.folder("adminstrators");
  ADMIN_HASH = gds.folder("admin_hash", "admin");
  GLOBALS = gds.folder("globals", "global");
  USER_VERIFICATION_DETAILS = gds.folder("user_verification_details");
  USERS_HASH = gds.folder("user_hash", "user");
  REVIEWS = gds.folder("reviews");
  LOGS = gds.folder("logs");
  FAQS = gds.folder("faqs");
  SUBSCRIPTION_PLANS = gds.folder("subscription_plans", "plan", "subscription");
  PRODUCTS = gds.folder("products", null, "vendor");
  VENDOR_PRODUCTS = gds.folder("vendor_products", "vendor", "product");
  TRANSACTIONS = gds.folder(
    "transactions",
    "wallet",
    new Array("data", "vendor", "authorisation", "customer")
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
  NOTIFICATIONS = gds.folder("notifications", "user", "data");

  PRODUCT_SUBSCRIPTIONS = gds.folder(
    "product_subscriptions",
    "product",
    "subscription"
  );
  VENDOR_SUBSCRIPTIONS = gds.folder(
    "vendor_subscriptions",
    "vendor",
    new Array("subscription")
  );
  PAYMENT_DATA = gds.folder("payment_data");
  USER_SUBSCRIPTIONS = gds.folder("user_subscriptions", "user", "subscription");
  SUBCRIPTIONS = gds.folder(
    "subscriptions",
    null,
    new Array("product", "authorisation", "user")
  );
};

export {
  gds,
  USERS,
  ADMIN_HASH,
  PAYMENT_DATA,
  ADMINSTRATORS,
  SUBSCRIPTION_AUTHORIZATIONS,
  USERS_HASH,
  COUPONS,
  VENDORS_COUPONS,
  GLOBALS,
  EVENT_TICKETS,
  EVENTS,
  WISHLIST,
  LOGS,
  USER_TICKETS,
  PURCHASED_VOUCHERS,
  NOTIFICATIONS,
  ACCOUNTS,
  USER_VERIFICATION_DETAILS,
  REDEEMED_VOUCHERS,
  USER_COUPONS,
  SUBSCRIPTION_PLANS,
  VENDOR_EVENTS,
  COMMENTS,
  OFFER_VOUCHERS,
  PRODUCT_SUBSCRIPTIONS,
  VENDOR_SUBSCRIPTIONS,
  USER_SUBSCRIPTIONS,
  SUBCRIPTIONS,
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
