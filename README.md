# E-Commerce Website

A full-featured e-commerce website built with React, HTML, CSS, and JavaScript.

## Features

- ✅ Product Catalog with 20 products
- ✅ Category Filtering (All, Women, Men, Shoes, Jewellery, Electronics)
- ✅ Add to Cart functionality
- ✅ Buy Now functionality
- ✅ Shopping Cart with quantity management
- ✅ User Login/Signup
- ✅ Account/Profile page
- ✅ Shipping Information form
- ✅ Payment page with multiple payment modes (Card, PayPal, Cash on Delivery, UPI)
- ✅ Responsive design

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── components/
│   ├── Footer.css
│   ├── Footer.jsx
│   ├── Navbar.css
│   └── Navbar.jsx
├── pages/
│   ├── Home.jsx
│   ├── Home.css
│   ├── Login.jsx
│   ├── Login.css
│   ├── Products.jsx
│   ├── Products.css
│   ├── Cart.jsx
│   ├── Cart.css
│   ├── Checkout.css
│   ├── Checkout.jsx

├── data/
│   └── products.jsx
├── App.jsx
├── App.css
├── index.js
└── index.css
```

## Technologies Used

- React 18.2.0
- React Router DOM 6.8.0
- HTML5
- CSS3
- JavaScript (ES6+)

## Features Details

### Product Catalog
- 20 products across 6 categories
- Product images, names, descriptions, and prices
- Category filtering

### Shopping Cart
- Add/remove items
- Update quantities
- Calculate totals
- Persistent cart (localStorage)

### User Authentication
- Login/Signup functionality
- User session management
- Protected routes

### Checkout Process
- Shipping information form
- Multiple payment methods
- Order summary
- Order confirmation

## Usage

1. Browse products on the home page or products page
2. Filter by category (All, Women, Men, Shoes, Jewellery, Electronics)
3. Add products to cart or buy now
4. Login/Signup to proceed
5. Review cart and proceed to checkout
6. Enter shipping information
7. Select payment method and complete order

