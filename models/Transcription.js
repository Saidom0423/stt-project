import mongoose from "mongoose";

const transcriptionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
    },
    mimetype: String,
    userId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Transcription", transcriptionSchema);
