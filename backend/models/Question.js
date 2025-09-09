import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  domain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Domain',
    required: true
  },
  section: {
    type: String,
    enum: ['A', 'B'],
    default: 'A'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  answerText: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient querying
QuestionSchema.index({ domain: 1, difficulty: 1, isActive: 1 });
QuestionSchema.index({ createdBy: 1, createdAt: -1 });

export default mongoose.model('Question', QuestionSchema);
