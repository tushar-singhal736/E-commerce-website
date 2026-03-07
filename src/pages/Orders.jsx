import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./Orders.css";

// fallback data URI for missing images
const placeholderImg = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="20">No+Image</text></svg>';

function Orders({ orders, returnOrder, cancelOrder, submitFeedback }) {
  const location = useLocation();
  const [productsMap, setProductsMap] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [ratings, setRatings] = useState({});
  const [modalType, setModalType] = useState(null); // 'cancel' or 'return'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (location.state?.openOrderId) {
      setExpanded(location.state.openOrderId);
    }
  }, [location.state]);

  // load products so missing order item images can be resolved
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('http://localhost:5001/api/products');
        const data = await res.json();
        if (!mounted) return;
        const map = {};
        data.forEach(p => { map[p.id] = p; });
        setProductsMap(map);
      } catch (err) {
        console.error('Failed to load products for images', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric", month: "long", year: "numeric"
    });
  };

  const getOrderStatus = (order) => {
    if (order.status === "returned") return "Returned";
    if (order.status === "cancelled") return "Cancelled";
    const days = Math.floor((new Date() - new Date(order.orderDate)) / (1000 * 60 * 60 * 24));
    if (days >= 7) return "Delivered";
    if (days >= 3) return "Shipped";
    return "Processing";
  };

  const handleRating = (orderId, rate) => {
    setRatings({ ...ratings, [orderId]: rate });
    // In a real app, call submitFeedback(orderId, rate)
  };

  const openModal = (e, order, type) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setModalType(type);
  };

  const handleActionConfirm = () => {
    if (!reason) return alert("Please select a reason");
    if (modalType === 'cancel') {
      cancelOrder(selectedOrder.orderId, reason);
    } else {
      returnOrder(selectedOrder.orderId, reason);
    }
    setModalType(null);
    setReason("");
  };

  const downloadInvoice = (order) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("INVOICE", 105, 20, { align: "center" });
    // ... (Your existing PDF logic is fine)
    doc.save(`Invoice_${order.orderId.slice(-6)}.pdf`);
  };

  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1 className="page-title">My Orders</h1>
        
        <div className="orders-list">
          {orders.map((order) => {
            const status = getOrderStatus(order);
            const isOpen = expanded === order.orderId;
            const isCancelled = status === "Cancelled";
            const isReturned = status === "Returned";

            return (
              <div key={order.orderId} className={`order-card ${isOpen ? 'active' : ''} ${isCancelled ? 'cancelled-card' : ''}`}>
                <div className="order-summary-header" onClick={() => setExpanded(isOpen ? null : order.orderId)}>
                  <div className="main-info">
                    <span className="order-no">Order #{order.orderId.slice(-6).toUpperCase()}</span>
                    <span className="order-date">Placed on {formatDate(order.orderDate)}</span>
                  </div>
                  <div className="status-group">
                    <span className={`status-badge ${status.toLowerCase()}`}>{status}</span>
                    <i className={`chevron-icon ${isOpen ? 'rotate' : ''}`}>▼</i>
                  </div>
                </div>

                {isOpen && (
                  <div className="order-details-content">
                    {/* Professional Tracking */}
                    {!isCancelled && !isReturned && (
                      <div className="tracking-section">
                        <h4>Track Order</h4>
                        <div className="stepper-container">
                          <div className={`step-item ${status !== '' ? 'completed' : ''}`}>
                            <div className="step-dot"></div>
                            <p>Ordered</p>
                          </div>
                          <div className={`step-item ${['Shipped', 'Delivered'].includes(status) ? 'completed' : status === 'Processing' ? 'active' : ''}`}>
                            <div className="step-dot"></div>
                            <p>Shipped</p>
                          </div>
                          <div className={`step-item ${status === 'Delivered' ? 'completed' : ''}`}>
                            <div className="step-dot"></div>
                            <p>Delivered</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="items-list">
                      {order.items.map((item, idx) => {
                        const img = item.image || item.images?.[0] || productsMap[item.id]?.images?.[0] || placeholderImg;
                        return (
                          <div key={idx} className="item-row">
                            <img
                              src={img}
                              alt={item.name}
                              className="product-img"
                              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholderImg; }}
                            />
                            <div className="item-info">
                              <p className="item-name">{item.name}</p>
                              <p className="item-meta">Qty: {item.quantity} | ₹{item.price}</p>
                            </div>
                            <div className="item-total">₹{item.quantity * item.price}</div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="order-footer-grid">
                      <div className="feedback-box">
                        <p>Rate your experience</p>
                        <div className="stars">
                          {[1, 2, 3, 4, 5].map(s => (
                            <span key={s} className={ratings[order.orderId] >= s ? 'star active' : 'star'} 
                                  onClick={() => handleRating(order.orderId, s)}>★</span>
                          ))}
                        </div>
                      </div>

                      <div className="action-area">
                        <button className="btn-secondary" onClick={(e) => downloadInvoice(order)}>Invoice</button>
                        
                        {status === "Processing" && (
                          <button className="btn-danger" onClick={(e) => openModal(e, order, 'cancel')}>Cancel Order</button>
                        )}
                        
                        {status === "Delivered" && (
                          <button className="btn-outline" onClick={(e) => openModal(e, order, 'return')}>Return Items</button>
                        )}
                      </div>
                    </div>
                    
                    <div className="grand-total-row">
                      {order.discountPercent > 0 && (
                        <span className="discount-value">Discount: -₹{(order.discountAmount||0).toFixed(2)}</span>
                      )}
                      <span>Total Paid: <strong>₹{order.total}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Cancel/Return Modal */}
      {modalType && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>{modalType === 'cancel' ? 'Cancel Order' : 'Return Order'}</h3>
            <p>Reason for {modalType}:</p>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason</option>
              <option value="Changed my mind">Changed my mind</option>
              <option value="Found better price">Found better price</option>
              <option value="Delayed delivery">Delayed delivery</option>
              <option value="Damaged product">Damaged/Wrong product</option>
            </select>
            <div className="modal-btns">
              <button className="btn-text" onClick={() => setModalType(null)}>Close</button>
              <button className="btn-confirm" onClick={handleActionConfirm}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;