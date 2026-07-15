// models/Product.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: {
      type: Number,
      min: 0,
    },
    menu: {
      type: Schema.Types.ObjectId,
      ref: "Menu",
      required: true,
    },
    image: {
      url: String,
      public_id: String,
    },
    availableBranches: [
      {
        type: Schema.Types.ObjectId,
        ref: "Branch",
      },
    ],
  },
  { timestamps: true }
);

export default model("Product", productSchema);
