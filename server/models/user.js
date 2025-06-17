import bcrypt from "bcrypt";
import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      validate: [
        {
          validator: (v) => !/\s+/.test(v),
          message: "Use a valid username",
        },
        {
          validator: (v) => v.trim().length > 0,
          message: "Username cannot be empty",
        },
      ],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        message: "Use a valid email",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    roleId: {
      type: mongoose.Schema.Types.ObjectId, // assuming Role is another model
      ref: "Role",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

UserSchema.methods.verifyPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

UserSchema.methods.encryptPassword = function () {
  this.password = bcrypt.hashSync(this.password, bcrypt.genSaltSync(10));
};

UserSchema.pre("save", function (next) {
  if (this.isModified("password")) {
    this.encryptPassword();
  }
  next();
});

const User = mongoose.model("User", UserSchema);
export default User;
