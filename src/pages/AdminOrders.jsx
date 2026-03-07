import React, { useEffect, useState } from 'react';
import './Orders.css';

const placeholderImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="20">No+Image</text></svg>';

function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5000/api/orders');
      if (!res.ok) throw new Error('Failed to fetch orders');
      const data = await res.json();
      setOrders(data);
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="orders-page">
      <div className="orders-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>Admin — Orders</h1>
          <div>
            <button className="btn btn-primary" onClick={fetchOrders} style={{ marginRight: 8 }}>Refresh</button>
          </div>
        </div>

        {loading && <p>Loading orders…</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="empty-orders">
            <h2>No orders found</h2>
            <p>Orders will appear here after customers place them.</p>
          </div>
        )}

        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.orderId} className="order-card">
              <div className="order-header">
                <div>
                  <h3>
                    Order ID: <span className="order-id">{order.orderId}</span>
                  </h3>
                  <p className="order-date">Ordered on: {new Date(order.orderDate).toLocaleString()}</p>
                </div>

                <span className={`status-badge ${order.status || 'processing'}`}>
                  {order.status || 'processing'}
                </span>
              </div>

              <div style={{ marginTop: 8 }}>
                <strong>Customer:</strong>{' '}
                {order.customer ? `${order.customer.fullName || ''} — ${order.customer.email || ''}` : 'N/A'}
              </div>

              <div className="order-items">
                <h4>Items:</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="order-item">
                    <img
                      src={item.image || item.images?.[0] || placeholderImg}
                      alt={item.name}
                      className="order-item-image"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderImg; }}
                    />
                    <div className="order-item-details">
                      <p className="order-item-name">{item.name}</p>
                      <p className="order-item-info">Qty: {item.quantity} × ₹{item.price} = ₹{item.quantity * item.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="order-summary">
                <div className="summary-row">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal}</span>
                </div>
                <div className="summary-row">
                  <span>Shipping</span>
                  <span>₹{order.shipping}</span>
                </div>
                <div className="summary-row total-row">
                  <span>Total</span>
                  <span>₹{order.total}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminOrders;
