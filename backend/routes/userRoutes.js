const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// Placeholder route
router.get('/', protect, (req, res) => {
  res.json({ success: true, message: 'User routes working' });
});

module.exports = router;
