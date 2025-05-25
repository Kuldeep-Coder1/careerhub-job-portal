const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Application = require('../models/Application');
const Job = require('../models/Job');

const router = express.Router();

// Multer config for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

/**
 * @route   POST /api/apply/:jobId
 * @desc    Apply to a job (create new application with resume)
 */
router.post('/:jobId', upload.single('resume'), async (req, res) => {
  try {
    const { jobId } = req.params;
    const { name, email } = req.body;
    const resumePath = req.file.path;

    const newApplication = new Application({
      jobId,
      name,
      email,
      resume: resumePath,
    });

    await newApplication.save();
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (error) {
    console.error('Apply error:', error);
    res.status(500).json({ message: 'Failed to apply', error });
  }
});

/**
 * @route   GET /api/apply/all
 * @desc    Get all applications with job title + location
 */
router.get('/all', async (req, res) => {
  try {
    const applications = await Application.find().populate('jobId', 'title location');
    res.json(applications);
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json({ message: 'Failed to fetch applications', error });
  }
});

/**
 * @route   PUT /api/apply/:id
 * @desc    Update an application (name, email, optional resume)
 */
router.put('/:id', upload.single('resume'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email } = req.body;

    const application = await Application.findById(id);
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Update fields
    application.name = name;
    application.email = email;

    // Handle resume update (delete old resume if new uploaded)
    if (req.file) {
      if (application.resume && fs.existsSync(application.resume)) {
        fs.unlinkSync(application.resume); // delete old file
      }
      application.resume = req.file.path;
    }

    await application.save();
    res.json({ message: 'Application updated successfully' });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ message: 'Failed to update application', error });
  }
});

/**
 * @route   DELETE /api/apply/:id
 * @desc    Delete an application and its resume
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await Application.findById(id);

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    // Delete resume file
    if (application.resume && fs.existsSync(application.resume)) {
      fs.unlinkSync(application.resume);
    }

    await Application.findByIdAndDelete(id);
    res.json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ message: 'Failed to delete application', error });
  }
});

module.exports = router;
