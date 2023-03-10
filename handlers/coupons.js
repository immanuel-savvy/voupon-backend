import {
  COUPONS,
  USERS,
  USER_COUPONS,
  VENDORS,
  VENDORS_COUPONS,
} from "../ds/conn";
import { generate_random_string } from "../functions";
import { user } from "./users";
import { reset_vendor_id } from "./voucher";

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
    quantities: coupon.quantities,
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

/**
 * @api {post} /applied_coupon Applied Coupon
 * @apiName AppliedCoupon
 * @apiGroup Coupons
 * @apiDescription Call this function to reflect the usage of a coupon after been applied, to avoid overusage of a coupon overtime.
 * @apiBody {String} coupon Coupon ID as returned from `/retrieve_coupon` endpoint
 * @apiBody {String} user User ID of coupon owner in the case of a `premium` coupon
 *
 * @apiSuccessExample {json} Successful Response:
 * { success: true, coupon: "coupons~dy62P4W6Sa92L02YCF~1677750283500" }
 *
 */
const applied_coupon = (req, res) => {
  let { coupon, user } = req.body;

  if (!coupon)
    return res.json({
      ok: false,
      message: "what coupon?",
      data: { message: "Coupon field is missing" },
    });
  if (!user && !coupon.startWith("coupon"))
    return res.json({
      ok: false,
      message: "coupon user missing",
      data: { coupon },
    });

  if (coupon.startWith("coupon"))
    COUPONS.update(coupon, { quantities: { $dec: 1 } });
  else if (coupon.startWith("user_coupons"))
    USER_COUPONS.update({ coupon, user }, { quantities: { $dec: 1 } });
  else
    return res.json({
      ok: false,
      message: "Invalid coupon type",
      data: { message: "Invalid coupon type" },
    });

  res.json({
    ok: true,
    message: "coupon applied",
    data: { success: true, coupon },
  });
};

/**
 * @api {post} /retrieve_coupon Retrieve Coupon
 * @apiName RetrivedCoupon
 * @apiGroup Coupons
 * @apiDescription Fetch coupon details to calculate the new value of your merchandise
 * @apiBody {String} coupon_code Coupon Code
 * @apiBody {String} vendor Vendor ID
 * @apiBody {String} email Coupon user email
 * @apiBody {String} type Coupon Type, can be either `open` or `premium`
 *
 * @apiSuccessExample {json} Successful Response:
 * {
 *  ok: true,
 *  data: {
 *    coupon: {
 *      user: "users~vKGMrOTFgF24p5dMZYq~1676454919457",
 *      value: 12,
 *      _id: "coupons~dy62P4W6Sa92L02YCF~1677750283500",
 *    },
 *   }
 * }
 *
 */

const retrieve_coupon = (req, res) => {
  verify_coupon(req, res, true);
};

const verify_coupon = (req, res, minimal = false) => {
  let { coupon_code, vendor, email, type } = req.body;

  let coupon;
  if (type === "open") {
    coupon = COUPONS.readone({ coupon_code });
  } else {
    let user = USERS.readone({ email });
    if (!user)
      return res.json({ ok: false, data: { message: "User not found" } });

    coupon = USER_COUPONS.readone({ user: user._id, coupon_code });
  }

  if (vendor) {
    if (vendor.includes("$")) vendor = reset_vendor_id(vendor);
    if (coupon.coupon.vendor._id !== vendor)
      return res.json({
        ok: false,
        message: "coupon does not belong with vendor",
        data: { message: "coupon does not belong with vendor" },
      });
  }

  if (!coupon)
    return res.json({ ok: false, data: { message: "Coupon not found" } });

  res.json({
    ok: true,
    data: minimal
      ? {
          coupon: {
            user: user && user._id,
            value: coupon.coupon.value,
            coupon_id: coupon.coupon._id,
            _id: coupon._id,
          },
        }
      : { coupon },
  });
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
  retrieve_coupon,
  user_coupons,
  applied_coupon,
  premium_coupon_obtained,
};
