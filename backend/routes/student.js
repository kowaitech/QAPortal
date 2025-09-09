import express from "express";
import Test from "../models/Test.js";
import { auth, requireRole } from "../middleware/auth.js";
const router = express.Router();

// Get upcoming/live tests filtered by eligibility
router.get("/tests", auth, requireRole("student"), async (req, res) => {
  const now = new Date();
  const tests = await Test.find({
    eligibleStudents: req.user._id,
    endDate: { $gte: now }
  });
  res.json(tests);
});

export default router;
