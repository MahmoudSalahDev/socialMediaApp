# 📱 SocialMediaApp API

---

## 🚀 Features

👤 User Management

Signup & Verification

Register new users with email confirmation.

Authentication

Log in and log out securely with JWT.

Profile Management

View user profile information.

Update basic user info and email.

Upload or change profile image.

Account Security

Refresh token system.

Forgot/Reset password functionality.

Two-Factor Authentication (2FA).

Freeze and unfreeze and delete account.

User Roles & Dashboard

Access user dashboard.

Update user roles.

Social Features

Add, accept, delete, or unfriend users.

Block and unblock users.

Get firends chat

Get Group Chat

📝 Posts Management

Create & Manage Posts

Create, update, and delete posts.

Freeze or unfreeze posts.

Like and dislike posts.

Post Retrieval

Get all posts.

Get post by ID.

💬 Comments System

Comments & Replies

Create comments and replies.

Update, freeze, unfreeze, or delete comments.

Comment Retrieval

Get comment by ID.

Get comment with replies.
---

## 🛠 Tech Stack
- **Backend Framework:** Express.js  
- **Database:** MongoDB with Mongoose  

**Authentication & Security:**  
- bcrypt – password hashing  
- jsonwebtoken – token-based authentication  
- express-rate-limit – request rate limiting  
- helmet – secure HTTP headers


**File Upload & Storage:**  
- multer – handling file uploads
- AWS S3 via @aws-sdk/client-s3 for cloud storage  



**Utilities & Tools:**  
- nodemailer – email service  
- node-cron – task scheduling  
- dotenv – environment variables  
- aws-sdk / @aws-sdk – AWS S3 integration for file storage  

---

## ⚙️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/MahmoudSalahDev/socialMediaApp
cd socialMediaApp


### 2. Install dependencies:

npm install

### 3. Create a .env file inside a folder called "config" in the root directory with the following variables:

PORT=
DB_URL ="mongodb://127.0.0.1:27017/socialMediaApp"
SALT_ROUNDS = "12"
SECRET_KEY = 
SIGNATURE = 
ACCESS_TOKEN_USER = 
ACCESS_TOKEN_ADMIN = 
REFRESH_TOKEN_USER = 
REFRESH_TOKEN_ADMIN = 
EMAIL = 
PASS = 
BEARER_USER =
BEARER_ADMIN =
WEB_CLIENT_ID = 
#aws config
APPLICATION_NAME=
AWS_REGION=
AWS_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

put a value to each one of them


### 4. Run the development server:
npm run start


-------------------------------------------------------
📖 API Reference

Full API documentation is available here:
👉 https://documenter.getpostman.com/view/39713502/2sB3HkrgJ8

--------------------------------------------------------
