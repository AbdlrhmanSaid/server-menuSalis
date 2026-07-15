import mongoose from "mongoose";

const { Schema, model } = mongoose;

const historySchema = new Schema(
  {
    action: { type: String, required: true },
    user: { type: String, required: true },
    target: { type: String, required: true },
    type: { type: String, enum: ["product", "branch"], required: true },
  },
  { timestamps: true }
);

export default model("History", historySchema);
