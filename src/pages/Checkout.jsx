import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
    zipCode: '', 
    country: 'India'
  });

  const shipping = 50;

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = (subtotal * discountPercent) / 100;
  const finalTotal = subtotal + shipping - discountAmount;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!user) {
      alert('Order karne ke liye pehle Login karein!');
      navigate('/login');
      return;
    }

    if (cart.length === 0) {
      alert('Aapka cart khali hai!');
      navigate('/');
      return;
    }

    try {

      // 1️⃣ Razorpay order create
      const orderRes = await fetch('http://localhost:5005/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: finalTotal })
      });

      const order = await orderRes.json();

      // 2️⃣ Razorpay options
      const options = {
        key: "rzp_live_SOCR2jNHefoYoj",
        amount: order.amount,
        currency: "INR",
        name: "SuperNova Store",
        description: "Order Payment",
        order_id: order.id,

        handler: async function (response) {

          const orderPayload = {
            customer: formData,
            userEmail: user.email || user,
            items: cart.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.images ? item.images[0] : item.image
            })),
            paymentId: response.razorpay_payment_id,
            summary: {
              subtotal: subtotal,
              shipping: shipping,
              discount: discountAmount,
              totalPayable: finalTotal
            },
            status: "Paid",
            createdAt: new Date().toISOString()
          };

          // 3️⃣ Save order in backend
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

            alert("🎉 Payment Successful!");

            navigate('/order-success', { state: { order: savedOrder } });

          } else {
            alert("Order save nahi hua");
          }

        },

        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone
        },

        theme: {
          color: "#3399cc"
        }

      };

      // 4️⃣ Razorpay popup open
      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {

      console.error(err);
      alert("Payment start nahi ho raha");

    }

  };

  return (

    <div className="checkout-page">

      <div className="checkout-container">

        <h1>Complete Your Order</h1>

        <form className="checkout-form" onSubmit={handleSubmit}>

          <input type="text" name="fullName" placeholder="Full Name" onChange={handleChange} required />

          <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required />

          <input type="tel" name="phone" placeholder="Phone Number" onChange={handleChange} required />

          <textarea name="address" placeholder="Address" onChange={handleChange} required />

          <div className="form-row">

            <input type="text" name="city" placeholder="City" onChange={handleChange} required />

            <input type="text" name="state" placeholder="State" onChange={handleChange} required />

          </div>

          <div className="form-row">

            <input type="text" name="zipCode" placeholder="Zip Code" onChange={handleChange} required />

            <input type="text" name="country" value={formData.country} readOnly />

          </div>

          <button type="submit" className="continue-btn">
            Pay Now - ₹{finalTotal}
          </button>

        </form>

      </div>

    </div>

  );

}

export default Checkout;