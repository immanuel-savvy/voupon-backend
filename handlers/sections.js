import { FAQS, GLOBALS, REVIEWS, TRUSTEES } from "../ds/conn";
import { remove_image, remove_video, save_image, save_video } from "./utils";

const GLOBAL_user_review = "user_review";

const GLOBALS_verified_reviews = "verified_reviews";

const GLOBALS_about_statement = "about_statement";

const about_statement = (req, res) => {
  let about_statement = GLOBALS.readone({ global: GLOBALS_about_statement });

  res.json({ ok: true, message: "about statement", data: about_statement });
};

const post_about_statement = (req, res) => {
  let { text } = req.body;

  let about_statement = GLOBALS.readone({ global: GLOBALS_about_statement });
  if (about_statement)
    GLOBALS.update({ global: GLOBALS_about_statement }, { text });
  else GLOBALS.write({ global: GLOBALS_about_statement, text });

  res.end();
};

const approve_review = (req, res) => {
  let { review } = req.params;

  let globals = GLOBALS.readone({ global: GLOBALS_verified_reviews });
  if (globals)
    GLOBALS.update(
      { global: GLOBALS_verified_reviews },
      { reviews: { $push: review } }
    );
  else
    GLOBALS.write({
      global: GLOBALS_verified_reviews,
      review: new Array(review),
    });

  REVIEWS.update(review, { verified: true });

  res.end();
};

const reviews = (req, res) => {
  let { limit, verified } = req.body;

  let reviews;
  let verified_reviews = GLOBALS.readone({
    global: GLOBALS_verified_reviews,
  });

  if (!verified_reviews) reviews = new Array();
  else reviews = verified_reviews.reviews;

  reviews = REVIEWS.read(verified ? reviews : null, {
    exclude: verified ? null : reviews,
    limit,
  });

  res.json({ ok: true, message: "reviews fetched", data: reviews });
};

const new_review = (req, res) => {
  let review = req.body;

  review.image = save_image(review.image);

  let result = REVIEWS.write(review);
  review._id = result._id;
  review.created = result.created;

  if (review.verified)
    if (!!GLOBALS.readone({ global: GLOBALS_verified_reviews }))
      GLOBALS.update(
        { global: GLOBALS_verified_reviews },
        { reviews: { $push: review._id } }
      );
    else
      GLOBALS.write({
        global: GLOBALS_verified_reviews,
        reviews: new Array(review._id),
      });

  res.json({ ok: true, message: "review added", data: review });
};

const remove_review = (req, res) => {
  let { review } = req.params;

  let review_ = REVIEWS.readone(review);
  if (!review_) return res.end();

  review_.image && !review_.user && remove_image(review_.image);
  review_.verified &&
    GLOBALS.update(
      { global: GLOBALS_verified_reviews },
      { reviews: { $splice: review } }
    );

  REVIEWS.remove(review);

  res.json({ ok: true, message: "review removed", data: review });
};

const trusted_by = (req, res) => {
  res.json({
    ok: true,
    message: "fetched trusted by",
    data: TRUSTEES.read(),
  });
};

const add_trusted_by = (req, res) => {
  let trustee = req.body;

  trustee.logo = save_image(trustee.logo);
  let result = TRUSTEES.write(trustee);
  trustee._id = result._id;
  trustee.created = result.created;

  res.json({ ok: true, message: "trustee added", data: trustee });
};

const remove_trustee = (req, res) => {
  let { trustee } = req.params;

  trustee = TRUSTEES.remove(trustee);
  trustee && remove_image(trustee.logo);

  res.json({
    ok: true,
    message: "trustee removed",
    data: trustee ? trustee._id || trustee : "",
  });
};

const user_review = (req, res) => {
  let alumni_overview_ = GLOBALS.readone({ global: GLOBAL_user_review });

  res.json({ ok: true, message: "user overview", data: alumni_overview_ });
};

const update_user_review = (req, res) => {
  let { video, thumbnail, image_hash } = req.body;

  (video = save_video(video)), (thumbnail = save_image(thumbnail));

  let user_review = GLOBALS.readone({ global: GLOBAL_user_review });
  user_review &&
    (thumbnail.startsWith("data") && remove_image(user_review.thumbnail),
    video.startsWith("data") && remove_video(user_review.video));

  GLOBALS.update(
    { global: GLOBAL_user_review },
    {
      video,
      thumbnail,
      image_hash,
    }
  );

  res.json({
    ok: true,
    message: "user overview updated",
    data: { video, thumbnail },
  });
};

const faqs = (req, res) => {
  let { skip, limit, total_faqs } = req.body;

  let faqs_ = FAQS.read(null, { limit, skip });
  if (total_faqs)
    faqs_ = { faqs: faqs_, total_faqs: FAQS.config.total_entries };

  res.json({ ok: true, message: "faqs", data: faqs_ });
};

const new_faq = (req, res) => {
  let result = FAQS.write(req.body);

  res.json({
    ok: true,
    message: "new faq",
    data: { _id: result._id, created: result.created },
  });
};

const remove_faq = (req, res) => {
  let { faq } = req.params;

  FAQS.remove(faq);

  res.end();
};

const update_faq = (req, res) => {
  let { _id, question, answer } = req.body;

  let result = FAQS.update(_id, { question, answer });

  res.json({
    ok: true,
    message: "faq updated",
    data: { _id, created: result.created },
  });
};

export {
  GLOBALS_about_statement,
  GLOBALS_verified_reviews,
  GLOBAL_user_review,
  reviews,
  faqs,
  new_faq,
  remove_faq,
  update_faq,
  new_review,
  remove_review,
  trusted_by,
  add_trusted_by,
  remove_trustee,
  approve_review,
  user_review,
  update_user_review,
  about_statement,
  post_about_statement,
};
