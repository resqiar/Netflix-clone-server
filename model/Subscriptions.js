const mongoose = require("mongoose");

// create new schema model
// this should contain the following
// email , sessionId, createdAt, updatedAt

const _subscriptions = new mongoose.Schema(
  {
    email: {
      type: "string",
      required: true,
      trim: true,
    },
    sessionId: {
      type: "string",
      required: true,
    },
    customerId: {
      type: "string",
    },
    subscriptionId: {
      type: "string",
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Products",
    },
  },
  {
    timestamps: true,
  }
);

const Subscriptions = mongoose.model("Subscriptions", _subscriptions);
module.exports = Subscriptions;
