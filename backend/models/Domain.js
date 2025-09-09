import mongoose from 'mongoose';

const DomainSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('Domain', DomainSchema);

// import mongoose from "mongoose";

// const DomainSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   questions: [{ type: String }]
// });

// export default mongoose.model("Domain", DomainSchema);
