# 🚀 Complete Deployment Guide - ShopNova E-Commerce

## Quick Deploy (5 minutes)

### Step 1: Create MongoDB Atlas (FREE - 2 mins)
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Sign Up" → Create account
3. Create a **Free Cluster**
4. Go to "Database" → Click your cluster
5. Click "Connect" → "Drivers" → Copy connection string
6. Replace `<username>` and `<password>` with your password
7. Example:
   ```
   mongodb+srv://tushar:mypassword@cluster.mongodb.net/ecommerce?retryWrites=true&w=majority
   ```

### Step 2: Deploy on Render (FREE - 3 mins)
1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Select GitHub repo: `tushar-singhal736/shopnova-E-commerce`
4. Use branch: `main`
5. Click "Deploy"

### Step 3: Add Environment Variables (1 min)
After Render creates the service, go to **Settings** → **Environment** and add:

| Key | Value | Notes |
|-----|-------|-------|
| `MONGODB_URI` | From Step 1 | Your MongoDB connection string |
| `MONGODB_DB` | `ecommerce` | Database name |
| `USE_MONGO` | `true` | Enable MongoDB |
| `NODE_ENV` | `production` | Production mode |
| `RAZORPAY_KEY_ID` | `rzp_test_dummy_key` | Test mode (for now) |
| `RAZORPAY_KEY_SECRET` | `test_dummy_secret` | Test mode (for now) |

### Step 4: Wait & Access
- Render will show your live URL: `https://shopnova-ecommerce.onrender.com`
- Takes 5-10 minutes to build and deploy
- Check logs in Render dashboard if issues

---

## Test Credentials (Local Testing)

**Demo Admin Account:**
```
Email: admin@example.com
Password: admin123
```

**Demo Customer Account:**
```
Email: customer@example.com
Password: customer123
```

---

## API Endpoints

- Frontend: `https://shopnova-ecommerce.onrender.com`
- Backend API: `https://shopnova-ecommerce.onrender.com/api`
- Admin Panel: `https://shopnova-ecommerce.onrender.com/admin`

---

## Troubleshooting

### Issue: "Build failed" on Render
- Check Render logs
- Make sure `package.json` scripts are correct
- Ensure `Procfile` exists

### Issue: "Cannot connect to database"
- Verify MongoDB URI is correct
- Check MongoDB Atlas IP whitelist (add `0.0.0.0/0`)
- Test connection string locally

### Issue: "Page not found" after deploy
- Wait 10 minutes for build to complete
- Try refreshing the page
- Check Render deployment status

---

## What Was Done
✅ GitHub repo synced  
✅ Production build configured  
✅ Render deployment files added  
✅ Backend made resilient to missing keys  
✅ API client updated for production  

## Next: Add Real Razorpay Keys
1. Create account at https://razorpay.com
2. Get API keys from Dashboard
3. Update in Render settings
4. Done!

---

**Live URL (after deployment):**
```
https://shopnova-ecommerce.onrender.com
```
