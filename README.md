# 🛒 Full-Stack E-Commerce Website

A complete full-stack e-commerce web application built with React, Node.js/Express, and MongoDB. Features admin panel, product management, cart system, user authentication, Razorpay payment integration, and real-time order tracking.

## 🚀 Features

### User Side
- 📱 Product Listing & Search
- 🏷️ Category Filtering
- 🛒 Shopping Cart Management
- 👤 User Authentication (Login/Signup)
- 📋 User Profile & Order History
- 🚚 Shipping Information Form
- 💳 Razorpay Payment Integration
- 💬 AI Chatbot Support
- 🎯 Product Recommendations
- 📱 Fully Responsive Design

### Admin Panel
- 📊 Dashboard & Analytics
- ➕ Add/Edit/Delete Products
- 📦 Manage Orders
- 👥 Manage Users
- 🎟️ Coupon Management
- ⚙️ Store Settings
- 💰 Revenue Tracking

## 🛠 Tech Stack

### Frontend
- **React** 18.2.0 - UI Library
- **React Router DOM** - Routing
- **React Icons** - Icon Library
- **jsPDF** - PDF Generation
- **DOMPurify** - XSS Protection

### Backend
- **Node.js** - Runtime
- **Express.js** - Web Framework
- **MongoDB** - NoSQL Database
- **Razorpay** - Payment Gateway
- **Twilio** - SMS Service
- **Express Rate Limit** - API Protection
- **CORS** - Cross-Origin Support

### Database
- **MongoDB** - Real-time data storage

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or cloud - MongoDB Atlas)
- Razorpay Account (for payment integration)
- Twilio Account (for SMS notifications)

## 📦 Installation & Setup

### 1. Clone or Extract Project
```bash
cd "ECOMMERCE WEBSITE"
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
npm install --prefix backend
```

### 4. Configure Environment Variables

Create `.env` file in the `backend/` directory:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=ecommerce
USE_MONGO=true

# Payment Gateway
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret

# SMS Service
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token

# API
PORT=5005
NODE_ENV=development

# AI Chatbot (Optional)
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
```

### 5. Start MongoDB
```bash
# Windows (if MongoDB installed locally)
mongod

# Or use MongoDB Atlas Cloud
# Update MONGODB_URI in .env with your connection string
```

## 🚀 Running the Project

### Option A: Full Stack (Recommended)

#### Terminal 1 - Backend + MongoDB
```bash
cd backend
$env:USE_MONGO='true'
$env:MONGODB_URI='mongodb://127.0.0.1:27017'
$env:MONGODB_DB='ecommerce'
npm run migrate:mongodb
npm start
```

Backend starts at `http://localhost:5005`

#### Terminal 2 - Frontend (In root directory)
```bash
npm start
```

Frontend starts at `http://localhost:3000`

### Option B: Backend Only
```bash
cd backend
npm start
```

### Option C: Development Mode (Auto-reload)
```bash
cd backend
npm run dev
```

## 🔄 Data Migration

To migrate existing JSON data to MongoDB:

```bash
cd backend
npm run migrate:mongodb
```

This will:
- Read all JSON files (users.json, products.json, orders.json, etc.)
- Import data into MongoDB collections
- Create indexes for better performance

## 📂 Project Structure

```
ECOMMERCE WEBSITE/
├── backend/
│   ├── server.js                    # Main API server
│   ├── db.js                        # MongoDB connection & helpers
│   ├── mongoMigration.js            # JSON to MongoDB migration
│   ├── chatbotEngine.js             # AI chatbot logic
│   ├── package.json
│   ├── .env                         # Environment variables
│   └── *.json                       # Legacy data files
│
├── src/
│   ├── App.jsx                      # Main React component
│   ├── index.js                     # Entry point
│   ├── components/                  # Reusable components
│   │   ├── Navbar.jsx
│   │   ├── Chatbot.jsx
│   │   ├── Footer.jsx
│   │   └── Recommendations.jsx
│   │
│   ├── pages/                       # Page components
│   │   ├── Home.jsx
│   │   ├── Products.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── Login.jsx
│   │   ├── Profile.jsx
│   │   ├── AdminPanel.jsx
│   │   └── Orders.jsx
│   │
│   └── utils/                       # Helper functions
│       ├── api.js                   # API calls
│       ├── productImages.js
│       └── userValidation.js
│
├── public/
│   └── index.html
│
├── build/                           # Production build (after npm run build)
├── package.json
└── README.md
```

## 🔐 Security Features

- ✅ Password Hashing (Scrypt)
- ✅ Session Management with Tokens
- ✅ Rate Limiting on API Endpoints
- ✅ CORS Protection
- ✅ XSS Protection (DOMPurify)
- ✅ Security Headers (X-Frame-Options, CSP, etc.)
- ✅ Authenticated checkout with server-side inventory pricing
- ✅ Razorpay payment signature verification
- ✅ Production admin credentials required through environment variables

## 🧪 API Endpoints

### Products
- `GET /api/products` - List all products
- `GET /api/products/:id` - Get product details
- `POST /api/admin/products` - Add product (Admin)
- `PUT /api/admin/products/:id` - Update product (Admin)
- `DELETE /api/admin/products/:id` - Delete product (Admin)

### Cart
- Cart is maintained in the frontend local storage; checkout validates inventory on the server.

### Orders
- `POST /api/create-order` - Create a Razorpay order (Authenticated)
- `POST /api/orders` - Save a COD or verified online order (Authenticated)
- `GET /api/orders` - Get the signed-in user's orders (Admin sees all)
- `PUT /api/orders/:orderId/cancel` - Cancel an owned order (Authenticated)
- `PUT /api/orders/:orderId/return` - Request a return for an owned delivered order (Authenticated)
- `PUT /api/admin/orders/:orderId/status` - Update order status (Admin)
- `GET /api/admin/stats` - Get dashboard statistics (Admin)

### Users
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `POST /api/auth/reset-password` - Change password using the current password
- `GET /api/auth/me` - Validate the current session

### Settings
- `GET /api/settings` - Get store settings
- `PUT /api/admin/settings` - Update settings (Admin)

## 💳 Payment Integration

Payment is processed through **Razorpay**:
1. User completes checkout
2. Razorpay payment modal opens
3. Razorpay signature is verified on the backend
4. Server recalculates item prices, discount, shipping, and total
5. Order is stored in MongoDB or JSON fallback storage

## 🤖 Chatbot Features

- Real-time customer support
- AI-powered responses (OpenAI)
- Product recommendations
- Order tracking assistance

## 📦 Building for Production

```bash
# Build frontend
npm run build

# Backend starts with PORT environment variable
$env:PORT='5005'
$env:NODE_ENV='production'
npm start --prefix backend
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongod

# Or update MONGODB_URI to use MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ecommerce
```

### Port Already in Use
```bash
# Use different port
$env:PORT='5006'
npm start --prefix backend
```

### CORS Issues
- Check `backend/server.js` CORS configuration
- Ensure frontend URL is in `allowedOrigins`

### Payment Gateway Error
- Verify Razorpay keys in `.env`
- Check Razorpay account status

## 📞 Support

For issues or questions:
1. Check error logs in terminal
2. Verify MongoDB connection
3. Ensure all `.env` variables are set
4. Check Razorpay & Twilio credentials

## 📄 License

This project is open source and available for educational purposes.

---

**Happy Shopping! 🎉**
