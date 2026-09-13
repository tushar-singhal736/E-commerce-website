import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaCamera, FaTrash, FaUser, FaEnvelope, FaPhone, FaBirthdayCake, FaLock } from 'react-icons/fa';
import './Profile.css';

function Profile({ user, logout, setUser, setCartCount, setToast }) {
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(null);
  const fileRef = useRef(null);

  const showToast = (message, type = 'error') => {
    if (setToast) setToast({ message, type });
    else window.alert(message);
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load photo from localStorage or user profile data on mount
  useEffect(() => {
    if (user && user.email) {
      const key = `profile_photo_${user.email}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        setAvatar(saved);
      } else if (user.photo) {
        setAvatar(user.photo);
      }
    }
  }, [user]);

  if (!user) return null;

  const handleLogout = () => {
    if (window.confirm('Kya aap logout karna chahte hain?')) {
      // 1. Clear LocalStorage
      localStorage.removeItem('user');
      localStorage.removeItem(`profile_photo_${user.email}`);
      localStorage.removeItem('cart'); // Consistent with App.js key

      // 2. Reset States
      if (setUser) setUser(null);
      if (setCartCount) setCartCount([]); // Resetting to empty array as per App.js

      // 3. Call Auth Logout
      logout();

      // 4. Redirect
      navigate('/');
      showToast('Logged out successfully.', 'success');
    }
  };

  const handleChoosePhoto = () => {
    if (fileRef.current) fileRef.current.click();
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setAvatar(dataUrl);

      if (user && user.email) {
        const key = `profile_photo_${user.email}`;
        try { 
          localStorage.setItem(key, dataUrl); 
          
          const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
          if (savedUser && savedUser.email === user.email) {
            savedUser.photo = dataUrl;
            localStorage.setItem('user', JSON.stringify(savedUser));
            
            // ⚡ Update Global State (Navbar will update immediately)
            if (setUser) {
                setUser({ ...savedUser }); 
            }
          }
        } catch (err) { 
          console.error("Storage full or error:", err); 
          showToast("Storage full! Purani photos delete karein.", 'error');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    if (!user || !user.email) return;
    const key = `profile_photo_${user.email}`;
    localStorage.removeItem(key);
    setAvatar(null);
    
    const savedUser = JSON.parse(localStorage.getItem('user') || 'null');
    if (savedUser && savedUser.email === user.email) {
      delete savedUser.photo;
      localStorage.setItem('user', JSON.stringify(savedUser));
      
      // ⚡ Update Global State (Navbar icon will return to default)
      if (setUser) {
          setUser({ ...savedUser });
      }
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="avatar-wrapper">
              <div className="profile-avatar">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="profile-img-main" />
                ) : (
                  <div className="default-avatar-icon">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : <FaUser />}
                  </div>
                )}
                <div className="avatar-overlay" onClick={handleChoosePhoto} title="Change Photo">
                  <FaCamera />
                </div>
              </div>
            </div>
            
            <h2 className="user-name">{user.fullName || 'User'}</h2>
            <p className="user-status">Verified Account</p>

            <div className="avatar-actions">
              <input 
                ref={fileRef} 
                type="file" 
                accept="image/*" 
                style={{ display: 'none' }} 
                onChange={handlePhotoChange} 
              />
              {avatar && (
                <button className="remove-photo-btn" onClick={handleRemovePhoto}>
                  <FaTrash size={12} /> Remove Photo
                </button>
              )}
            </div>
          </div>

          <div className="profile-details-grid">
            <div className="detail-card">
              <h3><FaUser className="icon-blue" /> Personal Details</h3>
              <div className="info-row">
                <span className="label">Full Name</span>
                <span className="value">{user.fullName || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label"><FaBirthdayCake className="small-icon" /> DOB</span>
                <span className="value">{user.dateOfBirth || 'N/A'}</span>
              </div>
              <div className="info-row">
                <span className="label"><FaPhone className="small-icon" /> Phone</span>
                <span className="value">{user.phone || 'N/A'}</span>
              </div>
            </div>

            <div className="detail-card">
              <h3><FaLock className="icon-blue" /> Account Security</h3>
              <div className="info-row">
                <span className="label"><FaEnvelope className="small-icon" /> Email</span>
                <span className="value">{user.email}</span>
              </div>
              <div className="info-row">
                <span className="label">Password</span>
                <span className="value password-dots">••••••••</span>
              </div>
            </div>
          </div>

          <div className="profile-footer">
            <button className="logout-btn-modern" onClick={handleLogout}>
              Logout Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;