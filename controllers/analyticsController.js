const JobScan = require('../models/JobScan');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user analytics
// @route   GET /api/v1/analytics/user
// @access  Private
exports.getUserAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Get user's scans analytics
    const analytics = await JobScan.aggregate([
      {
        $match: {
          user: req.user._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          highRiskScans: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
          },
          mediumRiskScans: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'medium'] }, 1, 0] }
          },
          lowRiskScans: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] }
          },
          averageScamProbability: { $avg: '$scamProbability' },
          recentScans: { $sum: 1 }
        }
      }
    ]);

    // Get scans by month
    const scansByMonth = await JobScan.aggregate([
      {
        $match: {
          user: req.user._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 },
          highRisk: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ]);

    // Get most common warning flags
    const warningFlagStats = await JobScan.aggregate([
      {
        $match: {
          user: req.user._id,
          ...dateFilter
        }
      },
      { $unwind: '$warningFlags' },
      {
        $match: {
          'warningFlags.detected': true
        }
      },
      {
        $group: {
          _id: '$warningFlags.type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: analytics[0] || {
          totalScans: 0,
          highRiskScans: 0,
          mediumRiskScans: 0,
          lowRiskScans: 0,
          averageScamProbability: 0
        },
        scansByMonth,
        topWarningFlags: warningFlagStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get global analytics (admin only)
// @route   GET /api/v1/analytics/global
// @access  Private/Admin
exports.getGlobalAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    // Global statistics
    const globalStats = await JobScan.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: null,
          totalScans: { $sum: 1 },
          scamsDetected: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
          },
          safeJobs: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] }
          },
          flaggedForReview: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'medium'] }, 1, 0] }
          },
          averageScamProbability: { $avg: '$scamProbability' },
          reportedJobs: {
            $sum: { $cond: ['$isReported', 1, 0] }
          }
        }
      }
    ]);

    // Scam type distribution
    const scamTypeDistribution = await JobScan.aggregate([
      {
        $match: {
          riskLevel: { $in: ['medium', 'high'] },
          ...dateFilter
        }
      },
      { $unwind: '$warningFlags' },
      {
        $match: {
          'warningFlags.detected': true
        }
      },
      {
        $group: {
          _id: '$warningFlags.type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Monthly trends
    const monthlyTrends = await JobScan.aggregate([
      {
        $match: dateFilter
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalScans: { $sum: 1 },
          scamsDetected: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
          },
          safeJobs: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': -1, '_id.month': -1 }
      },
      {
        $limit: 12
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        globalStats: globalStats[0] || {},
        scamTypeDistribution,
        monthlyTrends
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get scam detection trends
// @route   GET /api/v1/analytics/trends
// @access  Public
exports.getTrends = async (req, res, next) => {
  try {
    // Get trends for the last 12 months
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const trends = await JobScan.aggregate([
      {
        $match: {
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          totalScans: { $sum: 1 },
          scamsDetected: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'high'] }, 1, 0] }
          },
          safeJobs: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'low'] }, 1, 0] }
          },
          flaggedJobs: {
            $sum: { $cond: [{ $eq: ['$riskLevel', 'medium'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Scam type distribution
    const scamTypes = await JobScan.aggregate([
      {
        $match: {
          riskLevel: { $in: ['medium', 'high'] },
          createdAt: { $gte: twelveMonthsAgo }
        }
      },
      { $unwind: '$warningFlags' },
      {
        $match: {
          'warningFlags.detected': true
        }
      },
      {
        $group: {
          _id: '$warningFlags.type',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        monthlyTrends: trends,
        scamTypeDistribution: scamTypes
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent scam alerts
// @route   GET /api/v1/analytics/alerts
// @access  Public
exports.getAlerts = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;

    const alerts = await JobScan.find({
      riskLevel: { $in: ['high', 'medium'] },
      status: 'completed'
    })
      .sort('-createdAt')
      .limit(limit)
      .select('companyName jobTitle location riskLevel scamProbability warningFlags createdAt')
      .lean();

    // Format alerts
    const formattedAlerts = alerts.map(alert => ({
      id: alert._id,
      company: alert.companyName || 'Unknown Company',
      jobTitle: alert.jobTitle || 'Untitled Position',
      location: alert.location || 'Remote',
      riskLevel: alert.riskLevel,
      scamProbability: alert.scamProbability,
      warningFlags: alert.warningFlags.filter(f => f.detected).map(f => ({
        type: f.type,
        severity: f.severity,
        description: f.description
      })),
      detectedAt: alert.createdAt
    }));

    res.status(200).json({
      success: true,
      count: formattedAlerts.length,
      data: { alerts: formattedAlerts }
    });
  } catch (error) {
    next(error);
  }
};
