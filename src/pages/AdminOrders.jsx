import React, { useEffect, useState } from 'react';
import API_BASE_URL, { apiFetch, getAdminHeaders, parseApiResponse } from '../utils/api';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './AdminOrders.css';

function AdminOrders({ setToast }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const showToast = (message, type = 'error') => {
    if (setToast) setToast({ message, type });
    else window.alert(message);
  };

  const getCustomer = (order) => order?.customer || {};
  const fmtAddress = (cust) => {
    const parts = [
      cust.address,
      cust.city,
      cust.state,
      cust.zipCode,
      cust.country
    ].map((s) => String(s || '').trim()).filter(Boolean);
    return parts.join(', ');
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/orders');
      const payload = await parseApiResponse(res);
      const data = Array.isArray(payload) ? payload : payload.items || payload;
      const sorted = (data || []).sort(
        (a, b) => new Date(b.createdAt || b.orderDate || 0).getTime() - new Date(a.createdAt || a.orderDate || 0).getTime()
      );
      setOrders(sorted);
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const intervalId = setInterval(fetchOrders, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const updateOrderStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ status })
      });
      const updatedOrder = await parseApiResponse(res);

      setOrders((prev) =>
        prev.map((order) => (order.orderId === orderId ? updatedOrder : order))
      );
    } catch (err) {
      const message = err.message || 'Status update failed';
      showToast(message, 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const stats = {
    totalOrders: orders.length,
    pendingOrders: orders.filter((o) => String(o.status || '').toLowerCase().includes('pending') || String(o.status || '').toLowerCase().includes('processing')).length,
    deliveredOrders: orders.filter((o) => String(o.status || '').toLowerCase().includes('delivered')).length,
    revenue: orders.reduce((sum, order) => {
      const status = String(order.status || '').toLowerCase();
      if (['cancelled', 'returned', 'return requested', 'pending', 'pending - cash on delivery'].includes(status)) return sum;
      return sum + (Number(order.total) || Number(order.summary?.totalPayable) || 0);
    }, 0)
  };

  return (
    <div className="admin-orders-page">
      <div className="admin-orders-container">
        <div className="admin-orders-topbar">
          <div>
            <h1>Order Management</h1>
            <p>Track, update, and manage all customer orders.</p>
          </div>
          <button className="admin-btn admin-btn-primary" onClick={fetchOrders}>Refresh</button>
        </div>

        {!loading && !error && orders.length > 0 && (
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <small>Total Orders</small>
              <h3>{stats.totalOrders}</h3>
            </div>
            <div className="admin-stat-card">
              <small>Pending/Processing</small>
              <h3>{stats.pendingOrders}</h3>
            </div>
            <div className="admin-stat-card">
              <small>Delivered</small>
              <h3>{stats.deliveredOrders}</h3>
            </div>
            <div className="admin-stat-card">
              <small>Total Revenue</small>
              <h3>₹{stats.revenue.toLocaleString('en-IN')}</h3>
            </div>
          </div>
        )}

        {loading && <p className="admin-info-text">Loading orders…</p>}
        {error && <p className="admin-error-text">{error}</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="admin-empty-state">
            <h2>No orders found</h2>
            <p>Orders will appear here after customers place them.</p>
          </div>
        )}

        <div className="admin-orders-list">
          {orders.map((order) => (
            <div key={order.orderId} className="admin-order-card">
              <div className="admin-order-header">
                <div>
                  <h3>
                    Order ID: <span className="admin-order-id">{order.orderId}</span>
                  </h3>
                  <p className="admin-order-date">Ordered on: {new Date(order.orderDate).toLocaleString()}</p>
                </div>

                <span className={`admin-status-badge ${String(order.status || 'processing').toLowerCase().replace(/\s+/g, '-')}`}>
                  {order.status || 'processing'}
                </span>
              </div>

              <div className="admin-customer-grid">
                <div className="admin-customer-card">
                  <div className="admin-customer-title">Customer Details</div>
                  <div className="admin-customer-row">
                    <span className="admin-customer-k">Name</span>
                    <span className="admin-customer-v">{getCustomer(order).fullName || '—'}</span>
                  </div>
                  <div className="admin-customer-row">
                    <span className="admin-customer-k">Email</span>
                    <span className="admin-customer-v">{getCustomer(order).email || order.userEmail || '—'}</span>
                  </div>
                  <div className="admin-customer-row">
                    <span className="admin-customer-k">Phone</span>
                    <span className="admin-customer-v">{getCustomer(order).phone || '—'}</span>
                  </div>
                </div>

                <div className="admin-customer-card">
                  <div className="admin-customer-title">Delivery Address</div>
                  <div className="admin-customer-row">
                    <span className="admin-customer-k">Address</span>
                    <span className="admin-customer-v">{fmtAddress(getCustomer(order)) || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="admin-order-items">
                <h4>Items</h4>
                {order.items.map((item, idx) => (
                  <div key={idx} className="admin-order-item">
                    <img
                      src={getProductImage(item)}
                      alt={item.name}
                      className="admin-item-image"
                      onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                    />
                    <div className="admin-item-details">
                      <p className="admin-item-name">{item.name}</p>
                      <p className="admin-item-info">Qty: {item.quantity} × ₹{item.price} = ₹{item.quantity * item.price}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="admin-summary-box">
                <div className="admin-summary-row">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal || order.summary?.subtotal || 0}</span>
                </div>
                <div className="admin-summary-row">
                  <span>Shipping</span>
                  <span>₹{order.shippingCharge ?? order.shipping ?? order.summary?.shipping ?? 0}</span>
                </div>
                <div className="admin-summary-row total">
                  <span>Total</span>
                  <span>₹{order.total || order.summary?.totalPayable || 0}</span>
                </div>
              </div>

              <div className="admin-status-actions">
                <button
                  className="admin-btn admin-btn-outline"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Processing')}
                >
                  Processing
                </button>
                <button
                  className="admin-btn admin-btn-outline"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Shipped')}
                >
                  Shipped
                </button>
                <button
                  className="admin-btn admin-btn-outline"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Out for Delivery')}
                >
                  Out for Delivery
                </button>
                <button
                  className="admin-btn admin-btn-success"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Delivered')}
                >
                  Delivered
                </button>
                <button
                  className="admin-btn admin-btn-outline"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Return Requested')}
                >
                  Return Requested
                </button>
                <button
                  className="admin-btn admin-btn-outline"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Return Approved')}
                >
                  Approve Return
                </button>
                <button
                  className="admin-btn admin-btn-outline"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Pickup Scheduled')}
                >
                  Schedule Pickup
                </button>
                <button
                  className="admin-btn admin-btn-success"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Refund Initiated')}
                >
                  Initiate Refund
                </button>
                <button
                  className="admin-btn admin-btn-success"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Refunded')}
                >
                  Mark Refunded
                </button>
                <button
                  className="admin-btn admin-btn-danger"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Return Rejected')}
                >
                  Reject Return
                </button>
                <button
                  className="admin-btn admin-btn-outline"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Returned')}
                >
                  Returned
                </button>
                <button
                  className="admin-btn admin-btn-danger"
                  disabled={updatingId === order.orderId}
                  onClick={() => updateOrderStatus(order.orderId, 'Cancelled')}
                >
                  Cancelled
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminOrders;
