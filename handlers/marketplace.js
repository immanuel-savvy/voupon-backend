import { PRODUCTS, VENDORS, VENDOR_PRODUCTS, WISHLIST } from "../ds/conn";
import { save_image } from "./utils";

const create_product_et_service = (req, res) => {
  let product = req.body;

  product.images = product.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });
  let result = PRODUCTS.write(product);
  product._id = result._id;
  product.created = result.created;

  product._id &&
    VENDOR_PRODUCTS.write({ product: product._id, vendor: product.vendor });

  VENDORS.update(product.vendor, { products: { $inc: 1 } });

  res.json({
    ok: true,
    message: "product created",
    data: product,
  });
};

const update_product = (req, res) => {
  let product = req.body;

  product.images = product.images.map((img) => {
    img.url = save_image(img.url);

    return img;
  });

  PRODUCTS.update(product._id, { ...product });

  res.json({
    ok: true,
    message: "product updated",
    data: product,
  });
};

const vendor_products_et_service = (req, res) => {
  let { vendor } = req.params;
  let { limit, skip } = req.body;

  let products = VENDOR_PRODUCTS.read({ vendor }, { limit, skip });

  res.json({
    ok: true,
    messsage: "vendor products and services",
    data: products,
  });
};

const add_to_wishlist = (req, res) => {
  let data = req.body;

  !!WISHLIST.readone(data) ? null : WISHLIST.write(data);

  res.end();
};

const remove_from_wishlist = (req, res) => {
  let data = req.body;

  WISHLIST.remove(data);

  res.end();
};

const wishlist = (req, res) => {
  let { user } = req.params;

  res.json({ ok: true, data: WISHLIST.read({ user }) });
};

const products = (req, res) => {
  let { skip, limit } = req.body;

  res.json({ ok: true, data: PRODUCTS.read(null, { skip, limit }) });
};

export {
  create_product_et_service,
  update_product,
  vendor_products_et_service,
  add_to_wishlist,
  remove_from_wishlist,
  products,
  wishlist,
};
