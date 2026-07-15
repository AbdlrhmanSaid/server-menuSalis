import mongoose from "mongoose";

const { Schema, model } = mongoose;

const menuSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: String,
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    products: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
  },
  { timestamps: true }
);

export default model("Menu", menuSchema);
