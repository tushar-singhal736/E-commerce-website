import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './Cart.css';

function Cart({ cart, removeFromCart, updateQuantity, discountPercent = 0, activeCoupon, applyCoupon, removeCoupon }) {
  const [couponCode, setCouponCode] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
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
              <div key={item.cartKey || item.id} className="cart-item">
                <div className="item-image">
                  <img
                    src={getProductImage(item)}
                    alt={item.name}
                    onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                  />
                </div>
                <div className="item-details">
                  <h3>{item.name}</h3>
                  <p className="item-category">{item.category}</p>
                  {item.selectedVariant?.label && <p className="item-category">{item.selectedVariant.label}</p>}
                  <p className="item-price">₹{item.price}</p>
                </div>
                <div className="item-quantity">
                  <button onClick={() => updateQuantity(item.cartKey || item.id, item.quantity - 1)}>
                    -
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cartKey || item.id, item.quantity + 1)}
                    disabled={item.quantity >= 10}
                    title={item.quantity >= 10 ? 'Maximum 10 units per item' : 'Add one more'}
                  >
                    +
                  </button>
                </div>
                <div className="item-total">
                  <p>₹{item.price * item.quantity}</p>
                </div>
                <button 
                  className="remove-btn"
                  onClick={() => removeFromCart(item.cartKey || item.id)}
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
            <div className="coupon-box">
              <label>Coupon code</label>
              {activeCoupon ? (
                <div className="coupon-applied">
                  <span>{activeCoupon}</span>
                  <button type="button" onClick={removeCoupon}>Remove</button>
                </div>
              ) : (
                <div className="coupon-entry">
                  <input
                    value={couponCode}
                    placeholder="WELCOME15"
                    onChange={(event) => setCouponCode(event.target.value)}
                  />
                  <button
                    type="button"
                    disabled={couponLoading}
                    onClick={async () => {
                      setCouponLoading(true);
                      try {
                        const ok = await applyCoupon?.(couponCode);
                        if (ok) setCouponCode('');
                      } finally {
                        setCouponLoading(false);
                      }
                    }}
                  >
                    {couponLoading ? 'Applying…' : 'Apply'}
                  </button>
                </div>
              )}
            </div>
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
