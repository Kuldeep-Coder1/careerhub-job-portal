const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Job = require('../models/Job');

const JWT_SECRET = process.env.JWT_SECRET;

// Middleware to verify token
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
}

// Get all jobs
router.get('/', async (req, res) => {
  const jobs = await Job.find().populate('recruiter', 'name email');
  res.json(jobs);
});

// Post new job (only recruiters)
router.post('/', authMiddleware, async (req, res) => {
  if (req.user.role !== 'recruiter') return res.status(403).json({ message: 'Access denied' });

  const { title, description, location } = req.body;

  const newJob = new Job({
    recruiter: req.user.userId,
    title,
    description,
    location,
  });

  await newJob.save();
  res.json(newJob);
});

// Apply to job
router.post('/:id/apply', authMiddleware, async (req, res) => {
  if (req.user.role !== 'candidate') return res.status(403).json({ message: 'Only candidates can apply' });

  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ message: 'Job not found' });

  const alreadyApplied = job.applicants.some(app => app.candidate.toString() === req.user.userId);
  if (alreadyApplied) return res.status(400).json({ message: 'Already applied' });

  const { resume } = req.body; // filename/path from resume upload

  job.applicants.push({ candidate: req.user.userId, resume });
  await job.save();

  res.json({ message: 'Applied successfully' });
});

module.exports = router;
