// models/Company.js
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const companySchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
    },
    logo: {
      url: { type: String },
      public_id: { type: String },
    },
  },
  { timestamps: true }
);

export default model("Company", companySchema);
