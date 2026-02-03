const express = require('express');
const router = express.Router();
const {
  getUserAnalytics,
  getGlobalAnalytics,
  getTrends,
  getAlerts
} = require('../controllers/analyticsController');
const { protect, optionalAuth, authorize } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Analytics
 *   description: Analytics and statistics endpoints
 */

/**
 * @swagger
 * /api/v1/analytics/user:
 *   get:
 *     summary: Get analytics for logged in user
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics (ISO format)
 *     responses:
 *       200:
 *         description: User analytics retrieved successfully
 *       401:
 *         description: Not authorized
 */
router.get('/user', protect, getUserAnalytics);

/**
 * @swagger
 * /api/v1/analytics/global:
 *   get:
 *     summary: Get global analytics (admin only)
 *     tags: [Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Global analytics retrieved successfully
 *       403:
 *         description: Not authorized - admin only
 */
router.get('/global', protect, authorize('admin'), getGlobalAnalytics);

/**
 * @swagger
 * /api/v1/analytics/trends:
 *   get:
 *     summary: Get scam detection trends
 *     tags: [Analytics]
 *     responses:
 *       200:
 *         description: Trends retrieved successfully
 */
router.get('/trends', optionalAuth, getTrends);

/**
 * @swagger
 * /api/v1/analytics/alerts:
 *   get:
 *     summary: Get recent scam alerts
 *     tags: [Analytics]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *     responses:
 *       200:
 *         description: Alerts retrieved successfully
 */
router.get('/alerts', optionalAuth, getAlerts);

module.exports = router;
