# JobGuard Backend API

A comprehensive Node.js/Express backend API for the JobGuard platform - a job scam detection and verification system.

## 🚀 Features

- **User Authentication**
  - Register/Login with JWT
  - Password reset functionality
  - Account lockout after failed attempts
  - Secure password hashing with bcrypt

- **Job Scanning**
  - Submit job URLs or descriptions
  - Upload job files (PDF, DOC, DOCX, TXT)
  - Risk level assessment (Low, Medium, High)
  - Detailed warning flags

- **Analytics & Insights**
  - User-specific analytics
  - Global trends and statistics
  - Recent scam alerts
  - Monthly trend analysis

- **Security Features**
  - Rate limiting
  - Data sanitization
  - XSS protection
  - Helmet security headers
  - CORS configuration
  - Input validation

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd to-your-folder
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/jobguard
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d
JWT_COOKIE_EXPIRE=7
```

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use MongoDB Atlas connection string in .env
```

5. **Run the application**
```bash
# Development mode with nodemon
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

## 📚 API Documentation

Once the server is running, access the interactive Swagger documentation at:
```
http://localhost:5000/api-docs
```

## 🔗 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `POST /api/v1/auth/forgotpassword` - Request password reset
- `PUT /api/v1/auth/resetpassword/:token` - Reset password
- `PUT /api/v1/auth/updatepassword` - Update password

### Jobs
- `POST /api/v1/jobs` - Create job scan
- `GET /api/v1/jobs` - Get all user's job scans
- `GET /api/v1/jobs/:id` - Get single job scan
- `DELETE /api/v1/jobs/:id` - Delete job scan
- `POST /api/v1/jobs/:id/report` - Report suspicious job
- `GET /api/v1/jobs/stats` - Get public statistics

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile
- `DELETE /api/v1/users/account` - Delete user account

### Analytics
- `GET /api/v1/analytics/user` - Get user analytics
- `GET /api/v1/analytics/global` - Get global analytics (admin)
- `GET /api/v1/analytics/trends` - Get scam trends
- `GET /api/v1/analytics/alerts` - Get recent alerts

## 🧪 Testing with Postman

### Import Collection

1. Open Postman
2. Click "Import" button
3. Select the provided `JobGuard_API.postman_collection.json`
4. Import the environment variables from `JobGuard_Environment.postman_environment.json`

### Test Flow

1. **Register a new user**
   - Request: `POST /api/v1/auth/register`
   - The token will be automatically saved

2. **Login**
   - Request: `POST /api/v1/auth/login`
   - Token is saved in environment variables

3. **Create a job scan**
   - Request: `POST /api/v1/jobs`
   - Include job URL, description, or file

4. **View results**
   - Request: `GET /api/v1/jobs`
   - Check risk level and warning flags

## 📊 Database Schema

### User Model
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  password: String (hashed),
  role: String (user/admin),
  isVerified: Boolean,
  accountStatus: String,
  createdAt: Date,
  updatedAt: Date
}
```

### JobScan Model
```javascript
{
  user: ObjectId (ref: User),
  jobUrl: String,
  jobDescription: String,
  companyName: String,
  riskLevel: String (low/medium/high),
  scamProbability: Number (0-100),
  warningFlags: Array,
  analysisResults: Object,
  status: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🔒 Security

- **JWT Authentication**: Tokens expire in 7 days
- **Password Requirements**: Minimum 8 characters, must include uppercase, lowercase, and number
- **Rate Limiting**: 
  - Auth endpoints: 5 requests per 15 minutes
  - Job scanning: 20 requests per hour
  - General API: 100 requests per 15 minutes
- **Account Lockout**: Account locked for 2 hours after 5 failed login attempts
- **File Upload**: Max 5MB, only PDF/DOC/DOCX/TXT allowed

## 🎯 Scam Detection Logic

The system analyzes jobs for the following warning signs:

1. **Unrealistic Salary Claims** - Keywords like "get rich", "unlimited income"
2. **Upfront Payment Requests** - Requires fees or deposits
3. **Pressure Tactics** - "Act now", "limited time", "urgent"
4. **Vague Descriptions** - Very short or unclear job details
5. **Personal Info Requests** - Asks for SSN, bank details upfront
6. **Suspicious Email** - Uses free email providers (Gmail, Yahoo)
7. **No Company Presence** - Missing website or online presence

## 📈 Rate Limits

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Authentication | 5 requests | 15 minutes |
| Job Scanning | 20 requests | 1 hour |
| File Upload | 10 requests | 1 hour |
| Password Reset | 3 requests | 1 hour |
| General API | 100 requests | 15 minutes |

## 🐛 Error Handling

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message here"
}
```

Common status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request / Validation Error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `423` - Locked (Account locked)
- `429` - Too Many Requests
- `500` - Server Error

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=5000
MONGODB_URI=<your-mongodb-atlas-uri>
JWT_SECRET=<strong-secret-key>
CLIENT_URL=<your-frontend-url>
```

## 📝 Development

### Project Structure
```
jobguard-backend/
├── config/
│   └── database.js
├── controllers/
│   ├── authController.js
│   ├── jobController.js
│   ├── userController.js
│   └── analyticsController.js
├── middleware/
│   ├── auth.js
│   ├── errorHandler.js
│   ├── fileUpload.js
│   ├── notFound.js
│   ├── rateLimiter.js
│   └── validators.js
├── models/
│   ├── User.js
│   └── JobScan.js
├── routes/
│   ├── authRoutes.js
│   ├── jobRoutes.js
│   ├── userRoutes.js
│   └── analyticsRoutes.js
├── utils/
│   └── errorResponse.js
├── uploads/
├── .env.example
├── package.json
├── server.js
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

