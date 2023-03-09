import {
  COUPONS,
  USERS,
  USER_COUPONS,
  VENDORS,
  VENDORS_COUPONS,
} from "../ds/conn";
import { generate_random_string } from "../functions";

const new_coupon = (req, res) => {
  let coupon = req.body;

  let coupon_code;
  if (coupon.type === "open") {
    coupon_code = generate_random_string(7, "alpha").toUpperCase();
    coupon.coupon_code = coupon_code;
  }
  let result = COUPONS.write(coupon);

  VENDORS_COUPONS.write({ vendor: coupon.vendor, coupon: result._id });

  res.json({
    ok: true,
    message: "new coupon",
    data: { _id: result._id, created: result.created, coupon_code },
  });
};

const vendor_coupons = (req, res) => {
  let { vendor } = req.params;

  let coupons = VENDORS_COUPONS.read({ vendor });

  let open_coupons = new Array(),
    premium_coupons = new Array();

  coupons.map((coupon) => {
    if (coupon.coupon.type === "open") open_coupons.push(coupon.coupon);
    else if (coupon.coupon.type === "premium")
      premium_coupons.push(coupon.coupon);
  });

  res.json({
    ok: true,
    message: "vendor coupons",
    data: { open_coupons, premium_coupons, vendor },
  });
};

const coupons = (req, res) => {
  let { type, limit, skip } = req.body;

  res.json({
    ok: true,
    message: "coupons",
    data: COUPONS.read(type ? { type } : null, {
      limit: Number(limit),
      skip: Number(skip),
    }),
  });
};

const premium_coupon_obtained = (req, res) => {
  let details = req.body;
  console.log(details);

  let { user, email, coupon } = details;
  if (!user) {
    user = USERS.readone({ email });
    user = user && user._id;

    if (!user)
      return res.json({ ok: false, data: { message: "User not found!" } });
  }

  if (!!USER_COUPONS.readone({ user, coupon }))
    return res.json({
      ok: false,
      data: { message: "You already own this coupon." },
    });

  coupon = COUPONS.readone(coupon);
  if (typeof coupon.duration === "number" && coupon.duration < Date.now()) {
    return res.json({ ok: false, data: { message: "Coupon already expired" } });
  }
  if (coupon.usage >= coupon.quantities)
    return res.json({
      ok: false,
      data: { message: "Coupon have reached max usage" },
    });

  coupon.vendor = coupon.vendor._id;

  let coupon_code = generate_random_string(7, "alpha").toUpperCase();
  coupon.coupon_code = coupon_code;

  let user_coupon = {
    coupon: coupon._id,
    coupon_code,
    user,
    vendor: coupon.vendor,
  };

  let result = USER_COUPONS.write(user_coupon);

  COUPONS.update(coupon._id, {
    obtained: { $inc: 1 },
  });

  res.json({
    ok: true,
    message: "premium coupon obtained",
    data: {
      _id: result._id,
      created: result.created,
      coupon_code,
      coupon: {
        ...coupon,
        vendor: VENDORS.readone(coupon.vendor),
        coupon_code,
      },
    },
  });
};

const search_coupons = (req, res) => {
  let { search_param, type } = req.body;

  res.json({
    ok: true,
    message: "search coupons",
    data: COUPONS.read(type ? { type } : null, { search_param }),
  });
};

const verify_coupon = (req, res) => {
  let { coupon_code, email, type } = req.body;

  let coupon;
  if (type === "open") {
    coupon = COUPONS.readone({ coupon_code });
  } else {
    let user = USERS.readone({ email });
    if (!user)
      return res.json({ ok: false, data: { message: "User not found" } });

    coupon = USER_COUPONS.readone({ user: user._id, coupon_code });
  }

  if (!coupon)
    return res.json({ ok: false, data: { message: "Coupon not found" } });

  res.json({ ok: true, data: { coupon } });
};

const user_coupons = (req, res) => {
  let { user } = req.params;

  res.json({
    ok: true,
    message: "user coupons",
    data: USER_COUPONS.read({ user }),
  });
};

export {
  new_coupon,
  search_coupons,
  vendor_coupons,
  verify_coupon,
  coupons,
  user_coupons,
  premium_coupon_obtained,
};
