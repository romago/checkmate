import express from 'express';
import Folder from '../models/Folder.js';
import Note from '../models/Note.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/folders
router.get('/', async (req, res) => {
  try {
    const folders = await Folder.find({ userId: req.user._id }).sort({ createdAt: 1 });
    res.json(folders);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/folders
router.post('/', async (req, res) => {
  try {
    const { name, color } = req.body;
    if (!name) return res.status(400).json({ message: 'Name is required' });
    const folder = await Folder.create({ name, color, userId: req.user._id });
    res.status(201).json(folder);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/folders/:id
router.put('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    res.json(folder);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/folders/:id
router.delete('/:id', async (req, res) => {
  try {
    const folder = await Folder.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!folder) return res.status(404).json({ message: 'Folder not found' });
    // Move notes in this folder to "no folder"
    await Note.updateMany({ folderId: req.params.id, userId: req.user._id }, { folderId: null });
    res.json({ message: 'Folder deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
