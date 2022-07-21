const { Schema, model } = require("mongoose");

const contactSchema = Schema(
  {
    name: {
      type: String,
      required: [true, "Set name for contact"],
      match:
        /(^[A-Z]{1}[a-z]{1,14} [A-Z]{1}[a-z]{1,14}$)|(^[А-Я]{1}[а-я]{1,14} [А-Я]{1}[а-я]{1,14}$)/,
    },
    email: {
      type: String,
      match: /[A-Z0-9._%+-]+@[A-Z0-9-]+.+.[A-Z]{2,4}/gim,
    },
    phone: {
      type: String,
      required: true,
      match: /^((\+?3)?8)?((0\(\d{2}\)?)|(\(0\d{2}\))|(0\d{2}))\d{7}$/,
    },
    favorite: {
      type: Boolean,
      default: false,
    },
    owner: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true, versionKey: false }
);

const Contact = model("contact", contactSchema);

module.exports = Contact;
