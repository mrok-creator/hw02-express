const express = require("express");
const Joi = require("joi");

const Contact = require("../../models/contacts");
const createError = require("../../helpers/createError");
const authorize = require("../../middleware/authorize");

const router = express.Router();

const contactsSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string(),
  phone: Joi.string().required(),
});
const favoriteSchema = Joi.object({
  favorite: Joi.boolean().required(),
});

router.get("/", authorize, async (req, res, next) => {
  try {
    const { _id: owner } = req.user;
    const result = await Contact.find({ owner }, "-createdAt -updatedAt");
    res
      .status(200)
      .json(result)
      .populate("owner", "-password, -createdAt -updatedAt");
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authorize, async (req, res, next) => {
  try {
    const result = await Contact.FindById(req.params.id);
    if (!result) {
      return next(createError("Contact not found", 404));
    }
  } catch (error) {
    next(error);
  }
});

router.post("/", authorize, async (req, res, next) => {
  try {
    const { error } = contactsSchema.validate(req.body);
    if (error) {
      throw createError(error.message, 400);
    }
    const { _id: owner } = req.user;
    const result = await Contact.create({ ...req.body, owner });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const { error } = contactsSchema.validate(req.body);
    if (error) {
      throw createError(error.message, 400);
    }
    const result = await Contact.FindByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!result) {
      throw createError("Contact not found", 404);
    }
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/favorite", async (req, res, next) => {
  try {
    const { error } = favoriteSchema.validate(req.body);
    if (error) {
      throw createError("missing field favorite", 400);
    }
    const result = await Contact.FindByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!result) {
      throw createError("Not found", 404);
    }
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await Contact.FindByIdAndRemove(req.params.id);
    if (!result) {
      throw createError("Contact not found", 404);
    }
    res.status(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
