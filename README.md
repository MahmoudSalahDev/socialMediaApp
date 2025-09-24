# 📱 SocialMediaApp API


---

## 🚀 Features

### 👤 User Management

* **Signup & Verification**

  * Register new users with email confirmation.
* **Authentication**

  * Login with email/password.
* **User Profile**

  * Get User Profile information.
* **Email Confirmation**

  * Confirm email address with OTP.
* **Logout**

  * Log out from current device or all devices.
* **Token Management**

  * Refresh Token endpoint to get new access & refresh tokens.
* **Password Management**

  * Forget Password (request password reset).
  * Reset Password (set a new password).

### 📂 File Management
* **Upload Image**
  * Upload image files to AWS S3 storage.


---

## 🛠 Tech Stack

- **Backend Framework:** Express.js  
- **Database:** MongoDB with Mongoose  

**Authentication & Security:**  
- bcrypt – password hashing  
- jsonwebtoken – token-based authentication  
- express-rate-limit – request rate limiting  

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
