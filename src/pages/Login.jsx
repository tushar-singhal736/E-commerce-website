import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, parseApiResponse } from '../utils/api';
import { normalizeEmail, validateLoginData, validateSignupData, sanitizeUser } from '../utils/userValidation';
import './Login.css';

function Login({ onLogin, setToast }) {
  const [isSignup, setIsSignup] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    phone: '',
    email: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();

  const showToast = (message, type = 'error') => {
    if (setToast) {
      setToast({ message, type });
    } else {
      window.alert(message);
    }
  };

  const getSavedUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  };

  useEffect(() => {
    const savedUser = getSavedUser();
    if (!savedUser) return;
    if (savedUser.role === 'admin') {
      navigate('/admin', { replace: true });
    } else {
      navigate('/profile', { replace: true });
    }
  }, [navigate]);

  const callAuthApi = async (endpoint, body) => {
    const response = await apiFetch(`/api/auth/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return parseApiResponse(response);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const email = normalizeEmail(formData.email);
    const password = String(formData.password || '').trim();

    if (isReset) {
      const { isValid, errors } = validateLoginData(email, password);
      if (!isValid) {
        showToast(Object.values(errors).join(', '), 'error');
        return;
      }
      setIsSubmitting(true);
      try {
        await callAuthApi('reset-password', { email, password });
        showToast('Password reset successful. Please sign in.', 'success');
        setIsReset(false);
        setIsSignup(false);
        setFormData({ fullName: '', dateOfBirth: '', phone: '', email: '', password: '' });
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isSignup) {
      const { isValid, errors } = validateSignupData({ ...formData, email, password });
      if (!isValid) {
        showToast(Object.values(errors).join(', '), 'error');
        return;
      }

      setIsSubmitting(true);
      try {
        const data = await callAuthApi('signup', {
          fullName: String(formData.fullName || '').trim(),
          dateOfBirth: formData.dateOfBirth,
          phone: String(formData.phone || '').trim(),
          email,
          password,
        });
        const sanitized = sanitizeUser(data.user);
        localStorage.setItem('user', JSON.stringify(sanitized));
        if (data.token) localStorage.setItem('token', data.token);
        if (onLogin) onLogin(sanitized, data.token);
        showToast(`Account ban gaya! Welcome, ${sanitized.fullName}!`, 'success');
        setIsSignup(false);
        navigate(sanitized.role === 'admin' ? '/admin' : '/profile');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const { isValid, errors } = validateLoginData(email, password);
    if (!isValid) {
      showToast(Object.values(errors).join(', '), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const data = await callAuthApi('login', { email, password });
      const sanitized = sanitizeUser(data.user);
      localStorage.setItem('user', JSON.stringify(sanitized));
      if (data.token) localStorage.setItem('token', data.token);
      if (onLogin) onLogin(sanitized, data.token);
      showToast(`Welcome back, ${sanitized.fullName || sanitized.email}!`, 'success');
      navigate(sanitized.role === 'admin' ? '/admin' : '/profile');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="main-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h2>{isSignup ? 'Create Account' : 'Welcome Back'}</h2>
          <p>{isReset ? 'Reset your customer password' : isSignup ? 'Start your journey with SuperNova' : 'Login to your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignup && !isReset && (
            <>
              <input type="text" name="fullName" placeholder="Full Name" onChange={handleChange} required />
              <input type="date" name="dateOfBirth" title="Date of Birth" onChange={handleChange} required />
              <input type="tel" name="phone" placeholder="Phone Number" onChange={handleChange} required />
            </>
          )}

          <input type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleChange} required />
          <input type="password" name="password" placeholder={isReset ? 'New Password' : 'Password'} value={formData.password} onChange={handleChange} required />

          <button type="submit" className="action-btn" disabled={isSubmitting}>
            {isSubmitting
              ? 'Please wait...'
              : isReset ? 'Reset Password' : isSignup ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="toggle-section">
          {!isSignup && !isReset && (
            <button type="button" className="forgot-btn" onClick={() => setIsReset(true)}>
              Forgot password?
            </button>
          )}
          <p>
            {isReset ? 'Remember your password?' : isSignup ? "Already have an account?" : "Don't have an account?"}
            <span onClick={() => {
              setIsReset(false);
              setIsSignup(!isSignup);
            }}>
              {isReset ? ' Login' : isSignup ? ' Login' : ' Signup'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
