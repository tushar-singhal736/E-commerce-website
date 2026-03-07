import React, { useState, useEffect } from 'react';
import Splash from './components/Splash';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import OrderSuccess from './pages/OrderSuccess';
import Profile from './pages/Profile';
import './App.css';

function App() {

  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [theme, setTheme] = useState('light');
  const [showSplash, setShowSplash] = useState(true);

  // --- AUTO DISCOUNT CALCULATION ---
  const calculateAutoDiscount = (cartItems) => {
    const sub = cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    if (sub >= 1000) return 10;
    if (sub >= 500) return 5;
    return 0;
  };

  // --- THEME LOGIC ---
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      setTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // --- INITIAL LOAD FROM LOCALSTORAGE ---
  useEffect(() => {

    const savedCart = localStorage.getItem('cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));

    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedDiscount = localStorage.getItem('discountPercent');
    if (savedDiscount) setDiscountPercent(parseFloat(savedDiscount));

    const t = setTimeout(() => setShowSplash(false), 5000);
    return () => clearTimeout(t);

  }, []);

  // --- SAVE DATA ON CHANGES ---
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
    const auto = calculateAutoDiscount(cart);
    setDiscountPercent(auto);
  }, [cart]);

  useEffect(() => {
    localStorage.setItem('discountPercent', discountPercent);
  }, [discountPercent]);

  // --- CART LOGIC ---
  const addToCart = (product) => {

    const incomingQty = product.quantity ? Number(product.quantity) : 1;

    const prod = {
      ...product,
      image: product.image || product.images?.[0] || '',
      quantity: incomingQty
    };

    const exists = cart.find(item => item.id === prod.id);

    if (exists) {

      setCart(cart.map(item =>
        item.id === prod.id
          ? { ...item, quantity: item.quantity + incomingQty }
          : item
      ));

    } else {

      setCart([...cart, prod]);

    }

  };

  const removeFromCart = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem('cart');
  };

  const updateQuantity = (id, qty) => {

    if (qty <= 0) {
      removeFromCart(id);
    } else {

      setCart(cart.map(item =>
        item.id === id ? { ...item, quantity: Number(qty) } : item
      ));

    }

  };

  const getCartCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  // --- ORDER LOGIC ---
  const addOrder = (orderData) => {

    const newOrder = {
      orderId: orderData.orderId || `ORD-${Date.now()}`,
      orderDate: orderData.createdAt || new Date().toISOString(),
      items: orderData.items,
      subtotal: orderData.summary?.subtotal || 0,
      shipping: orderData.summary?.shipping || 0,
      total: orderData.summary?.totalPayable || orderData.total,
      status: 'processing'
    };

    const updatedOrders = [newOrder, ...orders];

    setOrders(updatedOrders);

    localStorage.setItem('orders', JSON.stringify(updatedOrders));

    return newOrder.orderId;

  };

  const cancelOrder = (orderId) => {

    const updatedOrders = orders.map(order =>
      order.orderId === orderId
        ? { ...order, status: 'cancelled' }
        : order
    );

    setOrders(updatedOrders);

    localStorage.setItem('orders', JSON.stringify(updatedOrders));

  };

  const returnOrder = (orderId) => {

    const updatedOrders = orders.map(order =>
      order.orderId === orderId
        ? { ...order, status: 'returned' }
        : order
    );

    setOrders(updatedOrders);

    localStorage.setItem('orders', JSON.stringify(updatedOrders));

  };

  // --- USER AUTH ---
  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setCart([]);
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
  };

  if (showSplash) return <Splash />;

  return (

    <Router>

      <Navbar
        cartCount={getCartCount()}
        user={user}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <Routes>

        <Route path="/" element={<Home addToCart={addToCart} />} />

        <Route path="/login" element={<Login onLogin={handleLogin} />} />

        <Route path="/products" element={<Products addToCart={addToCart} />} />

        <Route path="/products/:category" element={<Products addToCart={addToCart} />} />

        <Route path="/product/:id" element={<ProductDetail addToCart={addToCart} />} />

        <Route
          path="/cart"
          element={
            <Cart
              cart={cart}
              removeFromCart={removeFromCart}
              updateQuantity={updateQuantity}
              discountPercent={discountPercent}
              setDiscountPercent={setDiscountPercent}
            />
          }
        />

        <Route
          path="/checkout"
          element={
            <Checkout
              cart={cart}
              clearCart={clearCart}
              addOrder={addOrder}
              user={user}
              discountPercent={discountPercent}
            />
          }
        />

        <Route
          path="/orders"
          element={
            <Orders
              orders={orders}
              returnOrder={returnOrder}
              cancelOrder={cancelOrder}
            />
          }
        />

        <Route path="/admin/orders" element={<AdminOrders />} />

        <Route path="/admin/products" element={<AdminProducts />} />

        <Route path="/order-success" element={<OrderSuccess />} />

        <Route
          path="/profile"
          element={
            <Profile
              user={user}
              logout={handleLogout}
              setUser={setUser}
              setCartCount={setCart}
            />
          }
        />

      </Routes>

      <Footer />

    </Router>

  );

}

export default App;