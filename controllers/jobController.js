const JobScan = require('../models/JobScan');
const ErrorResponse = require('../utils/errorResponse');
const { deleteFile } = require('../middleware/fileUpload');
const fs = require('fs').promises;

// @desc    Create job scan
// @route   POST /api/v1/jobs
// @access  Private
exports.createJobScan = async (req, res, next) => {
  try {
    const {
      jobUrl,
      jobDescription,
      companyName,
      companyWebsite,
      companyEmail,
      jobTitle,
      location
    } = req.body;

    // Get job description from file if uploaded
    let finalJobDescription = jobDescription;
    let uploadedFile = null;

    if (req.file) {
      uploadedFile = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        path: req.file.path,
        size: req.file.size,
        mimetype: req.file.mimetype
      };

      // Read file content for text files
      if (req.file.mimetype === 'text/plain') {
        const fileContent = await fs.readFile(req.file.path, 'utf-8');
        finalJobDescription = fileContent;
      }
    }

    // Create job scan document
    const jobScan = await JobScan.create({
      user: req.user.id,
      jobUrl,
      jobDescription: finalJobDescription,
      companyName,
      companyWebsite,
      companyEmail,
      jobTitle,
      location,
      uploadedFile,
      status: 'analyzing'
    });

    // Perform scam analysis
    const analysisResults = await performScamAnalysis(jobScan);

    // Update job scan with analysis results
    jobScan.warningFlags = analysisResults.warningFlags;
    jobScan.scamProbability = analysisResults.scamProbability;
    jobScan.analysisResults = analysisResults.details;
    jobScan.riskLevel = jobScan.calculateRiskLevel();
    jobScan.status = 'completed';

    await jobScan.save();

    res.status(201).json({
      success: true,
      message: 'Job scan completed successfully',
      data: {
        jobScan: {
          id: jobScan._id,
          jobTitle: jobScan.jobTitle,
          companyName: jobScan.companyName,
          riskLevel: jobScan.riskLevel,
          scamProbability: jobScan.scamProbability,
          warningFlags: jobScan.warningFlags.filter(f => f.detected),
          createdAt: jobScan.createdAt
        }
      }
    });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file) {
      deleteFile(req.file.path);
    }
    next(error);
  }
};

// @desc    Get all job scans for user
// @route   GET /api/v1/jobs
// @access  Private
exports.getJobScans = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const sort = req.query.sort || '-createdAt';
    const riskLevel = req.query.riskLevel;

    const query = { user: req.user.id };

    if (riskLevel) {
      query.riskLevel = riskLevel;
    }

    const startIndex = (page - 1) * limit;

    const total = await JobScan.countDocuments(query);
    const jobScans = await JobScan.find(query)
      .sort(sort)
      .limit(limit)
      .skip(startIndex)
      .select('-uploadedFile -analysisResults');

    // Pagination result
    const pagination = {};

    if (startIndex + limit < total) {
      pagination.next = {
        page: page + 1,
        limit
      };
    }

    if (startIndex > 0) {
      pagination.prev = {
        page: page - 1,
        limit
      };
    }

    res.status(200).json({
      success: true,
      count: jobScans.length,
      total,
      pagination,
      data: { jobScans }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single job scan
// @route   GET /api/v1/jobs/:id
// @access  Private
exports.getJobScan = async (req, res, next) => {
  try {
    const jobScan = await JobScan.findById(req.params.id);

    if (!jobScan) {
      return next(new ErrorResponse('Job scan not found', 404));
    }

    // Make sure user owns job scan
    if (jobScan.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to access this job scan', 403)
      );
    }

    // Mark as viewed
    if (!jobScan.reportViewed) {
      jobScan.reportViewed = true;
      jobScan.reportViewedAt = Date.now();
      await jobScan.save();
    }

    res.status(200).json({
      success: true,
      data: { jobScan }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete job scan
// @route   DELETE /api/v1/jobs/:id
// @access  Private
exports.deleteJobScan = async (req, res, next) => {
  try {
    const jobScan = await JobScan.findById(req.params.id);

    if (!jobScan) {
      return next(new ErrorResponse('Job scan not found', 404));
    }

    // Make sure user owns job scan
    if (jobScan.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return next(
        new ErrorResponse('Not authorized to delete this job scan', 403)
      );
    }

    // Delete uploaded file if exists
    if (jobScan.uploadedFile && jobScan.uploadedFile.path) {
      deleteFile(jobScan.uploadedFile.path);
    }

    await jobScan.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Job scan deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Report a job as scam
// @route   POST /api/v1/jobs/:id/report
// @access  Private
exports.reportJob = async (req, res, next) => {
  try {
    const jobScan = await JobScan.findById(req.params.id);

    if (!jobScan) {
      return next(new ErrorResponse('Job scan not found', 404));
    }

    jobScan.isReported = true;
    jobScan.reportReason = req.body.reason;

    await jobScan.save();

    res.status(200).json({
      success: true,
      message: 'Job reported successfully. Thank you for helping keep our community safe!',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get public stats
// @route   GET /api/v1/jobs/stats
// @access  Public
exports.getPublicStats = async (req, res, next) => {
  try {
    const stats = await JobScan.getAnalytics();

    res.status(200).json({
      success: true,
      data: { stats: stats[0] || {} }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to perform scam analysis
const performScamAnalysis = async (jobScan) => {
  const warningFlags = [];
  let scamScore = 0;

  // Analyze job description
  if (jobScan.jobDescription) {
    const description = jobScan.jobDescription.toLowerCase();

    // Check for unrealistic salary keywords
    if (
      description.includes('earn $') ||
      description.includes('make money fast') ||
      description.includes('unlimited income') ||
      description.includes('get rich')
    ) {
      warningFlags.push({
        type: 'unrealistic_salary',
        severity: 'high',
        description: 'Job posting contains unrealistic salary claims',
        detected: true
      });
      scamScore += 25;
    }

    // Check for upfront payment requests
    if (
      description.includes('pay') ||
      description.includes('fee') ||
      description.includes('deposit') ||
      description.includes('investment required')
    ) {
      warningFlags.push({
        type: 'upfront_payment',
        severity: 'high',
        description: 'Job requires upfront payment or fees',
        detected: true
      });
      scamScore += 30;
    }

    // Check for pressure tactics
    if (
      description.includes('act now') ||
      description.includes('limited time') ||
      description.includes('urgent') ||
      description.includes('immediate start')
    ) {
      warningFlags.push({
        type: 'pressure_tactics',
        severity: 'medium',
        description: 'Job posting uses pressure or urgency language',
        detected: true
      });
      scamScore += 15;
    }

    // Check for vague descriptions
    if (description.length < 100) {
      warningFlags.push({
        type: 'vague_description',
        severity: 'medium',
        description: 'Job description is unusually vague or short',
        detected: true
      });
      scamScore += 10;
    }

    // Check for personal info requests
    if (
      description.includes('social security') ||
      description.includes('ssn') ||
      description.includes('bank account') ||
      description.includes('credit card')
    ) {
      warningFlags.push({
        type: 'personal_info_request',
        severity: 'high',
        description: 'Job requests sensitive personal or financial information',
        detected: true
      });
      scamScore += 30;
    }
  }

  // Analyze company email
  if (jobScan.companyEmail) {
    const email = jobScan.companyEmail.toLowerCase();
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
    const domain = email.split('@')[1];

    if (freeProviders.includes(domain)) {
      warningFlags.push({
        type: 'suspicious_email',
        severity: 'medium',
        description: 'Company uses a free email provider instead of a corporate domain',
        detected: true
      });
      scamScore += 15;
    }
  }

  // Analyze company website
  if (!jobScan.companyWebsite || jobScan.companyWebsite.length === 0) {
    warningFlags.push({
      type: 'no_company_presence',
      severity: 'medium',
      description: 'No company website provided',
      detected: true
    });
    scamScore += 10;
  }

  // Calculate final scam probability (cap at 100)
  const scamProbability = Math.min(scamScore, 100);

  return {
    warningFlags,
    scamProbability,
    details: {
      companyLegitimacy: {
        score: 100 - scamScore,
        details: `Analysis based on ${warningFlags.length} warning flags`
      },
      websiteAnalysis: {
        exists: !!jobScan.companyWebsite,
        details: jobScan.companyWebsite ? 'Website provided' : 'No website provided'
      },
      emailAnalysis: {
        isValidDomain: jobScan.companyEmail ? !jobScan.companyEmail.includes('@gmail') : false,
        isFreeProvider: jobScan.companyEmail ? jobScan.companyEmail.includes('@gmail') || jobScan.companyEmail.includes('@yahoo') : false,
        details: 'Email domain analyzed'
      },
      contentAnalysis: {
        clarity: jobScan.jobDescription ? Math.max(0, 100 - scamScore) : 0,
        authenticity: Math.max(0, 100 - scamScore),
        details: 'Job description analyzed for scam patterns'
      }
    }
  };
};
