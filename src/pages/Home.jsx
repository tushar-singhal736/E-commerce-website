import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Home.css';

function Home({ addToCart }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- 1. Fetch Products from Backend (Port 5005) ---
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        // Aapka backend 5005 par chal raha hai
        const res = await fetch('http://localhost:5005/api/products');
        if (!res.ok) throw new Error("Server response failed");
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Error loading products from backend:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProducts();
  }, []);

  // --- 2. Slider Data & Logic ---
  const slides = [
    { image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200', title: 'Mega Store Sale', subtitle: 'Flat 50% Off', category: 'all' },
    { image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1200', title: 'Premium Fashion', subtitle: 'Summer Arrivals', category: 'women' },
    { image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200', title: 'Latest Electronics', subtitle: 'Upgrade Your Life', category: 'electronics' },
    { image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1200', title: 'Luxury Watches', subtitle: 'Timeless Style', category: 'jewellery' }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // --- 3. Filtering Logic ---
  const categories = ['all', 'women', 'men', 'shoes', 'jewellery', 'electronics'];
  
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  const placeholder = 'https://via.placeholder.com/400?text=No+Image';

  return (
    <div className="home">
      {/* Banner/Slider Section */}
      <div className="banner-slider">
        {slides.map((slide, index) => (
          <div 
            key={index}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            style={{ backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.3)), url(${slide.image})` }}
          >
            <div className="slide-content">
              <h1>{slide.title}</h1>
              <p>{slide.subtitle}</p>
              <button 
                className="banner-btn" 
                onClick={() => navigate(slide.category === 'all' ? '/products' : `/products/${slide.category}`)}
              >
                Shop Now
              </button>
            </div>
          </div>
        ))}
        <div className="slider-dots">
          {slides.map((_, i) => (
            <span key={i} className={`dot ${i === currentSlide ? 'active' : ''}`} onClick={() => setCurrentSlide(i)}></span>
          ))}
        </div>
      </div>

      {/* Categories Grid */}
      <div className="categories-section">
        <h2>Shop by Category</h2>
        <div className="categories-grid">
          {categories.map(cat => (
            <div
              key={cat}
              className={`category-card ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              <div className="category-icon">
                {cat === 'all' && '🛍️'}
                {cat === 'women' && '👗'}
                {cat === 'men' && '👔'}
                {cat === 'shoes' && '👟'}
                {cat === 'jewellery' && '💍'}
                {cat === 'electronics' && '📱'}
              </div>
              <h3>{cat.charAt(0).toUpperCase() + cat.slice(1)}</h3>
            </div>
          ))}
        </div>

        {/* Products Grid */}
        <div className="products-section">
          <div className="products-grid-home">
            {loading ? (
              <div className="loading-container">
                 <p>Fetching amazing products for you...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
                <div 
                  key={product.id} 
                  className="product-card-home"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <div className="product-image-home">
                    <img
                      src={product.images && product.images[0] ? product.images[0] : placeholder}
                      alt={product.name}
                      onError={(e) => { e.target.src = placeholder; }}
                    />
                  </div>
                  <div className="product-info-home">
                    <h3>{product.name}</h3>
                    <p className="product-price-home">₹{product.price}</p>
                    <button 
                      className="add-to-cart-btn-home" 
                      onClick={(e) => {
                        e.stopPropagation(); // Card click se bachane ke liye
                        addToCart(product);
                      }}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No products found in this category.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;