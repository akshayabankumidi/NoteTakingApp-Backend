const express = require('express');
const Note = require('../models/notes');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a new note
router.post('/', auth, async (req, res) => {
  try {
    const note = new Note({
      ...req.body,
      user: req.user._id
    });
    await note.save();
    res.status(201).send(note);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get all active notes for a user
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({ 
      user: req.user._id, 
      isDeleted: false, 
      isArchived: false,
      $or: [
        { reminderDate: { $exists: false } },
        { reminderDate: null },
        { reminderDate: { $gt: new Date() } }
      ]
    });
    res.send(notes);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get all archived notes
router.get('/archived', auth, async (req, res) => {
  try {
    const notes = await Note.find({ user: req.user._id, isDeleted: false, isArchived: true });
    res.send(notes);
  } catch (error) {
    res.status(500).send({ message: "Error retrieving archived notes", error: error.message });
  }
});

// Get all deleted notes (trash)
router.get('/trash', auth, async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const notes = await Note.find({
      user: req.user._id,
      isDeleted: true,
      deletedAt: { $gte: thirtyDaysAgo }
    });
    res.send(notes);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get all reminder notes
router.get('/reminders', auth, async (req, res) => {
  try {
    const notes = await Note.find({
      user: req.user._id,
      isDeleted: false,
      reminderDate: { $lte: new Date() }
    });
    res.send(notes);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get a specific note by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
    if (!note) {
      return res.status(404).send({ error: 'Note not found' });
    }
    res.send(note);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a note
router.patch('/:id', auth, async (req, res) => {
  const updates = Object.keys(req.body);
  const allowedUpdates = ['title', 'content', 'tags', 'backgroundColor', 'reminderDate', 'isReminder'];
  const isValidOperation = updates.every(update => allowedUpdates.includes(update));

  if (!isValidOperation) {
    return res.status(400).send({ error: 'Invalid updates!' });
  }

  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
    if (!note) {
      return res.status(404).send({ error: 'Note not found' });
    }

    updates.forEach(update => note[update] = req.body[update]);
    await note.save();
    res.send(note);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Delete a note (soft delete)
router.delete('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
    if (!note) {
      return res.status(404).send({ error: 'Note not found' });
    }

    note.isDeleted = true;
    note.deletedAt = new Date();
    await note.save();
    res.send({ message: 'Note deleted successfully' });
  } catch (error) {
    res.status(500).send(error);
  }
});

// Archive a note
router.patch('/:id/archive', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, user: req.user._id, isDeleted: false });
    if (!note) {
      return res.status(404).send({ error: 'Note not found' });
    }

    note.isArchived = !note.isArchived; // Toggle archive status
    await note.save();
    res.send(note);
  } catch (error) {
    res.status(400).send(error);
  }
});

module.exports = router;