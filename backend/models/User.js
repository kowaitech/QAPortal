import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'staff', 'student'], default: 'student', index: true },
  isActive: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  resetOtpCode: { type: String },
  resetOtpExpires: { type: Date }
}, { timestamps: true });

// Performance indexes for admin pages
UserSchema.index({ isActive: 1 });
UserSchema.index({ isActive: 1, role: 1, createdAt: -1 });

export default mongoose.model('User', UserSchema);

// import mongoose from "mongoose";

// const UserSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true },
//   password: { type: String, required: true },
//   role: { type: String, enum: ["student", "staff", "admin"], default: "student" },
//   isActive: { type: Boolean, default: false },
//   disabled: { type: Boolean, default: false },
//   college: String,
//   class: String,
//   group: String,
// }, { timestamps: true });

// export default mongoose.model("User", UserSchema);
