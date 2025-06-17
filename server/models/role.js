import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      unique: true,
      trim: true,
      validate: {
        validator: (v) => v.trim().length > 0,
        message: "Name cannot be empty",
      },
    },
  },
  {
    timestamps: true,
  },
);

const Role = mongoose.model("Role", RoleSchema);
export default Role;
