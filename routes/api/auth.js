const express = require("express");
const Joi = require("joi");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const path = require("path");
const fs = require("fs");
const bson = require("bson-objectid");

const User = require("../../models/user");
const { createError, sendMail } = require("../../helpers");
const authorize = require("../../middleware/authorize");
const upload = require("../../middleware/upload");

const { SECRET_KEY } = process.env;

const router = express.Router();

const emailRegexp = /[a-z0-9]+@[a-z]+\.[a-z]{2,3}/;

const registerSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
  password: Joi.string().min(6).required(),
  subscription: Joi.string()
    .valid("starter", "pro", "business")
    .default("starter"),
});

const logInSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
  password: Joi.string().min(6).required(),
});

const verificationEmailSchema = Joi.object({
  email: Joi.string().pattern(emailRegexp).required(),
});

const updateSubscriptionSchema = Joi.object({
  subscription: Joi.string().valid("starter", "pro", "business"),
});

// user register route
router.post("/register", async (req, res, next) => {
  try {
    const { error } = registerSchema.validate(req.body);
    if (error) {
      throw createError(error.message, 400);
    }
    const { email, password, subscription } = req.body;
    const user = await User.findOne({ email });
    if (user) {
      throw createError("email in use", 409);
    }
    const hash = await bcrypt.hash(password, 10);
    const avatarURL = gravatar.url(email);
    const verificationToken = bson();

    const result = await User.create({
      email,
      password: hash,
      subscription,
      avatarURL,
      verificationToken,
    });

    const mail = {
      to: email,
      subject: "Verify your account",
      html: `<a target='_blank' href='https://mondodb-project.herokuapp.com/${verificationToken}'>Click here to verify your account</a>`,
    };
    await sendMail(mail);
    res.status(201).json(result.email);
  } catch (error) {
    next(error);
  }
});

// user verify by email route
router.get("/verify/:verificationToken", async (req, res, next) => {
  try {
    const { verificationToken } = req.params;
    const user = await User.findOne({ verificationToken });
    if (!user) {
      throw createError("User not found", 404);
    }
    await User.findByIdAndUpdate(user._id, {
      verificationToken: "",
      verify: true,
    });

    res, status(200).json({ message: "User verified" });
  } catch (error) {
    next(error);
  }
});

// user resend verification email route

router.post("/verify", async (req, res, next) => {
  try {
    const { error } = verificationEmailSchema.validate(req.body);
    if (error) {
      throw createError(error.message, 400);
    }

    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      throw createError("User not found", 404);
    }
    if (user.verify) {
      throw createError("User already verified", 400);
    }
    const verificationToken = user.verificationToken;
    const mail = {
      to: email,
      subject: "Verify your account",
      html: `<a target='_blank' href='https://mondodb-project.herokuapp.com/${verificationToken}'>Click here to verify your account</a>`,
    };
    await sendMail(mail);

    res.status(200).json({ message: "Verification email sent" });
  } catch (error) {
    next(error);
  }
});

// user login route
router.post("/login", async (req, res, next) => {
  try {
    const { error } = logInSchema.validate(req.body);
    if (error) {
      throw createError(error.message, 400);
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid || !user) {
      throw createError("invalid email or password ", 401);
    }
    if (!user.verify) {
      throw createError("Email not verified", 401);
    }

    const payload = {
      id: user._id,
    };
    const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" });
    await User.findByIdAndUpdate(user._id, { token });
    res.status(200).json(token);
  } catch (error) {
    next(error);
  }
});

// user logout route
router.get("/logout", authorize, async (req, res, next) => {
  try {
    const { _id } = req.user;
    await User.findByIdAndUpdate(_id, { token: "" });
    res.json({ message: "logged out" });
  } catch (error) {
    next(error);
  }
});

// route user get session info by token
router.get("/current", authorize, async (req, res, next) => {
  const { email, phone, subscription } = req.user;
  res.json({ email, phone, subscription });
});

router.patch("/subscription", authorize, async (req, res, next) => {
  try {
    const { _id } = req.user;

    const { error } = updateSubscriptionSchema.validate(req.body);
    if (error) {
      throw createError("missing subscription option", 400);
    }
    const result = await User.findByIdAndUpdate(_id, req.body, {
      new: true,
    });
    res.json("subscription updated");
    if (!result) {
      throw createError("User not found", 404);
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

const avatarDir = path.join(__dirname, "../../", "public", "avatars");

router.patch(
  "/avatar",
  authorize,
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const { _id } = req.user;
      const { path: tempDir, originalname } = req.file;

      const [ext] = originalname.split(".").reverse();
      const avatarName = `${_id}.${ext}`;
      const avatarPath = path.join(avatarDir, avatarName);

      await fs.rename(tempDir, avatarPath);
      const avatarURL = path.join("/avatars", avatarName);
      await User.findByIdAndUpdate(_id, { avatarURL });

      res.json({ avatarURL });
    } catch (error) {
      await fs.unlink(req.file.path);
      next(error);
    }
  }
);

module.exports = router;
