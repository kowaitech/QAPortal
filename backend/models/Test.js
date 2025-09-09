
import mongoose from "mongoose";

const TestSchema = new mongoose.Schema({
  title: { type: String, required: true },
  domains: [{ type: mongoose.Schema.Types.ObjectId, ref: "Domain", required: true }],
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  durationMinutes: { type: Number, default: 60 },
  sections: { type: [String], default: ["A","B"] },
  status: { type: String, enum: ["inactive","active","finished"], default: "inactive" },
  eligibleStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });

export default mongoose.model("Test", TestSchema);
