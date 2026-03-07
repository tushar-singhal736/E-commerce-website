import React from 'react';
import { Link } from 'react-router-dom';
import { FaShoppingCart, FaUserCircle } from 'react-icons/fa';
import './Navbar.css';

function Navbar({ cartCount, user, theme, toggleTheme }) {
  // ⚡ FIX: user.photo ko pehle check karein kyunki Profile page wahi save kar raha hai
  const profileImg = user?.photo || user?.avatar?.url || user?.avatar;

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <h2>SuperNova</h2>
        </Link>

        <div className="nav-menu">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/products" className="nav-link">Products</Link>

          {/* Cart Icon and Badge */}
          <Link to="/cart" className="nav-link cart-link-container">
            <FaShoppingCart size={22} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <Link to="/orders" className="nav-link">Account</Link>

          {/* Profile Logic: Circular Photo */}
          {user ? (
            <Link to="/profile" className="profile-wrapper">
              {profileImg ? (
                <img src={profileImg} alt="User" className="profile-img-circle" />
              ) : (
                <FaUserCircle size={30} color="white" />
              )}
            </Link>
          ) : (
            <Link to="/login" className="nav-link">Login</Link>
          )}
          {/* theme toggle */}
          <button className="theme-toggle" onClick={toggleTheme} title="Switch theme">
            {theme === 'dark' ? '🌞' : '🌙'}
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;