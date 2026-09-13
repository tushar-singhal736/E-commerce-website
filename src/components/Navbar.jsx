import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaHeart, FaShoppingCart, FaUserCircle, FaBars, FaTimes, FaMoon, FaSun } from 'react-icons/fa';
import './Navbar.css';

function Navbar({ cartCount, wishlistCount = 0, user, isAdmin, theme, toggleTheme }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ⚡ FIX: user.photo ko pehle check karein kyunki Profile page wahi save kar raha hai
  const profileImg = user?.photo || user?.avatar?.url || user?.avatar;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          <h2>SuperNova</h2>
        </Link>

        <div className="nav-menu">
          <Link to="/" className="nav-link">Home</Link>
          <Link to="/products" className="nav-link">Products</Link>

          <Link to="/wishlist" className="nav-link cart-link-container" title="Wishlist">
            <FaHeart size={21} />
            {wishlistCount > 0 && <span className="cart-badge wishlist-badge">{wishlistCount}</span>}
          </Link>

          {/* Cart Icon and Badge */}
          <Link to="/cart" className="nav-link cart-link-container">
            <FaShoppingCart size={22} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </Link>

          <Link to="/orders" className="nav-link">Account</Link>
          {isAdmin && <Link to="/admin" className="nav-link admin-link">Admin</Link>}

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
          <button className="theme-toggle" onClick={toggleTheme} title="Switch theme" aria-label="Switch theme">
            {theme === 'dark' ? <FaMoon /> : <FaSun />}
          </button>
        </div>

        {/* Mobile Menu Button */}
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          {isMobileMenuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="mobile-menu">
          <Link to="/" className="mobile-nav-link" onClick={toggleMobileMenu}>Home</Link>
          <Link to="/products" className="mobile-nav-link" onClick={toggleMobileMenu}>Products</Link>
          <Link to="/wishlist" className="mobile-nav-link" onClick={toggleMobileMenu}>
            Wishlist {wishlistCount > 0 && <span className="cart-badge inline-badge">{wishlistCount}</span>}
          </Link>
          <Link to="/cart" className="mobile-nav-link" onClick={toggleMobileMenu}>
            Cart {cartCount > 0 && <span className="cart-badge inline-badge">{cartCount}</span>}
          </Link>
          <Link to="/orders" className="mobile-nav-link" onClick={toggleMobileMenu}>Account</Link>
          {isAdmin && <Link to="/admin" className="mobile-nav-link" onClick={toggleMobileMenu}>Admin Panel</Link>}
          {user ? (
            <Link to="/profile" className="mobile-nav-link" onClick={toggleMobileMenu}>Profile</Link>
          ) : (
            <Link to="/login" className="mobile-nav-link" onClick={toggleMobileMenu}>Login</Link>
          )}
          <button className="mobile-theme-toggle" onClick={toggleTheme}>
            {theme === 'dark' ? (
              <>
                <FaMoon /> Dark Mode
              </>
            ) : (
              <>
                <FaSun /> Light Mode
              </>
            )}
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;
