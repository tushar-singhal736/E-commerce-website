import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    password: '',
  });

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignup) {
      localStorage.setItem('user', JSON.stringify(formData));
      alert('Account Created! Please Login.');
      setIsSignup(false);
    } else {
      const savedUser = JSON.parse(localStorage.getItem('user'));
      if (savedUser && savedUser.email === formData.email && savedUser.password === formData.password) {
        if (onLogin) onLogin(savedUser);
        navigate('/profile');
      } else {
        alert('Invalid Credentials');
      }
    }
  };

  return (
    <div className="main-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{isSignup ? 'Start your journey with SuperNova' : 'Login to your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignup && (
            <>
              <input type="text" name="fullName" placeholder="Full Name" onChange={handleChange} required />
              <input type="date" name="dateOfBirth" title="Date of Birth" onChange={handleChange} required />
              <input type="tel" name="phone" placeholder="Phone Number" onChange={handleChange} required />
            </>
          )}

          <input type="email" name="email" placeholder="Email Address" onChange={handleChange} required />
          <input type="password" name="password" placeholder="Password" onChange={handleChange} required />

          <button type="submit" className="action-btn">
            {isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="toggle-section">
          <p>
            {isSignup ? "Already have an account?" : "Don't have an account?"}
            <span onClick={() => setIsSignup(!isSignup)}>
              {isSignup ? ' Login' : ' Signup'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;