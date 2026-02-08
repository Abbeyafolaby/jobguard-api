const User = require('../models/User');
const JobScan = require('../models/JobScan');
const ErrorResponse = require('../utils/errorResponse');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin dashboard endpoints
 */

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/v1/admin/dashboard
 * @access  Private/Admin
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalScans = await JobScan.countDocuments();
    
    // Get scans by risk level
    const riskLevelStats = await JobScan.aggregate([
      {
        $group: {
          _id: '$riskLevel',
          count: { $sum: 1 }
        }
      }
    ]);
    
    // Convert to object for easier access
    const riskLevels = {
      low: 0,
      medium: 0,
      high: 0
    };
    
    riskLevelStats.forEach(stat => {
      if (stat._id) {
        riskLevels[stat._id] = stat.count;
      }
    });
    
    // Get average scam probability
    const avgScamProbability = await JobScan.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: '$scamProbability' }
        }
      }
    ]);
    
    // Get recent scans (last 10)
    const recentScans = await JobScan.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('user', 'firstName lastName email')
      .select('companyName jobTitle riskLevel scamProbability createdAt');
    
    // Get user growth over last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get scan growth over last 7 days
    const scanGrowth = await JobScan.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);
    
    // Get top companies scanned
    const topCompanies = await JobScan.aggregate([
      {
        $match: {
          companyName: { $exists: true, $ne: null, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$companyName',
          count: { $sum: 1 },
          avgScamProbability: { $avg: '$scamProbability' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);
    
    // Get verified users count
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    
    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: thirtyDaysAgo }
    });
    
    // Get scans by status
    const scansByStatus = await JobScan.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const statusCounts = {
      pending: 0,
      analyzing: 0,
      completed: 0,
      failed: 0
    };
    
    scansByStatus.forEach(stat => {
      if (stat._id) {
        statusCounts[stat._id] = stat.count;
      }
    });
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalScans,
          verifiedUsers,
          activeUsers,
          averageScamProbability: avgScamProbability[0]?.average || 0
        },
        riskLevels,
        statusCounts,
        recentScans,
        userGrowth,
        scanGrowth,
        topCompanies
      }
    });
  } catch (err) {
    next(new ErrorResponse('Error fetching dashboard statistics', 500));
  }
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/v1/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments();
    
    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: users
    });
  } catch (err) {
    next(new ErrorResponse('Error fetching users', 500));
  }
};

/**
 * @desc    Get all scans (admin only)
 * @route   GET /api/v1/admin/scans
 * @access  Private/Admin
 */
exports.getAllScans = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    const scans = await JobScan.find()
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await JobScan.countDocuments();
    
    res.status(200).json({
      success: true,
      count: scans.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: scans
    });
  } catch (err) {
    next(new ErrorResponse('Error fetching scans', 500));
  }
};
