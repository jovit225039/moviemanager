import mongoose from "mongoose";

const yearCounterSchema = new mongoose.Schema({
  _id: { type: Number },
  value: { type: Number, default: 0 }
});

export default mongoose.model("YearCounter", yearCounterSchema);
