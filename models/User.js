import mongoose from "mongoose";

const { Schema, model } = mongoose;

const roles = ["admin", "supervisor", "user"];

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    role: {
      type: String,
      enum: roles,
      default: "user",
    },
  },
  { timestamps: true }
);

const User = model("User", userSchema);

export { User, roles };
export default User;
