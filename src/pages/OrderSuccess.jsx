import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './OrderSuccess.css';

function OrderSuccess() {
  const placeholderImg = 'https://via.placeholder.com/60?text=No+Image';
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Logic to get Order Data
  const stateOrder = location.state && location.state.order;
  let order = stateOrder;

  // Fallback: Agar state mein nahi hai toh localStorage se last order uthayein
  if (!order) {
    try {
      const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      order = savedOrders.length > 0 ? savedOrders[savedOrders.length - 1] : null;
    } catch (e) {
      order = null;
    }
  }

  // 2. Calculation logic based on your backend structure
  const total = order?.summary?.totalPayable ?? order?.total ?? 0;
  const [showPlayButton, setShowPlayButton] = useState(false);

  // 3. Audio Chime Logic (Aapka advanced sound code)
  const playChime = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5

      const delay = ctx.createDelay();
      delay.delayTime.value = 0.18;
      const fb = ctx.createGain();
      fb.gain.value = 0.25;
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(master);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 7200;
      lp.connect(delay);

      freqs.forEach((f, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = i === 1 ? 'triangle' : 'sine';
        o.frequency.value = f * (1 + (i === 1 ? -0.005 : 0.004));
        g.gain.setValueAtTime(0, now + i * 0.12);
        g.gain.linearRampToValueAtTime(0.12, now + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 1.1);
        o.connect(g);
        g.connect(lp);
        o.start(now + i * 0.12);
        o.stop(now + i * 0.12 + 1.15);
      });

      master.gain.setValueAtTime(0.0001, now);
      master.gain.linearRampToValueAtTime(1, now + 0.01);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 2);

      setTimeout(() => { try { ctx.close(); } catch (e) {} }, 2400);
      return true;
    } catch (e) { return false; }
  };

  useEffect(() => {
    if (order) {
      (async () => {
        const ok = await playChime();
        if (!ok) setShowPlayButton(true);
      })();
    }
  }, [order]);

  if (!order) {
    return (
      <div className="order-success-page">
        <div className="order-success-card">
          <h1>Order Confirmation</h1>
          <p>No recent order found.</p>
          <div className="actions">
            <button className="primary" onClick={() => navigate('/')}>Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="order-success-page">
      <div className="order-success-card">
        <div className="success-icon">✅</div>
        <h1>Order Placed Successfully!</h1>
        <p className="order-id">Order ID: <strong>{order.orderId}</strong></p>

        <div className="order-summary">
          <p>Amount Paid: <strong>₹{total}</strong></p>
          {order.summary?.discount > 0 && (
            <p className="discount">Discount Applied: <strong>−₹{order.summary.discount}</strong></p>
          )}
          <p>Ordered On: {order.date || new Date().toLocaleString()}</p>
        </div>

        <div className="items-list">
          <h3>Items Ordered:</h3>
          {order.items && order.items.slice(0, 5).map((it, idx) => (
            <div key={idx} className="item-row">
              <img 
                src={it.image || placeholderImg} 
                alt={it.name}
                onError={(e) => { e.target.src = placeholderImg; }} 
              />
              <div className="item-details">
                <div className="name">{it.name}</div>
                <div className="qty">Qty: {it.quantity} × ₹{it.price}</div>
              </div>
            </div>
          ))}
          {order.items && order.items.length > 5 && (
            <div className="more">+{order.items.length - 5} more items</div>
          )}
        </div>

        <div className="actions">
          <button className="primary" onClick={() => navigate('/')}>Continue Shopping</button>
          {showPlayButton && (
            <button className="secondary-btn" onClick={() => { playChime(); setShowPlayButton(false); }}>
              🔊 Play Chime
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OrderSuccess;