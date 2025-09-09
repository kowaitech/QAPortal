
import mongoose from "mongoose";

const StudentTestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  test: { type: mongoose.Schema.Types.ObjectId, ref: "Test", required: true },
  startTime: Date,
  dueTime: Date,
  endTime: Date,
  score: Number,
  selectedDomain: { type: mongoose.Schema.Types.ObjectId, ref: "Domain" },
  selectedSection: { type: String, enum: ["A","B"] },
  status: { type: String, enum: ["pending","in-progress","completed","expired"], default: "pending" },
}, { timestamps: true });

export default mongoose.model("StudentTest", StudentTestSchema);
