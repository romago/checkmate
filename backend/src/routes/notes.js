import express from 'express';
import Note from '../models/Note.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// GET /api/notes
router.get('/', async (req, res) => {
  try {
    const { folderId, search } = req.query;
    const filter = { userId: req.user._id };

    if (folderId) filter.folderId = folderId;

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    const notes = await Note.find(filter)
      .sort({ isPinned: -1, updatedAt: -1 })
      .select('title content folderId isPinned color tags createdAt updatedAt');

    res.json(notes);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const { title, content, folderId, color, tags } = req.body;
    const note = await Note.create({
      title: title || 'New note',
      content: content || '',
      folderId: folderId || null,
      color: color || null,
      tags: tags || [],
      userId: req.user._id,
    });
    res.status(201).json(note);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/notes/:id
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json(note);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/notes/:id/pin
router.patch('/:id/pin', async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
    if (!note) return res.status(404).json({ message: 'Note not found' });
    note.isPinned = !note.isPinned;
    await note.save();
    res.json(note);
  } catch {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
