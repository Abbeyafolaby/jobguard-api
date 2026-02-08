const express = require('express');
const {
    getDashboardStats,
    getAllUsers,
    getAllScans
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

/**
 * @swagger
 * /api/v1/admin/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/dashboard', protect, authorize('admin'), getDashboardStats);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: Get all users (paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/users', protect, authorize('admin'), getAllUsers);

/**
 * @swagger
 * /api/v1/admin/scans:
 *   get:
 *     summary: Get all scans (paginated)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Scans retrieved successfully
 *       401:
 *         description: Not authorized
 *       403:
 *         description: Not authorized (admin only)
 */
router.get('/scans', protect, authorize('admin'), getAllScans);

module.exports = router;
