import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Truck, Tag, ChevronRight, ShoppingBag, MapPin, User, Mail, Phone, Home } from 'lucide-react';
import './Checkout.css';

function Checkout({ cart, clearCart, user, discountPercent = 0, addOrder }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India'
  });

  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState('');

  const shipping = 50;
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal + shipping - discountAmount;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { alert('Pehle Login karein!'); navigate('/login'); return; }
    if (cart.length === 0) { alert('Cart khali hai!'); navigate('/'); return; }

    setLoading(true);
    try {
      const orderRes = await fetch('http://localhost:5005/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal })
      });
      const order = await orderRes.json();

      const options = {
        key: 'rzp_live_SOCR2jNHefoYoj',
        amount: order.amount,
        currency: 'INR',
        name: 'SuperNova Store',
        description: 'Order Payment',
        order_id: order.id,
        handler: async function (response) {
          const orderPayload = {
            customer: formData,
            userEmail: user.email || user,
            items: cart.map(item => ({
              id: item.id, name: item.name, price: item.price,
              quantity: item.quantity,
              image: item.images ? item.images[0] : item.image
            })),
            paymentId: response.razorpay_payment_id,
            summary: { subtotal, shipping, discount: discountAmount, totalPayable: finalTotal },
            status: 'Paid',
            createdAt: new Date().toISOString()
          };
          const res = await fetch('http://localhost:5005/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderPayload)
          });
          if (res.ok) {
            const savedOrder = await res.json();
            if (addOrder) addOrder(savedOrder);
            if (clearCart) clearCart();
            localStorage.removeItem('cart');
            navigate('/order-success', { state: { order: savedOrder } });
          } else { alert('Order save nahi hua'); }
        },
        prefill: { name: formData.fullName, email: formData.email, contact: formData.phone },
        theme: { color: '#000000' },
        modal: { ondismiss: () => setLoading(false) }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Payment start nahi ho raha');
      setLoading(false);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="co-page">
      <div className="co-wrapper">

        {/* ════ LEFT ════ */}
        <div className="co-left">

          {/* Top bar */}
          <div className="co-topbar">
            <div className="co-brand">
              <div className="co-brand-icon"><ShoppingBag size={16} /></div>
              SuperNova Store
            </div>
            <button className="co-back-btn" onClick={() => navigate(-1)}>← Back to Cart</button>
          </div>

          {/* Steps indicator */}
          <div className="co-steps">
            <div className="co-step done">
              <span className="co-step-num">✓</span>
              <span className="co-step-label">Cart</span>
            </div>
            <div className="co-step-line done"></div>
            <div className="co-step active">
              <span className="co-step-num">2</span>
              <span className="co-step-label">Details</span>
            </div>
            <div className="co-step-line"></div>
            <div className="co-step">
              <span className="co-step-num">3</span>
              <span className="co-step-label">Payment</span>
            </div>
          </div>

          <h1 className="co-title">Delivery Details</h1>

          <form className="co-form" onSubmit={handleSubmit}>

            {/* ── Contact ── */}
            <div className="co-card">
              <div className="co-card-header">
                <User size={16} />
                Contact Information
              </div>

              <div className="co-field-wrap">
                <div className={`co-field ${focused === 'fullName' || formData.fullName ? 'active' : ''}`}>
                  <label>Full Name</label>
                  <input
                    type="text" name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    onFocus={() => setFocused('fullName')}
                    onBlur={() => setFocused('')}
                    placeholder="Rahul Sharma"
                    required
                  />
                </div>
              </div>

              <div className="co-row">
                <div className="co-field-wrap">
                  <div className={`co-field ${focused === 'email' || formData.email ? 'active' : ''}`}>
                    <label>Email Address</label>
                    <input
                      type="email" name="email"
                      value={formData.email}
                      onChange={handleChange}
                      onFocus={() => setFocused('email')}
                      onBlur={() => setFocused('')}
                      placeholder="rahul@email.com"
                      required
                    />
                  </div>
                </div>
                <div className="co-field-wrap">
                  <div className={`co-field ${focused === 'phone' || formData.phone ? 'active' : ''}`}>
                    <label>Phone Number</label>
                    <input
                      type="tel" name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      onFocus={() => setFocused('phone')}
                      onBlur={() => setFocused('')}
                      placeholder="+91 98765 43210"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ── Address ── */}
            <div className="co-card">
              <div className="co-card-header">
                <MapPin size={16} />
                Shipping Address
              </div>

              <div className="co-field-wrap">
                <div className={`co-field ${focused === 'address' || formData.address ? 'active' : ''}`}>
                  <label>Street Address</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    onFocus={() => setFocused('address')}
                    onBlur={() => setFocused('')}
                    placeholder="House no, Street name, Area, Landmark"
                    required
                  />
                </div>
              </div>

              <div className="co-row">
                <div className="co-field-wrap">
                  <div className={`co-field ${focused === 'city' || formData.city ? 'active' : ''}`}>
                    <label>City</label>
                    <input
                      type="text" name="city"
                      value={formData.city}
                      onChange={handleChange}
                      onFocus={() => setFocused('city')}
                      onBlur={() => setFocused('')}
                      placeholder="Mumbai"
                      required
                    />
                  </div>
                </div>
                <div className="co-field-wrap">
                  <div className={`co-field ${focused === 'state' || formData.state ? 'active' : ''}`}>
                    <label>State</label>
                    <input
                      type="text" name="state"
                      value={formData.state}
                      onChange={handleChange}
                      onFocus={() => setFocused('state')}
                      onBlur={() => setFocused('')}
                      placeholder="Maharashtra"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="co-field-wrap">
                <div className="co-field active">
                  <label>Country</label>
                  <input type="text" name="country" value="India" readOnly />
                </div>
              </div>
            </div>

            {/* ── Trust ── */}
            <div className="co-trust-row">
              <div className="co-trust-item">
                <ShieldCheck size={16} />
                <span>100% Secure</span>
              </div>
              <div className="co-trust-item">
                <Truck size={16} />
                <span>Fast Delivery</span>
              </div>
              <div className="co-trust-item">
                <Tag size={16} />
                <span>Best Price</span>
              </div>
            </div>

            {/* ── Pay Button ── */}
            <button type="submit" className="co-pay-btn" disabled={loading}>
              {loading ? (
                <><span className="co-spinner"></span> Processing...</>
              ) : (
                <>
                  <span>Proceed to Pay</span>
                  <div className="co-pay-right">
                    <span className="co-pay-amount">₹{finalTotal.toLocaleString('en-IN')}</span>
                    <ChevronRight size={18} />
                  </div>
                </>
              )}
            </button>

          </form>
        </div>

        {/* ════ RIGHT: Summary ════ */}
        <div className="co-right">
          <div className="co-summary-box">

            <div className="co-summary-header">
              <h2>Order Summary</h2>
              <span className="co-item-badge">{totalItems} item{totalItems !== 1 ? 's' : ''}</span>
            </div>

            {/* Items */}
            <div className="co-items-list">
              {cart.length === 0 ? (
                <p className="co-empty">Cart is empty</p>
              ) : (
                cart.map((item, i) => (
                  <div className="co-item" key={i}>
                    <div className="co-item-img">
                      <img
                        src={item.images?.[0] || item.image || ''}
                        alt={item.name}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                      <span className="co-item-qty-badge">{item.quantity}</span>
                    </div>
                    <div className="co-item-info">
                      <p className="co-item-name">{item.name}</p>
                      <p className="co-item-meta">{item.category} · Qty: {item.quantity}</p>
                    </div>
                    <span className="co-item-price">
                      ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="co-divider" />

            {/* Price breakdown */}
            <div className="co-price-rows">
              <div className="co-price-row">
                <span>Price ({totalItems} item{totalItems !== 1 ? 's' : ''})</span>
                <span>₹{subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="co-price-row">
                <span>Delivery Charges</span>
                <span className="co-green">₹{shipping}</span>
              </div>
              {discountAmount > 0 && (
                <div className="co-price-row co-discount">
                  <span>Discount ({discountPercent}%)</span>
                  <span>− ₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>

            <div className="co-divider" />

            <div className="co-total-row">
              <span>Total Amount</span>
              <span>₹{finalTotal.toLocaleString('en-IN')}</span>
            </div>

            <p className="co-saving-note">
              {discountAmount > 0
                ? `🎉 You save ₹${discountAmount.toLocaleString('en-IN')} on this order!`
                : '✓ Inclusive of all taxes & charges'}
            </p>

            {/* Safe checkout note */}
            <div className="co-secure-note">
              <ShieldCheck size={14} />
              Safe & Secure payments. Easy returns. 100% Authentic.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Checkout;