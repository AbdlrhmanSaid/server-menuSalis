import mongoose from "mongoose";

const { Schema, model } = mongoose;

const promotionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    banner: {
      url: String,
      public_id: String,
    },
    targetType: {
      type: String,
      enum: ["Product", "Menu", "Company"],
      required: true,
    },
    target: {
      type: Schema.Types.ObjectId,
      required: true,
      refPath: "targetType",
    },
    discountType: {
      type: String,
      enum: ["Percentage", "Fixed Amount", "Fixed Price"],
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    priority: {
      type: Number,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Active", "Expired"],
      default: "Draft",
    },
    createdBy: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes to speed up target queries and status checks
promotionSchema.index({ target: 1, targetType: 1 });
promotionSchema.index({ status: 1 });
promotionSchema.index({ isActive: 1 });
promotionSchema.index({ startDate: 1, endDate: 1 });

export default model("Promotion", promotionSchema);
