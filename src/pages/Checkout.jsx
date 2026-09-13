import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, parseApiResponse } from '../utils/api';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './Checkout.css';

const Field = ({ name, label, placeholder, type = 'text', textarea = false,
                 maxLength, value, onChange, onBlur, error, touched, readOnly, children }) => (
  <div className={`co-field${error && touched ? ' co-field--error' : ''}`}>
    <label htmlFor={name}>{label}</label>
    {children ? children : textarea ? (
      <textarea
        id={name} name={name} value={value}
        placeholder={placeholder} onChange={onChange} onBlur={onBlur}
        autoComplete="off"
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

  const [paymentMethod, setPaymentMethod] = useState('online');
  const [loading, setLoading]             = useState(false);
  const [touched, setTouched]             = useState({});
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [addressTag, setAddressTag] = useState('Home');
  const [locating, setLocating] = useState(false);

  const [formData, setFormData] = useState({
    fullName: user?.name || user?.displayName || '',
    email:    user?.email || '',
    phone:    user?.phone || '',
    address:  '',
    zipCode:  '',
    country:  'India',
  });

  const [errors, setErrors] = useState({});
  const addressStorageKey = `addresses:${user?.email || 'guest'}`;

  useEffect(() => {
    const saved = localStorage.getItem(addressStorageKey);
    if (saved) {
      try { setSavedAddresses(JSON.parse(saved)); }
      catch { localStorage.removeItem(addressStorageKey); }
    }
  }, [addressStorageKey]);

  // Auto-fill from the first saved address as soon as it loads, so the form
  // AND the map are already populated with the person's existing address.
  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId) {
      const first = savedAddresses[0];
      setSelectedAddressId(first.id);
      setFormData(prev => ({ ...prev, ...first }));
    }
  }, [savedAddresses, selectedAddressId]);

  const shipping       = 50;
  const subtotal       = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const finalTotal     = subtotal + shipping - discountAmount;
  const totalItems     = cart.reduce((s, i) => s + i.quantity, 0);

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

  const selectSavedAddress = (address) => {
    setSelectedAddressId(address.id);
    setFormData(prev => ({ ...prev, ...address }));
    setTouched({});
    setErrors({});
  };

  // Clears just the address fields so the person can type a fresh one,
  // while the form/map stay visible in place (no hide/show toggling).
  const startNewAddress = () => {
    setSelectedAddressId(null);
    setFormData(prev => ({ ...prev, address: '', zipCode: '' }));
    setAddressTag('Home');
    setTouched(prev => ({ ...prev, address: false, zipCode: false }));
    setErrors(prev => ({ ...prev, address: undefined, zipCode: undefined }));
  };

  const persistAddress = () => {
    const nextAddress = {
      id: Date.now(),
      tag: addressTag,
      label: `${formData.fullName || 'Address'} - ${formData.zipCode}`,
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      zipCode: formData.zipCode,
      country: formData.country,
    };
    const withoutDuplicate = savedAddresses.filter((item) =>
      `${item.address}-${item.zipCode}` !== `${nextAddress.address}-${nextAddress.zipCode}`
    );
    const updated = [nextAddress, ...withoutDuplicate].slice(0, 4);
    setSavedAddresses(updated);
    localStorage.setItem(addressStorageKey, JSON.stringify(updated));
    return nextAddress;
  };

  // Save the currently-filled form as an address and mark it selected ("Deliver Here")
  const handleSaveAddress = () => {
    const fieldsToCheck = ['fullName', 'email', 'phone', 'address', 'zipCode'];
    const newErrors = {};
    fieldsToCheck.forEach((k) => {
      const err = validateField(k, formData[k]);
      if (err) newErrors[k] = err;
    });
    setErrors(prev => ({ ...prev, ...newErrors }));
    setTouched(prev => ({ ...prev, fullName: true, email: true, phone: true, address: true, zipCode: true }));
    if (Object.keys(newErrors).length) {
      setToast?.({ message: 'Please complete the address fields', type: 'error' });
      return;
    }
    const saved = persistAddress();
    setSelectedAddressId(saved.id);
    setToast?.({ message: 'Address saved', type: 'success' });
  };

  // "Use my current location" — Flipkart-style geolocation + reverse geocode (OpenStreetMap, no API key needed)
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setToast?.({ message: 'Geolocation is not supported by your browser', type: 'error' });
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          const addr = data.address || {};
          const line = [addr.house_number, addr.road, addr.suburb || addr.neighbourhood, addr.city || addr.town || addr.village]
            .filter(Boolean)
            .join(', ');
          const pin = addr.postcode && /^\d{6}$/.test(addr.postcode) ? addr.postcode : '';
          setFormData(prev => ({
            ...prev,
            address: line || prev.address,
            zipCode: pin || prev.zipCode,
          }));
          setToast?.({ message: 'Location detected', type: 'success' });
        } catch {
          setToast?.({ message: 'Could not detect address. Please enter it manually.', type: 'error' });
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setToast?.({ message: 'Location permission denied. Please enter address manually.', type: 'error' });
      }
    );
  };

  const fp = (name) => ({
    name,
    value:    formData[name],
    onChange: handleChange,
    onBlur:   handleBlur,
    error:    errors[name],
    touched:  touched[name],
  });

  // Debounce the address text before it drives the map, so the map only
  // updates once the user pauses typing (real address), not on every keystroke.
  const [debouncedAddress, setDebouncedAddress] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedAddress(formData.address), 600);
    return () => clearTimeout(t);
  }, [formData.address]);

  const isMapStale  = debouncedAddress !== formData.address;
  const hasMapAddress = debouncedAddress.trim().length > 4;
  const mapQuery = hasMapAddress
    ? encodeURIComponent([debouncedAddress, formData.zipCode, formData.country].filter(Boolean).join(', '))
    : '';
  const mapSrc = hasMapAddress
    ? `https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`
    : '';

  // ── ORDER SUCCESS NAVIGATE — order data saath bhejo ──
  const goToSuccess = (savedOrder) => {
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

    navigate('/order-success', { state: { order: normalized }, replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched(Object.keys(formData).reduce((a, k) => ({ ...a, [k]: true }), {}));
    if (!validate()) {
      setToast?.({ message: 'Please fix the errors above', type: 'error' });
      return;
    }
    if (!selectedAddressId) persistAddress();
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

      if (paymentMethod === 'cod') {
        const res = await apiFetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...orderData, paymentStatus: 'Pending' }),
        });
        const savedOrder = await parseApiResponse(res);
        setToast?.({ message: 'Order placed successfully!', type: 'success' });
        goToSuccess({ ...orderData, ...savedOrder });
        return;
      }

      const orderRes = await apiFetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart,
          couponCode: activeCoupon,
        }),
      });
      const order = await parseApiResponse(orderRes);
      if (!order.id) throw new Error('Order creation failed');
      const razorpayKey = order.keyId || process.env.REACT_APP_RAZORPAY_KEY_ID;
      if (!razorpayKey || !window.Razorpay) {
        throw new Error('Online payment is not configured. Please choose Cash on Delivery or contact support.');
      }

      const options = {
        key:         razorpayKey,
        amount:      order.amount,
        currency:    'INR',
        name:        'SuperNova Store',
        description: 'Payment for Order',
        order_id:    order.id,
        handler: async (response) => {
          const saveRes = await apiFetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...orderData,
              paymentStatus: 'Paid',
              paymentId: response.razorpay_payment_id,
              paymentOrderId: response.razorpay_order_id,
              paymentSignature: response.razorpay_signature,
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
        theme: { color: '#2874f0' },
      };
      new window.Razorpay(options).open();

    } catch (err) {
      console.error(err);
      setToast?.({ message: err.message || 'Something went wrong. Please try again.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

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
                <div className="co-section__head">
                  <span className="co-section__num">1</span>
                  <h2 className="co-section__title">Contact Details</h2>
                </div>
                <Field {...fp('fullName')} label="Full name" placeholder="Enter Your Name" />
                <div className="co-row">
                  <Field {...fp('email')} label="Email address" type="email" placeholder="Enter Email Id" />
                  <Field {...fp('phone')} label="Phone" type="tel" placeholder="Enter Phone Number" maxLength={10} />
                </div>
              </section>

              <section className="co-section">
                <div className="co-section__head">
                  <span className="co-section__num">2</span>
                  <h2 className="co-section__title">Delivery Address</h2>
                </div>

                {savedAddresses.length > 0 && (
                  <div className="co-address-list">
                    {savedAddresses.map((address) => (
                      <label
                        key={address.id}
                        className={`co-address-card${selectedAddressId === address.id ? ' co-address-card--active' : ''}`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          className="co-address-radio"
                          checked={selectedAddressId === address.id}
                          onChange={() => selectSavedAddress(address)}
                        />
                        <span className="co-address-check" aria-hidden="true" />
                        <div className="co-address-card__body">
                          <div className="co-address-card__top">
                            <span className="co-address-tag">{(address.tag || 'HOME').toUpperCase()}</span>
                            <strong>{address.fullName}</strong>
                            <span className="co-address-phone">{address.phone}</span>
                          </div>
                          <p className="co-address-text">
                            {address.address}, {address.zipCode}, {address.country}
                          </p>
                        </div>
                      </label>
                    ))}
                    <button
                      type="button"
                      className="co-add-address-btn"
                      onClick={startNewAddress}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                        <path d="M12 5v14M5 12h14"/>
                      </svg>
                      Add New Address
                    </button>
                  </div>
                )}

                <div className="co-address-form-block">
                    {selectedAddressId && (
                      <p className="co-address-form-hint">Editing: <strong>{(addressTag || 'Home')}</strong> address — changes update the address above.</p>
                    )}
                    <Field {...fp('address')} label="Street address" textarea
                      placeholder="House no., building, street, area, landmark…"
                    />

                    <button
                      type="button"
                      className="co-locate-btn"
                      onClick={useCurrentLocation}
                      disabled={locating}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                      {locating ? 'Detecting your location…' : 'Use my current location'}
                    </button>

                    <div className="co-address-map">
                      {hasMapAddress ? (
                        <>
                          <iframe
                            title="Delivery address map"
                            src={mapSrc}
                            loading="lazy"
                            allowFullScreen
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                          {isMapStale && <span className="co-map-updating">Updating map…</span>}
                        </>
                      ) : (
                        <div className="co-map-placeholder">
                          <p>Type your delivery address and the map will update automatically.</p>
                        </div>
                      )}
                    </div>

                    <div className="co-row">
                      <div className={`co-field${errors.zipCode && touched.zipCode ? ' co-field--error' : ''}`}>
                        <label htmlFor="zipCode">
                          PIN code
                          {formData.zipCode && <span className="co-pin-badge">auto-filled</span>}
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

                    <div className="co-field">
                      <label>Address type</label>
                      <div className="co-tag-choices">
                        {['Home', 'Work'].map((t) => (
                          <button
                            type="button"
                            key={t}
                            className={`co-tag-choice${addressTag === t ? ' co-tag-choice--active' : ''}`}
                            onClick={() => setAddressTag(t)}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="co-address-form-actions">
                      <button type="button" className="co-btn co-btn--deliver" onClick={handleSaveAddress}>
                        Save &amp; Deliver Here
                      </button>
                      {savedAddresses.length > 0 && !selectedAddressId && (
                        <button
                          type="button"
                          className="co-btn-text"
                          onClick={() => selectSavedAddress(savedAddresses[0])}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                </div>
              </section>

              <section className="co-section">
                <div className="co-section__head">
                  <span className="co-section__num">3</span>
                  <h2 className="co-section__title">Payment Options</h2>
                </div>
                <div className="co-pay-options">

                  <label className={`co-pay-option${paymentMethod === 'online' ? ' co-pay-option--active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="online"
                      checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')}
                      className="co-pay-radio" />
                    <span className="co-pay-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="16" height="16" rx="2"/><path d="M9 9h.01M9 15h.01M15 9h6M15 15h6M4 12h16" opacity="0"/>
                        <path d="M8 5v4M16 5v4"/>
                      </svg>
                    </span>
                    <span className="co-pay-text">
                      <span className="co-pay-name">UPI</span>
                      <span className="co-pay-desc">Pay via any UPI app — GPay, PhonePe, Paytm</span>
                    </span>
                    <span className="co-pay-check" aria-hidden="true" />
                  </label>

                  <label className={`co-pay-option${paymentMethod === 'online' ? ' co-pay-option--active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="online"
                      checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')}
                      className="co-pay-radio" />
                    <span className="co-pay-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20"/>
                      </svg>
                    </span>
                    <span className="co-pay-text">
                      <span className="co-pay-name">Credit / Debit Card</span>
                      <span className="co-pay-desc">Visa, Mastercard, RuPay &amp; more</span>
                    </span>
                    <span className="co-pay-check" aria-hidden="true" />
                  </label>

                  <label className={`co-pay-option${paymentMethod === 'online' ? ' co-pay-option--active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="online"
                      checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')}
                      className="co-pay-radio" />
                    <span className="co-pay-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 21h18M4 21V9l8-6 8 6v12M9 21v-6h6v6"/>
                      </svg>
                    </span>
                    <span className="co-pay-text">
                      <span className="co-pay-name">Net Banking</span>
                      <span className="co-pay-desc">All major Indian banks supported</span>
                    </span>
                    <span className="co-pay-check" aria-hidden="true" />
                  </label>

                  <label className={`co-pay-option${paymentMethod === 'cod' ? ' co-pay-option--active' : ''}`}>
                    <input type="radio" name="paymentMethod" value="cod"
                      checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')}
                      className="co-pay-radio" />
                    <span className="co-pay-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 11l19-9-9 19-2-8-8-2z"/>
                      </svg>
                    </span>
                    <span className="co-pay-text">
                      <span className="co-pay-name">Cash on Delivery</span>
                      <span className="co-pay-desc">Pay when your order arrives at the door</span>
                    </span>
                    <span className="co-pay-check" aria-hidden="true" />
                  </label>

                </div>

                <button type="submit" className="co-btn co-btn--place" disabled={loading} aria-live="polite">
                  {loading ? (
                    <><span className="co-btn__spinner" aria-hidden="true" />Processing…</>
                  ) : (
                    <>
                      {paymentMethod === 'online'
                        ? `PAY ₹${finalTotal.toLocaleString('en-IN')}`
                        : `PLACE ORDER · ₹${finalTotal.toLocaleString('en-IN')}`}
                    </>
                  )}
                </button>

                <p className="co-secure-note">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Safe and Secure Payments. 100% Authentic products.
                </p>
              </section>

            </form>
          </div>

          <aside className="co-aside">
            <div className="co-summary">
              <h2 className="co-summary__title">PRICE DETAILS</h2>
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
                  <span>Price ({totalItems} {totalItems === 1 ? 'item' : 'items'})</span>
                  <span>₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                {discountPercent > 0 && (
                  <div className="co-price-row co-price-row--discount">
                    <span>Discount ({discountPercent}%)</span>
                    <span>− ₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="co-price-row">
                  <span>Delivery Charges</span>
                  <span className="co-free">{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                </div>
              </div>

              <div className="co-total">
                <span>Total Amount</span>
                <span className="co-total__val">₹{finalTotal.toLocaleString('en-IN')}</span>
              </div>

              {discountAmount > 0 && (
                <p className="co-savings-banner">
                  You will save ₹{discountAmount.toLocaleString('en-IN')} on this order
                </p>
              )}
            </div>

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