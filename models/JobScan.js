const mongoose = require('mongoose');

/**
 * @swagger
 * components:
 *   schemas:
 *     JobScan:
 *       type: object
 *       required:
 *         - user
 *         - jobUrl
 *       properties:
 *         user:
 *           type: string
 *           description: ID of the user who submitted the job
 *         jobUrl:
 *           type: string
 *           description: URL of the job posting
 *         jobDescription:
 *           type: string
 *           description: Full job description text
 *         companyName:
 *           type: string
 *           description: Name of the company
 *         riskLevel:
 *           type: string
 *           enum: [low, medium, high]
 *           description: Calculated risk level
 *         scamProbability:
 *           type: number
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage probability of being a scam
 *         warningFlags:
 *           type: array
 *           items:
 *             type: object
 *         analysisResults:
 *           type: object
 *           description: Detailed analysis results
 */

const jobScanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    jobUrl: {
      type: String,
      trim: true
    },
    jobDescription: {
      type: String,
      required: false  // Made optional - can use jobUrl or file instead
    },
    companyName: {
      type: String,
      trim: true
    },
    companyWebsite: {
      type: String,
      trim: true
    },
    companyEmail: {
      type: String,
      trim: true,
      lowercase: true
    },
    jobTitle: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    salary: {
      min: Number,
      max: Number,
      currency: String
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'low'
    },
    scamProbability: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    warningFlags: [
      {
        type: {
          type: String,
          enum: [
            'fake_recruiter',
            'phishing',
            'advance_fee',
            'data_harvesting',
            'mlm_disguised',
            'unrealistic_salary',
            'vague_description',
            'pressure_tactics',
            'suspicious_email',
            'no_company_presence',
            'upfront_payment',
            'personal_info_request'
          ]
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high']
        },
        description: String,
        detected: {
          type: Boolean,
          default: false
        }
      }
    ],
    analysisResults: {
      companyLegitimacy: {
        score: { type: Number, min: 0, max: 100 },
        details: String
      },
      websiteAnalysis: {
        exists: Boolean,
        domainAge: Number,
        sslCertificate: Boolean,
        details: String
      },
      emailAnalysis: {
        isValidDomain: Boolean,
        isFreeProvider: Boolean,
        details: String
      },
      contentAnalysis: {
        clarity: { type: Number, min: 0, max: 100 },
        authenticity: { type: Number, min: 0, max: 100 },
        details: String
      },
      onlinePresence: {
        linkedIn: Boolean,
        glassdoor: Boolean,
        socialMedia: Boolean,
        details: String
      }
    },
    uploadedFile: {
      filename: String,
      originalName: String,
      path: String,
      size: Number,
      mimetype: String
    },
    status: {
      type: String,
      enum: ['pending', 'analyzing', 'completed', 'failed'],
      default: 'pending'
    },
    reportViewed: {
      type: Boolean,
      default: false
    },
    reportViewedAt: Date,
    isReported: {
      type: Boolean,
      default: false
    },
    reportReason: String,
    notes: String
  },
  {
    timestamps: true
  }
);

// Index for faster queries
jobScanSchema.index({ user: 1, createdAt: -1 });
jobScanSchema.index({ riskLevel: 1 });
jobScanSchema.index({ scamProbability: -1 });
jobScanSchema.index({ companyName: 1 });

// Virtual for determining if scan needs attention
jobScanSchema.virtual('needsAttention').get(function () {
  return this.riskLevel === 'high' || this.scamProbability >= 70;
});

// Method to calculate risk level based on warning flags
jobScanSchema.methods.calculateRiskLevel = function () {
  const highSeverityCount = this.warningFlags.filter(
    flag => flag.detected && flag.severity === 'high'
  ).length;
  
  const mediumSeverityCount = this.warningFlags.filter(
    flag => flag.detected && flag.severity === 'medium'
  ).length;
  
  if (highSeverityCount >= 2 || this.scamProbability >= 70) {
    this.riskLevel = 'high';
  } else if (highSeverityCount >= 1 || mediumSeverityCount >= 2 || this.scamProbability >= 40) {
    this.riskLevel = 'medium';
  } else {
    this.riskLevel = 'low';
  }
  
  return this.riskLevel;
};

// Static method to get analytics
jobScanSchema.statics.getAnalytics = async function (userId = null, dateRange = null) {
  const matchStage = {};
  
  if (userId) {
    matchStage.user = mongoose.Types.ObjectId(userId);
  }
  
  if (dateRange) {
    matchStage.createdAt = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  return await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalScans: { $sum: 1 },
        highRisk: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
        },
        mediumRisk: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'medium'] }, 1, 0] }
        },
        lowRisk: {
          $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] }
        },
        averageScamProbability: { $avg: '$scamProbability' }
      }
    }
  ]);
};

module.exports = mongoose.model('JobScan', jobScanSchema);