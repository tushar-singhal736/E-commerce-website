import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, MonitorSmartphone, Shirt, ShoppingBag, Sparkles } from 'lucide-react';
import Recommendations from '../components/Recommendations';
import { getProducts } from '../data/products';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './Home.css';

function Home({ addToCart, discountPercent = 0, cart = [], user = null, toggleWishlist, isInWishlist }) {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progressTick, setProgressTick] = useState(0);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const SLIDE_DURATION_MS = 7000;
  const categories = [
    { key: 'all', label: 'All', icon: ShoppingBag },
    { key: 'women', label: 'Women', icon: Sparkles },
    { key: 'men', label: 'Men', icon: Shirt },
    { key: 'shoes', label: 'Shoes', icon: ShoppingBag },
    { key: 'jewellery', label: 'Jewellery', icon: Gem },
    { key: 'electronics', label: 'Electronics', icon: MonitorSmartphone },
  ];

  // --- 1. Fetch Products from Backend (Port 5005) ---
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const items = await getProducts({ limit: 100, page: 1 });
        setProducts(items);
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
    {
      image: 'https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1600&q=85&auto=format&fit=crop',
      title: 'Mega Store Sale',
      subtitle: 'Bestsellers par flat 50% — sirf is week',
      chip: 'Flash Deal',
      badge: '50% OFF',
      accent: '#ff7a00',
      accent2: '#ff2a8f',
      category: 'all',
    },
    {
      image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1600&q=85&auto=format&fit=crop',
      title: 'Premium Fashion',
      subtitle: 'Summer collection — fresh styles for her',
      chip: 'New Arrivals',
      badge: 'Trending',
      accent: '#a855f7',
      accent2: '#ec4899',
      category: 'women',
    },
    {
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1600&q=85&auto=format&fit=crop',
      title: 'Latest Electronics',
      subtitle: 'Headphones, gadgets & smart gear — best prices',
      chip: 'Tech Week',
      badge: 'Hot Pick',
      accent: '#0ea5e9',
      accent2: '#6366f1',
      category: 'electronics',
    },
    {
      image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600&q=85&auto=format&fit=crop',
      title: 'Luxury Watches',
      subtitle: 'Timeless pieces — limited edition drops',
      chip: 'Exclusive',
      badge: 'Premium',
      accent: '#f59e0b',
      accent2: '#b45309',
      category: 'jewellery',
    },
  ];

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setProgressTick((t) => t + 1);
  };

  const nextSlide = () => goToSlide(currentSlide === slides.length - 1 ? 0 : currentSlide + 1);
  const prevSlide = () => goToSlide(currentSlide === 0 ? slides.length - 1 : currentSlide - 1);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
      setProgressTick((t) => t + 1);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, [slides.length]);

  // --- 3. Filtering Logic ---
  const getCategoryCount = (cat) => {
    if (cat === 'all') return products.length;
    return products.filter((p) => p.category === cat).length;
  };
  
  const filteredProducts = selectedCategory === 'all' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  return (
    <div className="home">
      {/* Banner/Slider Section */}
      <section className="banner-slider" aria-label="Featured offers">
        {slides.map((slide, index) => (
          <div
            key={slide.title}
            className={`slide ${index === currentSlide ? 'active' : ''}`}
            aria-hidden={index !== currentSlide}
          >
            <div
              className="slide-bg"
              style={{
                backgroundImage: `url(${slide.image})`,
                '--slide-accent': slide.accent,
                '--slide-accent-2': slide.accent2,
              }}
            />
            <div className="slide-overlay" />
            <div className="slide-content">
              <div className="slide-content-inner">
                <div className="slide-meta">
                  <span className="slide-chip">{slide.chip}</span>
                  <span className="slide-badge">{slide.badge}</span>
                </div>
                <h1>{slide.title}</h1>
                <p>{slide.subtitle}</p>
                <div className="slide-actions">
                  <button
                    type="button"
                    className="banner-btn banner-btn-primary"
                    onClick={() => navigate(slide.category === 'all' ? '/products' : `/products/${slide.category}`)}
                  >
                    Shop Now
                  </button>
                  <button
                    type="button"
                    className="banner-btn banner-btn-ghost"
                    onClick={() => navigate('/products')}
                  >
                    View All
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div
          key={progressTick}
          className="banner-progress"
          style={{ animationDuration: `${SLIDE_DURATION_MS}ms` }}
        />

        <button type="button" className="banner-nav banner-nav-prev" onClick={prevSlide} aria-label="Previous slide">
          ‹
        </button>
        <button type="button" className="banner-nav banner-nav-next" onClick={nextSlide} aria-label="Next slide">
          ›
        </button>

        <div className="slider-dots">
          {slides.map((slide, i) => (
            <button
              key={slide.title}
              type="button"
              className={`slider-dot ${i === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}: ${slide.title}`}
              aria-current={i === currentSlide ? 'true' : undefined}
            />
          ))}
        </div>

        <span className="slide-counter">
          {String(currentSlide + 1).padStart(2, '0')} / {String(slides.length).padStart(2, '0')}
        </span>
      </section>

      {/* Categories Grid */}
      <div className="categories-section">
        <div className="section-head">
          <h2>Shop by Category</h2>
          <p>Explore curated collections and trending picks</p>
        </div>
        <div className="categories-grid">
          {categories.map(({ key, label, icon: CategoryIcon }) => (
            <div
              key={key}
              className={`category-card ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              <div className="category-icon">
                <CategoryIcon size={24} strokeWidth={2.2} />
              </div>
              <h3>{label}</h3>
              <span className="category-count">{getCategoryCount(key)} items</span>
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
                    <button
                      type="button"
                      className={`home-wishlist-btn ${isInWishlist?.(product.id) ? 'active' : ''}`}
                      aria-label={`${isInWishlist?.(product.id) ? 'Remove from' : 'Add to'} wishlist`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleWishlist?.(product);
                      }}
                    >
                      ♥
                    </button>
                    <span className="home-rating">★ {product.rating || 4.5}</span>
                    {discountPercent > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          left: 10,
                          bottom: 10,
                          background: '#16a34a',
                          color: '#fff',
                          fontSize: 12,
                          padding: '4px 8px',
                          borderRadius: 999,
                          boxShadow: '0 8px 18px rgba(0,0,0,0.18)'
                        }}
                      >
                        {discountPercent}% OFF
                      </span>
                    )}
                    <img
                      src={getProductImage(product)}
                      alt={product.name}
                      onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                    />
                  </div>
                  <div className="product-info-home">
                    <span className="product-category-home">{product.category}</span>
                    <h3>{product.name}</h3>
                    <p className="product-price-home">
                      ₹{product.price}{discountPercent > 0 ? (
                        <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 600, fontSize: 12 }}>
                          (at checkout)
                        </span>
                      ) : null}
                    </p>
                    <button 
                      className="add-to-cart-btn-home" 
                      disabled={(Number(product.stock) || 0) <= 0}
                      onClick={(e) => {
                        e.stopPropagation(); // Card click se bachane ke liye
                        addToCart(product);
                      }}
                    >
                      {(Number(product.stock) || 0) <= 0 ? 'Sold Out' : 'Add to Cart'}
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
      <Recommendations
        title="Picked for your next order"
        subtitle="Smart suggestions from popular products and store trends"
        cart={cart}
        user={user}
        addToCart={addToCart}
        toggleWishlist={toggleWishlist}
        isInWishlist={isInWishlist}
        limit={8}
      />
    </div>
  );
}

export default Home;
