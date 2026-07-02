import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API_BASE_URL, { parseApiResponse } from '../utils/api';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import { getStates, getCities, getCityData } from './locationData';
import './Checkout.css';

const Field = ({ name, label, placeholder, type = 'text', textarea = false,
                 maxLength, value, onChange, onBlur, error, touched, readOnly, children }) => (
  <div className={`co-field${error && touched ? ' co-field--error' : ''}`}>
    <label htmlFor={name}>{label}</label>
    {children ? children : textarea ? (
      <textarea
        id={name} name={name} value={value}
        placeholder={placeholder} onChange={onChange} onBlur={onBlur}
      />
    ) : (
      <input
        id={name} type={type} name={name} value={value}
        placeholder={placeholder} onChange={onChange} onBlur={onBlur}
        maxLength={maxLength} autoComplete="on" readOnly={readOnly}
      />
    )}
    {error && touched && (
      <span className="co-error" role="alert">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor"/>
          <path d="M6 4v2.5M6 8v.5" stroke="currentColor" strokeLinecap="round"/>
        </svg>
        {error}
      </span>
    )}
  </div>
);

function Checkout({ cart = [], clearCart, user, addOrder, discountPercent = 0, activeCoupon = '', couponPercent = 0, storeDiscountPercent = 0, darkMode, setToast }) {
  const navigate = useNavigate();

  // LOGIN GUARD
  useEffect(() => {
    if (!user) {
      navigate('/login', {
        state: { from: '/checkout', message: 'Checkout karne ke liye pehle login karein.' }
      });
    }
  }, [user, navigate]);

  if (!user) return null;

  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading]             = useState(false);
  const [touched, setTouched]             = useState({});
  const [cityList, setCityList]           = useState([]);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [saveAddress, setSaveAddress] = useState(true);

  const [formData, setFormData] = useState({
    fullName: user?.name || user?.displayName || '',
    email:    user?.email || '',
    phone:    user?.phone || '',
    address:  '',
    city:     '',
    state:    '',
    zipCode:  '',
    country:  'India',
  });

  const [errors, setErrors] = useState({});
  const addressStorageKey = `addresses:${user.email}`;

  useEffect(() => {
    const saved = localStorage.getItem(addressStorageKey);
    if (saved) {
      try { setSavedAddresses(JSON.parse(saved)); }
      catch { localStorage.removeItem(addressStorageKey); }
    }
  }, [addressStorageKey]);

  useEffect(() => {
    if (formData.state) {
      const cities = getCities(formData.state);
      setCityList(cities);
      if (formData.city && !cities.includes(formData.city)) {
        setFormData(prev => ({ ...prev, city: '', zipCode: '' }));
      }
      setErrors(prev => ({ ...prev, city: '', zipCode: '', address: '' }));
    } else {
      setCityList([]);
    }
  }, [formData.state, formData.city]);

  useEffect(() => {
    if (formData.state && formData.city) {
      const data = getCityData(formData.state, formData.city);
      if (data) {
        setFormData(prev => ({ ...prev, zipCode: data.pin, address: prev.address || '' }));
        setErrors(prev => ({ ...prev, zipCode: '' }));
      }
    }
  }, [formData.city]);

  const shipping       = 50;
  const subtotal       = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalTotal     = subtotal + shipping - discountAmount;

  const validateField = (name, value) => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) return 'Full name required';
        if (!/^[A-Za-z ]+$/.test(value)) return 'Only alphabets allowed';
        return '';
      case 'email':
        if (!value.trim()) return 'Email required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email';
        return '';
      case 'phone':
        if (!/^\d{10}$/.test(value)) return 'Enter a valid 10-digit phone number';
        return '';
      case 'address':
        if (value.trim().length < 10) return 'Enter complete address (min 10 chars)';
        return '';
      case 'city':
        if (!value.trim()) return 'Select a city';
        return '';
      case 'state':
        if (!value.trim()) return 'Select a state';
        return '';
      case 'zipCode':
        if (!/^[1-9][0-9]{5}$/.test(value)) return 'Enter a valid 6-digit PIN';
        return '';
      default:
        return '';
    }
  };

  const validate = () => {
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const err = validateField(key, formData[key]);
      if (err) newErrors[key] = err;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let v = value;
    if (name === 'phone')    v = value.replace(/\D/g, '').slice(0, 10);
    if (name === 'zipCode')  v = value.replace(/\D/g, '').slice(0, 6);
    if (name === 'fullName') v = value.replace(/[^A-Za-z ]/g, '');
    setFormData(prev => ({ ...prev, [name]: v }));
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: validateField(name, v) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));
    setErrors(prev => ({ ...prev, [name]: validateField(name, value) }));
  };

  const applySavedAddress = (address) => {
    setFormData((prev) => ({ ...prev, ...address }));
    setTouched({});
    setErrors({});
  };

  const persistAddress = () => {
    if (!saveAddress) return;
    const nextAddress = {
      id: Date.now(),
      label: `${formData.fullName || 'Address'} - ${formData.city}`,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      country: formData.country,
    };
    const withoutDuplicate = savedAddresses.filter((item) =>
      `${item.address}-${item.zipCode}` !== `${nextAddress.address}-${nextAddress.zipCode}`
    );
    const updated = [nextAddress, ...withoutDuplicate].slice(0, 4);
    setSavedAddresses(updated);
    localStorage.setItem(addressStorageKey, JSON.stringify(updated));
  };

  const fp = (name) => ({
    name,
    value:    formData[name],
    onChange: handleChange,
    onBlur:   handleBlur,
    error:    errors[name],
    touched:  touched[name],
  });

  // ── ORDER SUCCESS NAVIGATE — order data saath bhejo ──
  const goToSuccess = (savedOrder) => {
    // Normalize order data taaki OrderSuccess aur Orders dono sahi dikhayein
    const normalized = {
      orderId:        savedOrder.orderId || savedOrder._id || `ORD-${Date.now()}`,
      orderDate:      savedOrder.createdAt || savedOrder.orderDate || new Date().toISOString(),
      createdAt:      savedOrder.createdAt || savedOrder.orderDate || new Date().toISOString(),
      date:           new Date(savedOrder.createdAt || savedOrder.orderDate || Date.now()).toLocaleString('en-IN'),
      items:          savedOrder.items || cart,
      total:          savedOrder.summary?.totalPayable ?? savedOrder.total ?? finalTotal,
      summary: {
        subtotal:     subtotal,
        shipping:     shipping,
        discount:     discountAmount,
        totalPayable: finalTotal,
      },
      paymentMethod:  paymentMethod,
      status:         paymentMethod === 'cod' ? 'Pending - Cash on Delivery' : 'Processing',
      userEmail:      user.email,
    };

    if (addOrder) addOrder(normalized);
    if (clearCart) clearCart();
    localStorage.removeItem('cart');

    // ✅ Order data state mein bhejo navigate ke saath aur replace: true se history clean kro
    navigate('/order-success', { state: { order: normalized }, replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.keys(formData).reduce((a, k) => ({ ...a, [k]: true }), {}));
    if (!validate()) {
      setToast?.({ message: 'Please fix the errors above', type: 'error' });
      return;
    }
    if (cart.length === 0) {
      setToast?.({ message: 'Your cart is empty', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        customer:      formData,
        items:         cart,
        total:         finalTotal,
        subtotal:      subtotal,
        shippingCharge: shipping,
        discountPercent,
        discountAmount,
        paymentMethod,
        userEmail:     user.email,
        userName:      user.name || user.displayName || formData.fullName,
        createdAt:     new Date().toISOString(),
        ...((!storeDiscountPercent && activeCoupon && couponPercent > 0)
          ? { couponCode: activeCoupon, activeCoupon }
          : {}),
      };
      persistAddress();

      if (paymentMethod === 'cod') {
        const res = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...orderData, paymentStatus: 'Pending' }),
        });
        const savedOrder = await parseApiResponse(res);
        setToast?.({ message: 'Order placed successfully!', type: 'success' });
        goToSuccess({ ...orderData, ...savedOrder });
        return;
      }

      const orderRes = await fetch(`${API_BASE_URL}/api/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal }),
      });
      const order = await parseApiResponse(orderRes);
      if (!order.id) throw new Error('Order creation failed');

      const options = {
        key:         process.env.REACT_APP_RAZORPAY_KEY_ID,
        amount:      order.amount,
        currency:    'INR',
        name:        'SuperNova Store',
        description: 'Payment for Order',
        order_id:    order.id,
        handler: async (response) => {
          const saveRes = await fetch(`${API_BASE_URL}/api/orders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...orderData,
              paymentStatus: 'Paid',
              paymentId: response.razorpay_payment_id,
            }),
          });
          try {
            const savedOrder = await parseApiResponse(saveRes);
            setToast?.({ message: 'Payment successful! Order placed.', type: 'success' });
            goToSuccess({ ...orderData, ...savedOrder });
          } catch (saveErr) {
            setToast?.({ message: `Payment done but: ${saveErr.message}`, type: 'error' });
          }
        },
        prefill: { name: formData.fullName, email: formData.email, contact: formData.phone },
        theme: { color: '#c9541e' },
      };
      new window.Razorpay(options).open();

    } catch (err) {
      console.error(err);
      setToast?.({ message: err.message || 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const states = getStates();

  return (
    <div className={`co-page${darkMode ? ' co-dark' : ''}`}>
      <div className="co-container">

        <div className="co-steps" aria-label="Checkout progress">
          <div className="co-step co-step--done">
            <span className="co-step__dot">
              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
                <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className="co-step__label">Cart</span>
          </div>
          <div className="co-step__line" aria-hidden="true" />
          <div className="co-step co-step--active">
            <span className="co-step__dot">2</span>
            <span className="co-step__label">Delivery</span>
          </div>
          <div className="co-step__line" aria-hidden="true" />
          <div className="co-step">
            <span className="co-step__dot">3</span>
            <span className="co-step__label">Payment</span>
          </div>
        </div>

        <div className="co-layout">

          <div className="co-panel">
            <form className="co-form" onSubmit={handleSubmit} noValidate>

              <section className="co-section">
                <h2 className="co-section__title">Contact details</h2>
                <Field {...fp('fullName')} label="Full name" placeholder="Enter Your Name" />
                <div className="co-row">
                  <Field {...fp('email')} label="Email address" type="email" placeholder="Enter Email Id" />
                  <Field {...fp('phone')} label="Phone" type="tel" placeholder="Enter Phone Number" maxLength={10} />
                </div>
              </section>

              <section className="co-section">
                <h2 className="co-section__title">Delivery address</h2>

                {savedAddresses.length > 0 && (
                  <div className="co-address-book">
                    {savedAddresses.map((address) => (
                      <button type="button" key={address.id} onClick={() => applySavedAddress(address)}>
                        <strong>{address.label}</strong>
                        <span>{address.address}, {address.city} - {address.zipCode}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className={`co-field${errors.state && touched.state ? ' co-field--error' : ''}`}>
                  <label htmlFor="state">State</label>
                  <select id="state" name="state" value={formData.state} onChange={handleChange} onBlur={handleBlur}>
                    <option value="">Select your state</option>
                    {states.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.state && touched.state && (
                    <span className="co-error" role="alert">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <circle cx="6" cy="6" r="5.5" stroke="currentColor"/>
                        <path d="M6 4v2.5M6 8v.5" stroke="currentColor" strokeLinecap="round"/>
                      </svg>
                      {errors.state}
                    </span>
                  )}
                </div>

                <div className={`co-field${errors.city && touched.city ? ' co-field--error' : ''}`}>
                  <label htmlFor="city">
                    City
                    {!formData.state && <span className="co-field__hint"> — select state first</span>}
                  </label>
                  <select id="city" name="city" value={formData.city}
                    onChange={handleChange} onBlur={handleBlur} disabled={!formData.state}>
                    <option value="">
                      {formData.state ? `Select city in ${formData.state}` : 'Select state first'}
                    </option>
                    {cityList.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {errors.city && touched.city && (
                    <span className="co-error" role="alert">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                        <circle cx="6" cy="6" r="5.5" stroke="currentColor"/>
                        <path d="M6 4v2.5M6 8v.5" stroke="currentColor" strokeLinecap="round"/>
                      </svg>
                      {errors.city}
                    </span>
                  )}
                </div>

                <Field {...fp('address')} label="Street address" textarea
                  placeholder={formData.city ? `House no., street, area — ${formData.city}` : 'House no., street name, area…'}
                />

                <div className="co-row">
                  <div className={`co-field${errors.zipCode && touched.zipCode ? ' co-field--error' : ''}`}>
                    <label htmlFor="zipCode">
                      PIN code
                      {formData.city && formData.zipCode && <span className="co-pin-badge">auto-filled</span>}
                    </label>
                    <input id="zipCode" name="zipCode" type="text"
                      value={formData.zipCode} placeholder="6-digit PIN"
                      onChange={handleChange} onBlur={handleBlur} maxLength={6}
                    />
                    {errors.zipCode && touched.zipCode && (
                      <span className="co-error" role="alert">
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                          <circle cx="6" cy="6" r="5.5" stroke="currentColor"/>
                          <path d="M6 4v2.5M6 8v.5" stroke="currentColor" strokeLinecap="round"/>
                        </svg>
                        {errors.zipCode}
                      </span>
                    )}
                  </div>
                  <div className="co-field">
                    <label>Country</label>
                    <input value="India" readOnly />
                  </div>
                </div>

                <label className="co-save-address">
                  <input type="checkbox" checked={saveAddress} onChange={(event) => setSaveAddress(event.target.checked)} />
                  Save this address for future orders
                </label>
              </section>

              <section className="co-section">
                <h2 className="co-section__title">Payment method</h2>
                <div className="co-pay-options">

                  <label className={`co-pay-option${paymentMethod === 'online' ? ' co-pay-option--active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="online"
                      checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')}
                      className="co-pay-radio" />
                    <span className="co-pay-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
                      </svg>
                    </span>
                    <span className="co-pay-text">
                      <span className="co-pay-name">Online payment</span>
                      <span className="co-pay-desc">UPI, cards, net banking via Razorpay</span>
                    </span>
                    <span className="co-pay-check" aria-hidden="true" />
                  </label>

                  <label className={`co-pay-option${paymentMethod === 'cod' ? ' co-pay-option--active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="cod"
                      checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')}
                      className="co-pay-radio" />
                    <span className="co-pay-icon" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                      </svg>
                    </span>
                    <span className="co-pay-text">
                      <span className="co-pay-name">Cash on delivery</span>
                      <span className="co-pay-desc">Pay when your order arrives at the door</span>
                    </span>
                    <span className="co-pay-check" aria-hidden="true" />
                  </label>

                </div>

                <button type="submit" className="co-btn" disabled={loading} aria-live="polite">
                  {loading ? (
                    <><span className="co-btn__spinner" aria-hidden="true" />Processing…</>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                      {paymentMethod === 'online'
                        ? `Pay ₹${finalTotal.toLocaleString('en-IN')}`
                        : `Place order · ₹${finalTotal.toLocaleString('en-IN')}`}
                    </>
                  )}
                </button>

                <p className="co-secure-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  256-bit SSL encrypted checkout
                </p>
              </section>

            </form>
          </div>

          <aside className="co-aside">
            <div className="co-summary">
              <h2 className="co-summary__title">Order summary</h2>
              <div className="co-items">
                {cart.length === 0 ? (
                  <p className="co-empty">Your cart is empty.</p>
                ) : (
                  cart.map((item, i) => (
                    <div className="co-item" key={i}>
                      <div className="co-item__img-wrap">
                        <img
                          src={getProductImage(item)}
                          alt={item.name}
                          className="co-item__img"
                          onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                        />
                        <span className="co-item__qty-badge">{item.quantity}</span>
                      </div>
                      <div className="co-item__info">
                        <p className="co-item__name">{item.name}</p>
                        {item.selectedVariant?.label && <p className="co-item__meta">{item.selectedVariant.label}</p>}
                        {item.size && <p className="co-item__meta">Size: {item.size}</p>}
                      </div>
                      <p className="co-item__price">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="co-divider" />

              <div className="co-price-list">
                <div className="co-price-row">
                  <span>Subtotal</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="co-price-row">
                  <span>Shipping</span>
                  <span className="co-free">{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="co-price-row co-price-row--discount">
                    <span>Discount ({discountPercent}%)</span>
                    <span>−₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div className="co-total">
                <span>Total</span>
                <span className="co-total__val">₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {formData.city && formData.state && (
              <div className="co-location-card">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <div>
                  <p className="co-location-card__title">Delivering to</p>
                  <p className="co-location-card__val">{formData.city}, {formData.state} — {formData.zipCode}</p>
                </div>
              </div>
            )}

            <div className="co-info-cards">
              <div className="co-info-card">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><path d="M12 8v4l2 2"/>
                </svg>
                <div>
                  <p className="co-info-card__title">Est. delivery</p>
                  <p className="co-info-card__sub">3–5 business days</p>
                </div>
              </div>
              <div className="co-info-card">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                <div>
                  <p className="co-info-card__title">Easy returns</p>
                  <p className="co-info-card__sub">7-day return policy</p>
                </div>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default Checkout;
