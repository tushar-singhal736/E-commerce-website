import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FaLinkedin, 
  FaGithub, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaEnvelope 
} from 'react-icons/fa';
import './Footer.css';

function Footer() {
  // Google Maps link for your hostel area
  const mapLocation = "https://www.google.com/maps/search/Boys+Hostel+near+Paintra+Knowledge+Park+3+Greater+Noida";

  return (
    <footer className="footer">
      <div className="footer-container">
        
        {/* Section 1: Logo & Socials */}
        <div className="footer-section">
          <h2 className="footer-logo">SuperNova</h2>
          <p>Your one-stop shop for premium products. Quality, trust, and customer satisfaction is our top priority.</p>
          <div className="social-icons">
            <a href="https://www.linkedin.com/in/tushar-singhal-a51a40339/" target="_blank" rel="noreferrer">
              <FaLinkedin title="LinkedIn" />
            </a>
            <a href="https://github.com/tushar-singhal736" target="_blank" rel="noreferrer">
              <FaGithub title="GitHub" />
            </a>
          </div>
        </div>

        {/* Section 2: Quick Links */}
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/products">All Products</Link></li>
            <li><Link to="/orders">My Orders</Link></li>
            <li><Link to="/profile">My Account</Link></li>
          </ul>
        </div>

        {/* Section 3: Contact Info */}
        <div className="footer-section">
          <h3>Contact Us</h3>
          <p><FaPhoneAlt className="footer-icon" /> +91 7455096791</p>
          <p>
            <FaEnvelope className="footer-icon" /> 
            <a href="mailto:tusharsinghal1250@gmail.com" className="contact-link">tusharsinghal1250@gmail.com</a>
          </p>
          <p>
            <FaMapMarkerAlt className="footer-icon" /> 
            <a href={mapLocation} target="_blank" rel="noreferrer" className="contact-link">
              Boys Hostel, Near Paintra, Knowledge Park 3, Greater Noida - 201310
            </a>
          </p>
        </div>

      </div>

      <div className="footer-bottom">
        <p>Made with ❤️ by <strong>Tushar Singhal</strong> | © 2026 SuperNova</p>
      </div>
    </footer>
  );
}

export default Footer;