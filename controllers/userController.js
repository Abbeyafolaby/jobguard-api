const User = require('../models/User');
const JobScan = require('../models/JobScan');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Get user statistics
    const totalScans = await JobScan.countDocuments({ user: req.user.id });
    const highRiskScans = await JobScan.countDocuments({
      user: req.user.id,
      riskLevel: 'high'
    });

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isVerified: user.isVerified,
          accountStatus: user.accountStatus,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          stats: {
            totalScans,
            highRiskScans
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email
    };

    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(
      key => fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user account
// @route   DELETE /api/v1/users/account
// @access  Private
exports.deleteAccount = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    // Mark account as deleted instead of actually deleting
    user.accountStatus = 'deleted';
    await user.save();

    // Optionally delete all user's job scans
    // await JobScan.deleteMany({ user: req.user.id });

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
