import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Cart.css';

function Cart({ cart, removeFromCart, updateQuantity, discountPercent = 0 }) {
  const placeholder = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="20">No+Image</text></svg>';
  const handleImgError = (e) => { e.currentTarget.onerror = null; e.currentTarget.src = placeholder; };
  const navigate = useNavigate();

  const handleCheckout = () => {
    navigate('/checkout');
  };
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = 50;

  const discountAmount = (total * discountPercent) / 100;
  const finalTotal = total + shipping - discountAmount;

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <div className="empty-cart">
          <h2>Your cart is empty</h2>
          <p>Add some products to get started!</p>
          <Link to="/products" className="shop-btn">Shop Now</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="cart-container">
        <h1>Shopping Cart</h1>
        
        <div className="cart-content">
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="item-image">
                  <img
                    src={item.image || item.images?.[0] || placeholder}
                    alt={item.name}
                    onError={handleImgError}
                  />
                </div>
                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p className="item-category">{item.category}</p>
                  <p className="item-price">₹{item.price}</p>
                </div>
                <div className="item-quantity">
                  <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                    +
                  </button>
                </div>
                <div className="item-total">
                  <p>₹{item.price * item.quantity}</p>
                </div>
                <button 
                  className="remove-btn"
                  onClick={() => removeFromCart(item.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h2>Order Summary</h2>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{total.toFixed(2)}</span>
            </div>
            {discountPercent > 0 && (
              <div className="summary-row">
                <span>Auto‑applied Discount ({discountPercent}%)</span>
                <span className="discount-value">-₹{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Shipping:</span>
              <span>₹{shipping}</span>
            </div>
            <div className="summary-row total">
              <span>Total:</span>
              <span>₹{finalTotal.toFixed(2)}</span>
            </div>
            <button onClick={handleCheckout} className="checkout-btn">
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Cart;

