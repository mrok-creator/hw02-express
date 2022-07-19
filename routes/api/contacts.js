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
  favorite: Joi.boolean().default(false),
});
const favoriteSchema = Joi.object({
  favorite: Joi.boolean().required(),
});

router.get("/", authorize, async (req, res, next) => {
  try {
    const { page = 1, limit = 10, favorite = false } = req.query;
    const { _id: owner } = req.user;
    const total = await Contact.countDocuments({ owner });
    // maximum page limit due to total contacts
    const maxPage = Math.ceil(total / limit);

    const resPage = page > maxPage ? maxPage : page;
    const query = favorite ? { favorite, owner } : { owner };
    if (page < 1 || limit < 1) {
      throw createError("Invalid page or limit", 400);
    }

    const result = await Contact.find(query, "-createdAt -updatedAt")
      .populate("owner", "-password, -createdAt -updatedAt")
      .limit(limit)
      .skip((resPage - 1) * limit);
    res.json({ contacts: result, total, page: resPage, limit });
  } catch (error) {
    next(error);
  }
});

router.get("/:id", authorize, async (req, res, next) => {
  try {
    const result = await Contact.findById(req.params.id);
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
    const result = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!result) {
      throw createError("Contact not found", 404);
    }
    res.json(result);
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
    const result = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!result) {
      throw createError("Not found", 404);
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const result = await Contact.findByIdAndRemove(req.params.id);
    if (!result) {
      throw createError("Contact not found", 404);
    }
    res.status(204);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
