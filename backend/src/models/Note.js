import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, default: 'New note', maxlength: 500 },
    content: { type: String, default: '' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder', default: null },
    isPinned: { type: Boolean, default: false },
    color: { type: String, default: null },
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

noteSchema.index({ userId: 1, updatedAt: -1 });
noteSchema.index({ userId: 1, folderId: 1 });

export default mongoose.model('Note', noteSchema);
