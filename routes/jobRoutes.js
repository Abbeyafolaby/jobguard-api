const express = require('express');
const router = express.Router();
const {
  createJobScan,
  getJobScans,
  getJobScan,
  deleteJobScan,
  reportJob,
  getPublicStats
} = require('../controllers/jobController');
const { protect, optionalAuth } = require('../middleware/auth');
const {
  jobScanValidation,
  mongoIdValidation,
  paginationValidation,
  reportJobValidation,
  validate
} = require('../middleware/validators');
const { scanLimiter, uploadLimiter } = require('../middleware/rateLimiter');
const { uploadJobFile, handleUploadError } = require('../middleware/fileUpload');

/**
 * @swagger
 * tags:
 *   name: Jobs
 *   description: Job scanning and analysis endpoints
 */

/**
 * @swagger
 * /api/v1/jobs:
 *   post:
 *     summary: Create a new job scan
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               jobUrl:
 *                 type: string
 *                 format: uri
 *                 example: https://example.com/job/12345
 *               jobDescription:
 *                 type: string
 *                 example: Looking for a remote software developer...
 *               companyName:
 *                 type: string
 *                 example: Tech Corp
 *               companyWebsite:
 *                 type: string
 *                 format: uri
 *               companyEmail:
 *                 type: string
 *                 format: email
 *               jobTitle:
 *                 type: string
 *                 example: Senior Developer
 *               jobFile:
 *                 type: string
 *                 format: binary
 *                 description: Job description file (PDF, DOC, DOCX, TXT)
 *     responses:
 *       201:
 *         description: Job scan created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authorized
 */
router.post(
  '/',
  protect,
  scanLimiter,
  uploadLimiter,
  uploadJobFile,
  handleUploadError,
  jobScanValidation,
  validate,
  createJobScan
);

/**
 * @swagger
 * /api/v1/jobs:
 *   get:
 *     summary: Get all job scans for logged in user
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of results per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [createdAt, -createdAt, scamProbability, -scamProbability]
 *           default: -createdAt
 *         description: Sort order
 *       - in: query
 *         name: riskLevel
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by risk level
 *     responses:
 *       200:
 *         description: Job scans retrieved successfully
 *       401:
 *         description: Not authorized
 */
router.get(
  '/',
  protect,
  paginationValidation,
  validate,
  getJobScans
);

/**
 * @swagger
 * /api/v1/jobs/stats:
 *   get:
 *     summary: Get public statistics (trends, alerts)
 *     tags: [Jobs]
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/stats', optionalAuth, getPublicStats);

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   get:
 *     summary: Get a specific job scan
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job scan ID
 *     responses:
 *       200:
 *         description: Job scan retrieved successfully
 *       404:
 *         description: Job scan not found
 *       401:
 *         description: Not authorized
 */
router.get(
  '/:id',
  protect,
  mongoIdValidation,
  validate,
  getJobScan
);

/**
 * @swagger
 * /api/v1/jobs/{id}:
 *   delete:
 *     summary: Delete a job scan
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job scan ID
 *     responses:
 *       200:
 *         description: Job scan deleted successfully
 *       404:
 *         description: Job scan not found
 *       401:
 *         description: Not authorized
 */
router.delete(
  '/:id',
  protect,
  mongoIdValidation,
  validate,
  deleteJobScan
);

/**
 * @swagger
 * /api/v1/jobs/{id}/report:
 *   post:
 *     summary: Report a suspicious job
 *     tags: [Jobs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Job scan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: This job is requesting personal information upfront
 *     responses:
 *       200:
 *         description: Job reported successfully
 *       404:
 *         description: Job scan not found
 */
router.post(
  '/:id/report',
  protect,
  mongoIdValidation,
  reportJobValidation,
  validate,
  reportJob
);

module.exports = router;
