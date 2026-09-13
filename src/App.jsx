import React, { useCallback, useState, useEffect } from 'react';
import Splash from './components/Splash';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';
import Chatbot from './components/Chatbot';
import { apiFetch, parseApiResponse, getAdminHeaders } from './utils/api';
import { getProductImage } from './utils/productImages';
import { sanitizeUser, normalizeEmail } from './utils/userValidation';
import Home from './pages/Home';
import Login from './pages/Login';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Wishlist from './pages/Wishlist';
import AdminOrders from './pages/AdminOrders';
import AdminProducts from './pages/AdminProducts';
import AdminPanel from './pages/AdminPanel';
import OrderSuccess from './pages/OrderSuccess';
import Profile from './pages/Profile';
import StaticPage from './pages/StaticPage';
import './App.css';

const scopedStorageKey = (name, email) => `${name}:${normalizeEmail(email) || 'guest'}`;

function App() {
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [orders, setOrders] = useState([]);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [couponPercent, setCouponPercent] = useState(0);
  const [activeCoupon, setActiveCoupon] = useState('');
  const [storeDiscountPercent, setStoreDiscountPercent] = useState(0);
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'light';
  });

  const [showSplash, setShowSplash] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !sessionStorage.getItem('supernova_splash_seen_session');
  });

  const [toast, setToast] = useState(null);
  const isAdmin = user?.role === 'admin';
  const accountKey = normalizeEmail(user?.email) || 'guest';

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const fetchUserOrders = useCallback(async (currentUser = user) => {
    if (!currentUser?.email) {
      setOrders([]);
      return [];
    }

    const res = await apiFetch('/api/orders');
    const response = await parseApiResponse(res);
    const allOrders = Array.isArray(response) ? response : response.items || response;
    const normalizedUserEmail = normalizeEmail(currentUser.email);
    const userOrders = allOrders
      .filter(order => normalizeEmail(order.userEmail || order.customer?.email || '') === normalizedUserEmail)
      .sort((a, b) => {
        const dateA = new Date(a.statusUpdatedAt || a.createdAt || a.orderDate || 0).getTime();
        const dateB = new Date(b.statusUpdatedAt || b.createdAt || b.orderDate || 0).getTime();
        return dateB - dateA;
      });

    setOrders(userOrders);
    localStorage.setItem(scopedStorageKey('orders', currentUser.email), JSON.stringify(userOrders));
    return userOrders;
  }, [user]);

  const calculateAutoDiscount = (cartItems) => {
    const sub = cartItems.reduce((sum, it) => sum + it.price * it.quantity, 0);
    if (sub >= 1000) return 10;
    if (sub >= 500) return 5;
    return 0;
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Splash sirf pehli baar — refresh par dubara nahi
  useEffect(() => {
    if (!showSplash) return undefined;
    const t = setTimeout(() => {
      sessionStorage.setItem('supernova_splash_seen_session', 'true');
      setShowSplash(false);
    }, 4000);
    return () => clearTimeout(t);
  }, [showSplash]);

  // localStorage se data load karo
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    let storedAccount = null;
    try { storedAccount = savedUser ? JSON.parse(savedUser) : null; } catch { storedAccount = null; }
    const initialEmail = storedAccount?.email || 'guest';
    const savedCart = localStorage.getItem(scopedStorageKey('cart', initialEmail)) || localStorage.getItem('cart');
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); }
      catch { localStorage.removeItem('cart'); }
    }
    if (savedToken) {
      setToken(savedToken);
      if (savedUser) {
        try { setUser(JSON.parse(savedUser)); }
        catch { localStorage.removeItem('user'); }
      }
    } else {
      localStorage.removeItem('user');
      setUser(null);
    }
    if (savedToken && !savedUser) {
      localStorage.removeItem('token');
      setToken(null);
    }
    const savedWishlist = localStorage.getItem(scopedStorageKey('wishlist', initialEmail)) || localStorage.getItem('wishlist');
    if (savedWishlist) {
      try { setWishlist(JSON.parse(savedWishlist)); }
      catch { localStorage.removeItem('wishlist'); }
    }
    const savedStoreDiscount = localStorage.getItem('storeDiscountPercent');
    if (savedStoreDiscount) setStoreDiscountPercent(parseFloat(savedStoreDiscount));
    const savedCoupon = localStorage.getItem(scopedStorageKey('activeCoupon', initialEmail)) || localStorage.getItem('activeCoupon');
    if (savedCoupon) {
      try {
        const parsed = JSON.parse(savedCoupon);
        setActiveCoupon(parsed.code || '');
        setCouponPercent(Number(parsed.percent) || 0);
      } catch { localStorage.removeItem('activeCoupon'); }
    }
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    let active = true;

    const verifyAuthToken = async () => {
      try {
        const res = await apiFetch('/api/auth/me', {
          headers: getAdminHeaders(),
        });
        const data = await parseApiResponse(res);
        if (!active) return;
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch (err) {
        if (!active) return;
        console.warn('Auth token invalid or expired:', err);
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    };

    verifyAuthToken();
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    let alive = true;
    const fetchSettings = async () => {
      try {
        const res = await apiFetch('/api/settings');
        const data = await parseApiResponse(res);
        const d = Number(data?.discountPercent) || 0;
        if (!alive) return;
        setStoreDiscountPercent(d);
      } catch (err) {
        console.error('Error fetching store settings:', err);
      }
    };
    fetchSettings();
    const intervalId = setInterval(fetchSettings, 15000);
    return () => { alive = false; clearInterval(intervalId); };
  }, []);

  useEffect(() => {
    if (user && user.email) {
      const loadOrders = async () => {
        try {
          await fetchUserOrders(user);
        } catch (err) {
          console.error('Error fetching orders:', err);
        }
      };
      loadOrders();
      const intervalId = setInterval(loadOrders, 15000);
      const refreshOnFocus = () => {
        if (document.visibilityState === 'visible') loadOrders();
      };
      document.addEventListener('visibilitychange', refreshOnFocus);
      return () => {
        clearInterval(intervalId);
        document.removeEventListener('visibilitychange', refreshOnFocus);
      };
    } else {
      setOrders([]);
    }
  }, [fetchUserOrders, user]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey('cart', accountKey), JSON.stringify(cart));
    const auto = calculateAutoDiscount(cart);
    const effective = (Number(storeDiscountPercent) || 0) > 0
      ? Number(storeDiscountPercent)
      : Math.max(auto, Number(couponPercent) || 0);
    setDiscountPercent(effective);
  }, [accountKey, cart, storeDiscountPercent, couponPercent]);

  useEffect(() => {
    const savedCoupon = localStorage.getItem('activeCoupon');
    if (!savedCoupon || !cart.length) return undefined;

    let cancelled = false;
    const revalidateSavedCoupon = async () => {
      try {
        const parsed = JSON.parse(savedCoupon);
        const code = parsed?.code;
        if (!code) return;
        const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
        const res = await apiFetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, subtotal }),
        });
        const data = await parseApiResponse(res);
        if (cancelled) return;
        setActiveCoupon(data.code || code);
        setCouponPercent(Number(data.percent) || 0);
      } catch {
        if (cancelled) return;
        setActiveCoupon('');
        setCouponPercent(0);
        localStorage.removeItem(scopedStorageKey('activeCoupon', accountKey));
      }
    };

    revalidateSavedCoupon();
    return () => { cancelled = true; };
  }, [accountKey, cart]);

  useEffect(() => {
    localStorage.setItem('storeDiscountPercent', storeDiscountPercent);
  }, [storeDiscountPercent]);

  useEffect(() => {
    localStorage.setItem(scopedStorageKey('wishlist', accountKey), JSON.stringify(wishlist));
  }, [accountKey, wishlist]);

  const addToCart = (product) => {
    const MAX_CART_QUANTITY = 10;
    const incomingQty = product.quantity ? Number(product.quantity) : 1;
    const cartKey = product.cartKey || `${product.id}-${product.selectedVariant?.sku || 'default'}`;
    const exists = cart.find(item => item.cartKey === cartKey);
    const currentQty = exists ? exists.quantity : 0;
    const desiredQty = Math.min(MAX_CART_QUANTITY, currentQty + incomingQty);

    if (currentQty + incomingQty > MAX_CART_QUANTITY) {
      setToast({ message: `Maximum ${MAX_CART_QUANTITY} units allowed per item`, type: 'warning' });
    }

    const prod = {
      ...product,
      cartKey,
      image: getProductImage(product),
      quantity: desiredQty,
    };

    if (exists) {
      setCart(cart.map(item =>
        item.cartKey === prod.cartKey ? { ...item, quantity: desiredQty } : item
      ));
    } else {
      setCart([...cart, prod]);
    }
    setToast({ message: `${prod.name} added to cart` });
  };

  const removeFromCart = (key) => setCart(cart.filter(item => (item.cartKey || item.id) !== key));

  const normalizeWishlistProduct = (product) => ({
    ...product,
    image: getProductImage(product),
    savedAt: product.savedAt || new Date().toISOString(),
  });

  const isInWishlist = (id) => wishlist.some((item) => Number(item.id) === Number(id));

  const toggleWishlist = (product) => {
    if (!product?.id) return;
    const exists = isInWishlist(product.id);
    if (exists) {
      setWishlist((items) => items.filter((item) => Number(item.id) !== Number(product.id)));
      setToast({ message: `${product.name} removed from wishlist`, type: 'warning' });
    } else {
      setWishlist((items) => [normalizeWishlistProduct(product), ...items]);
      setToast({ message: `${product.name} saved to wishlist`, type: 'success' });
    }
  };

  const removeFromWishlist = (id) => {
    setWishlist((items) => items.filter((item) => Number(item.id) !== Number(id)));
  };

  const clearCart = () => {
    setCart([]);
    localStorage.removeItem(scopedStorageKey('cart', accountKey));
  };

  const updateQuantity = (id, qty) => {
    const MAX_CART_QUANTITY = 10;
    if (qty <= 0) {
      removeFromCart(id);
    } else {
      setCart(cart.map(item =>
        (item.cartKey || item.id) === id ? { ...item, quantity: Math.min(MAX_CART_QUANTITY, Number(qty)) } : item
      ));
    }
  };

  const applyCoupon = async (code) => {
    const normalized = String(code || '').trim().toUpperCase();
    if (!normalized) {
      setToast({ message: 'Enter a coupon code', type: 'error' });
      return false;
    }
    const subtotal = cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
    try {
      const res = await apiFetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized, subtotal }),
      });
      const data = await parseApiResponse(res);
      const appliedCode = data.code || normalized;
      const percent = Number(data.percent) || 0;
      setActiveCoupon(appliedCode);
      setCouponPercent(percent);
      localStorage.setItem(scopedStorageKey('activeCoupon', accountKey), JSON.stringify({ code: appliedCode, percent }));
      setToast({ message: `${appliedCode} applied: ${percent}% off`, type: 'success' });
      return true;
    } catch (err) {
      setActiveCoupon('');
      setCouponPercent(0);
      localStorage.removeItem(scopedStorageKey('activeCoupon', accountKey));
      setToast({ message: err.message || 'Invalid coupon code', type: 'error' });
      return false;
    }
  };

  const removeCoupon = () => {
    setActiveCoupon('');
    setCouponPercent(0);
    localStorage.removeItem(scopedStorageKey('activeCoupon', accountKey));
  };

  const getCartCount = () => cart.reduce((total, item) => total + item.quantity, 0);

  const addOrder = (orderData) => {
    const newOrder = {
      orderId:         orderData.orderId || orderData._id || `ORD-${Date.now()}`,
      orderDate:       orderData.createdAt || orderData.orderDate || new Date().toISOString(),
      createdAt:       orderData.createdAt || orderData.orderDate || new Date().toISOString(),
      items:           orderData.items || [],
      subtotal:        orderData.subtotal || orderData.summary?.subtotal || 0,
      shippingCharge:  orderData.shippingCharge || orderData.summary?.shipping || 0,
      discountPercent: orderData.discountPercent || 0,
      discountAmount:  orderData.discountAmount || orderData.summary?.discount || 0,
      total:           orderData.total || orderData.summary?.totalPayable || 0,
      paymentMethod:   orderData.paymentMethod || 'Online',
      userEmail:       orderData.userEmail || '',
      status:          orderData.status || 'Processing',
    };
    const updatedOrders = [newOrder, ...orders];
    setOrders(updatedOrders);
    localStorage.setItem(scopedStorageKey('orders', accountKey), JSON.stringify(updatedOrders));
    return newOrder.orderId;
  };

  const cancelOrder = async (orderId, reason) => {
    try {
      const res = await apiFetch(`/api/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const updatedOrder = await parseApiResponse(res);
      const updatedOrders = orders.map(order =>
        order.orderId === orderId ? { ...order, ...updatedOrder } : order
      );
      setOrders(updatedOrders);
      localStorage.setItem(scopedStorageKey('orders', accountKey), JSON.stringify(updatedOrders));
      setToast({ message: 'Order cancelled successfully', type: 'success' });
      fetchUserOrders();
      return true;
    } catch (err) {
      console.error(err);
      setToast({ message: err.message || 'Failed to cancel order', type: 'error' });
      return false;
    }
  };

  const returnOrder = async (orderId, reason) => {
    try {
      const res = await apiFetch(`/api/orders/${orderId}/return`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      const updatedOrder = await parseApiResponse(res);
      const updatedOrders = orders.map(order =>
        order.orderId === orderId ? { ...order, ...updatedOrder } : order
      );
      setOrders(updatedOrders);
      localStorage.setItem(scopedStorageKey('orders', accountKey), JSON.stringify(updatedOrders));
      setToast({ message: 'Return request submitted successfully', type: 'success' });
      fetchUserOrders();
      return true;
    } catch (err) {
      console.error(err);
      setToast({ message: err.message || 'Failed to submit return request', type: 'error' });
      return false;
    }
  };

  const handleLogin = (userData, authToken) => {
    const sanitized = sanitizeUser(userData);
    const nextEmail = sanitized.email;
    setUser(sanitized);
    setToken(authToken || null);
    try {
      const savedCart = JSON.parse(localStorage.getItem(scopedStorageKey('cart', nextEmail)) || '[]');
      const savedWishlist = JSON.parse(localStorage.getItem(scopedStorageKey('wishlist', nextEmail)) || '[]');
      const savedCoupon = JSON.parse(localStorage.getItem(scopedStorageKey('activeCoupon', nextEmail)) || 'null');
      setCart(Array.isArray(savedCart) ? savedCart : []);
      setWishlist(Array.isArray(savedWishlist) ? savedWishlist : []);
      setActiveCoupon(savedCoupon?.code || '');
      setCouponPercent(Number(savedCoupon?.percent) || 0);
    } catch {
      setCart([]);
      setWishlist([]);
      setActiveCoupon('');
      setCouponPercent(0);
    }
    localStorage.setItem('user', JSON.stringify(sanitized));
    if (authToken) {
      localStorage.setItem('token', authToken);
    }
  };

  const handleLogout = async () => {
    try {
      if (token) await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.warn('Logout session revoke failed:', err);
    }
    setUser(null);
    setToken(null);
    setCart([]);
    setWishlist([]);
    setOrders([]);
    setActiveCoupon('');
    setCouponPercent(0);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem(scopedStorageKey('cart', accountKey));
    localStorage.removeItem(scopedStorageKey('wishlist', accountKey));
    localStorage.removeItem(scopedStorageKey('activeCoupon', accountKey));
    localStorage.removeItem(scopedStorageKey('orders', accountKey));
    localStorage.removeItem('cart');
    localStorage.removeItem('wishlist');
    localStorage.removeItem('activeCoupon');
  };

  if (showSplash) return <Splash />;

  return (
    <Router>
      <div className="App">
        <Navbar
          cartCount={getCartCount()}
          user={user}
          isAdmin={isAdmin}
          wishlistCount={wishlist.length}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {toast?.message && (
          <div className={`app-toast app-toast--${toast.type || 'success'}`} role="status" aria-live="polite">
            {toast.type === 'error'   && <span aria-label="error"   className="toast-icon">⚠️ </span>}
            {toast.type === 'success' && <span aria-label="success" className="toast-icon">✅ </span>}
            {toast.message}
          </div>
        )}

        <main className="content-area">
          <Routes>
            <Route path="/" element={<Home addToCart={addToCart} discountPercent={discountPercent} cart={cart} user={user} wishlist={wishlist} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} setToast={setToast} />} />
            <Route path="/products" element={<Products addToCart={addToCart} discountPercent={discountPercent} cart={cart} user={user} wishlist={wishlist} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />} />
            <Route path="/products/:category" element={<Products addToCart={addToCart} discountPercent={discountPercent} cart={cart} user={user} wishlist={wishlist} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />} />
            <Route path="/product/:id" element={<ProductDetail addToCart={addToCart} discountPercent={discountPercent} cart={cart} user={user} wishlist={wishlist} toggleWishlist={toggleWishlist} isInWishlist={isInWishlist} />} />
            <Route path="/wishlist" element={<Wishlist wishlist={wishlist} addToCart={addToCart} removeFromWishlist={removeFromWishlist} clearWishlist={() => setWishlist([])} />} />
            <Route
              path="/cart"
              element={
                <Cart
                  cart={cart}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                  discountPercent={discountPercent}
                  couponPercent={couponPercent}
                  addToCart={addToCart}
                  user={user}
                  wishlist={wishlist}
                  toggleWishlist={toggleWishlist}
                  isInWishlist={isInWishlist}
                  activeCoupon={activeCoupon}
                  applyCoupon={applyCoupon}
                  removeCoupon={removeCoupon}
                />
              }
            />
            <Route
              path="/checkout"
              element={
                user
                  ? <Checkout
                      cart={cart}
                      clearCart={clearCart}
                      addOrder={addOrder}
                      user={user}
                      discountPercent={discountPercent}
                      activeCoupon={activeCoupon}
                      couponPercent={couponPercent}
                      storeDiscountPercent={storeDiscountPercent}
                      darkMode={theme === 'dark'}
                      setToast={setToast}
                    />
                  : <Navigate to="/login" state={{ from: '/checkout', message: 'Checkout karne ke liye pehle login karein.' }} replace />
              }
            />
            <Route path="/order-success" element={user ? <OrderSuccess /> : <Navigate to="/login" replace />} />
            <Route
              path="/orders"
              element={
                user
                  ? <Orders orders={orders} returnOrder={returnOrder} cancelOrder={cancelOrder} setToast={setToast} />
                  : <Navigate to="/login" replace />
              }
            />
            <Route path="/admin" element={<ProtectedAdminRoute user={user}><AdminPanel setToast={setToast} /></ProtectedAdminRoute>} />
            <Route path="/admin/orders" element={<ProtectedAdminRoute user={user}><AdminOrders setToast={setToast} /></ProtectedAdminRoute>} />
            <Route path="/admin/products" element={<ProtectedAdminRoute user={user}><AdminProducts setToast={setToast} /></ProtectedAdminRoute>} />
            <Route
              path="/profile"
              element={
                user
                  ? <Profile user={user} logout={handleLogout} setUser={setUser} setCartCount={setCart} setToast={setToast} />
                  : <Navigate to="/login" replace />
              }
            />
            <Route path="/pages/:slug" element={<StaticPage />} />
          </Routes>
        </main>

        <Footer />
        <Chatbot
          cart={cart}
          orders={orders}
          user={user}
          isAdmin={isAdmin}
          discountPercent={discountPercent}
          activeCoupon={activeCoupon}
          wishlist={wishlist}
        />
      </div>
    </Router>
  );
}

export default App;
