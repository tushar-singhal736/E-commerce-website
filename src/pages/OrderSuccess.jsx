import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './OrderSuccess.css';

function OrderSuccess() {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  // Order data — pehle navigate state se lo, phir localStorage fallback
  const stateOrder = location.state?.order;
  let order = stateOrder;

  if (!order) {
    try {
      const savedOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      order = savedOrders.length > 0 ? savedOrders[0] : null; // latest order = index 0
    } catch (e) {
      order = null;
    }
  }

  const total = order?.summary?.totalPayable ?? order?.total ?? 0;
  const discount = order?.summary?.discount ?? order?.discountAmount ?? 0;
  const orderedOn = order?.date || order?.createdAt || order?.orderDate;

  const [showPlayButton, setShowPlayButton] = useState(false);

  // Audio Chime
  const playChime = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      const ctx = new AudioCtx();
      const master = ctx.createGain();
      master.gain.value = 0.0001;
      master.connect(ctx.destination);
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99];

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
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    if (order) {
      (async () => {
        const ok = await playChime();
        if (!ok) setShowPlayButton(true);
      })();
      
      // Countdown timer
      const countdownTimer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            navigate('/', { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Auto redirect to home after 5 seconds with replace to prevent back button issue
      const redirectTimer = setTimeout(() => {
        navigate('/', { replace: true });
      }, 5000);
      
      return () => {
        clearTimeout(redirectTimer);
        clearInterval(countdownTimer);
      };
    }
  }, [order, navigate]);

  if (!order) {
    return (
      <div className="order-success-page">
        <div className="order-success-card">
          <h1>Order Confirmation</h1>
          <p style={{ color: 'var(--text-color)', opacity: 0.7, margin: '0.5rem 0 1.5rem' }}>
            No recent order found.
          </p>
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
        <p className="order-id">
          Order ID: <strong>{order.orderId}</strong>
        </p>
        
        {order && (
          <p style={{ color: 'var(--text-color)', opacity: 0.6, fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Redirecting to home in <strong>{countdown}</strong> seconds...
          </p>
        )}

        <div className="order-summary">
          <p>Amount Paid: <strong>₹{Number(total).toLocaleString('en-IN')}</strong></p>
          {discount > 0 && (
            <p className="discount">
              Discount Applied: <strong>−₹{Number(discount).toLocaleString('en-IN')}</strong>
            </p>
          )}
          <p>
            Ordered On:{' '}
            {orderedOn
              ? new Date(orderedOn).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : new Date().toLocaleString('en-IN')}
          </p>
          {order.paymentMethod && (
            <p>Payment: <strong>{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</strong></p>
          )}
        </div>

        <div className="items-list">
          <h3>Items Ordered:</h3>
          {order.items && order.items.length > 0 ? (
            <>
              {order.items.slice(0, 5).map((it, idx) => (
                <div key={idx} className="item-row">
                  <img
                    src={getProductImage(it)}
                    alt={it.name}
                    onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                  />
                  <div className="item-details">
                    <div className="name">{it.name}</div>
                    <div className="qty">
                      Qty: {it.quantity} × ₹{Number(it.price).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="item-total">
                    ₹{(it.quantity * it.price).toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
              {order.items.length > 5 && (
                <div className="more">+{order.items.length - 5} more items</div>
              )}
            </>
          ) : (
            <p style={{ color: 'var(--text-color)', opacity: 0.6, fontSize: '0.9rem' }}>
              No items found.
            </p>
          )}
        </div>

        <div className="actions">
          <button className="primary" onClick={() => navigate('/')}>
            Continue Shopping
          </button>
          <button className="secondary-btn" onClick={() => navigate('/orders')}>
            View My Orders
          </button>
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
