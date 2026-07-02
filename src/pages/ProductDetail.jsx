import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, ShoppingBag, Zap, Minus, Plus, Star, ShieldCheck, Truck, RotateCcw, Send } from 'lucide-react';
import Recommendations from '../components/Recommendations';
import { getProductById } from '../data/products';
import { getProductImage, getProductImages, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './ProductDetail.css';

const buildVariantOptions = (product) => {
  const category = String(product?.category || '').toLowerCase();
  if (category === 'shoes') {
    return {
      Size: ['6', '7', '8', '9', '10'],
      Color: ['Black', 'White', 'Tan'],
    };
  }
  if (category === 'electronics') {
    return {
      Storage: ['64 GB', '128 GB', '256 GB'],
      Color: ['Black', 'Silver', 'Blue'],
    };
  }
  if (category === 'jewellery') {
    return {
      Finish: ['Gold', 'Silver', 'Rose Gold'],
      Size: ['Standard', 'Adjustable'],
    };
  }
  return {
    Size: ['S', 'M', 'L', 'XL'],
    Color: ['Black', 'Blue', 'White'],
  };
};

const getVariantSku = (variant) => Object.values(variant || {}).join('-').replace(/\s+/g, '').toLowerCase();
const getVariantLabel = (variant) => Object.entries(variant || {}).map(([key, value]) => `${key}: ${value}`).join(' | ');

function ProductDetail({ addToCart, discountPercent = 0, cart = [], user = null, toggleWishlist, isInWishlist }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [selectedVariant, setSelectedVariant] = useState({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [localReviews, setLocalReviews] = useState([]);
  const [qty, setQty] = useState(1); // Quantity state

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const payload = await getProductById(id);
        if (payload) {
          setProduct(payload);
          setSelectedImage(getProductImage(payload));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const validImages = useMemo(() => {
    if (!product) return [];
    return getProductImages(product);
  }, [product]);

  useEffect(() => {
    if (!product?.id) return;
    const saved = localStorage.getItem(`reviews:${product.id}`);
    if (saved) {
      try { setLocalReviews(JSON.parse(saved)); }
      catch { localStorage.removeItem(`reviews:${product.id}`); }
    } else {
      setLocalReviews([]);
    }
  }, [product?.id]);

  const allReviews = useMemo(() => {
    if (!product) return [];
    const baseReviews = Array.isArray(product.reviews) ? product.reviews : [];
    return [...localReviews, ...baseReviews];
  }, [product, localReviews]);

  const submitReview = () => {
    if (!reviewText.trim()) return;
    const nextReview = {
      id: Date.now(),
      userName: user?.name || user?.email?.split('@')[0] || 'Verified customer',
      rating: reviewRating,
      comment: reviewText.trim(),
      createdAt: new Date().toISOString(),
      verified: Boolean(user),
    };
    const updated = [nextReview, ...localReviews].slice(0, 20);
    setLocalReviews(updated);
    localStorage.setItem(`reviews:${product.id}`, JSON.stringify(updated));
    setReviewText('');
    setReviewRating(5);
  };

  const variantOptions = useMemo(() => product ? buildVariantOptions(product) : {}, [product]);

  useEffect(() => {
    if (!product) return;
    const defaults = Object.fromEntries(
      Object.entries(buildVariantOptions(product)).map(([name, values]) => [name, values[0]])
    );
    setSelectedVariant(defaults);
  }, [product]);

  const productForCart = () => ({
    ...product,
    quantity: qty,
    selectedVariant: {
      ...selectedVariant,
      sku: getVariantSku(selectedVariant),
      label: getVariantLabel(selectedVariant),
    },
  });

  // Quantity Badhane ka Function
  const incrementQty = () => {
    const maxQty = Math.min(10, Math.max(1, Number(product?.stock) || 1));
    setQty(prev => Math.min(maxQty, prev + 1));
  };

  // Quantity Ghatane ka Function
  const decrementQty = () => {
    setQty(prev => (prev > 1 ? prev - 1 : 1));
  };

  if (loading) return <div className="loader-container"><div className="modern-spinner"></div></div>;
  if (!product) return <div className="error-screen"><h2>Product Not Found</h2></div>;
  const stockValue = Number(product.stock) || 0;

  return (
    <div className="modern-detail-container">
      <div className="product-grid">
        
        {/* Gallery */}
        <div className="gallery-column">
          <div className="main-viewer">
             <img src={selectedImage || PRODUCT_PLACEHOLDER} alt={product.name} onError={handleImageFallback(PRODUCT_PLACEHOLDER)} />
          </div>
          <div className="thumb-row" onMouseDown={(e) => e.preventDefault()}>
            {validImages.map((img, i) => (
              <div 
                key={i} 
                className={`modern-thumb ${selectedImage === img ? 'active' : ''}`}
                onClick={() => setSelectedImage(img)}
              >
                <img src={img} alt="thumbnail" onError={handleImageFallback(PRODUCT_PLACEHOLDER)} />
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="details-column">
          <div className="header-meta">
            <span className="category-tag">{product.category || 'New Arrival'}</span>
            <div className="rating-pill">
              <Star size={14} fill="#FFC107" stroke="#FFC107" /> 
              <span>4.8</span>
              <span className="review-count">(128 Reviews)</span>
            </div>
          </div>

          <h1 className="modern-title">{product.name}</h1>
          <button
            type="button"
            className={`detail-wishlist-btn ${isInWishlist?.(product.id) ? 'active' : ''}`}
            onClick={() => toggleWishlist?.(product)}
          >
            <Heart size={18} fill={isInWishlist?.(product.id) ? 'currentColor' : 'none'} />
            {isInWishlist?.(product.id) ? 'Saved in Wishlist' : 'Save to Wishlist'}
          </button>
          
          <div className="price-tag">
            <span className="currency">₹</span>
            {/* Price calculation based on quantity */}
            <span className="amount">{Number(product.price * qty).toLocaleString('en-IN')}</span>
            {discountPercent > 0 && (
              <span
                style={{
                  marginLeft: 10,
                  background: '#16a34a',
                  color: '#fff',
                  fontSize: 12,
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontWeight: 700
                }}
              >
                {discountPercent}% OFF at checkout
              </span>
            )}
          </div>

          <div className="info-divider"></div>

          <div className="description-box">
            <h3>Overview</h3>
            <p>{product.description || "A masterfully crafted piece designed for excellence."}</p>
          </div>

          <ul className="feature-list">
            <li><ShieldCheck size={18} /> 2 Year Official Warranty</li>
            <li><Truck size={18} /> Free Express Shipping</li>
            <li><RotateCcw size={18} /> 30-Day Easy Returns</li>
          </ul>

          <div className="variant-panel">
            {Object.entries(variantOptions).map(([name, values]) => (
              <div className="variant-group" key={name}>
                <span>{name}</span>
                <div className="variant-options">
                  {values.map((value) => (
                    <button
                      type="button"
                      key={value}
                      className={selectedVariant[name] === value ? 'active' : ''}
                      onClick={() => setSelectedVariant((prev) => ({ ...prev, [name]: value }))}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="purchase-controls">
            <label className="qty-label">Quantity</label>
            <div className="qty-selector">
              <button type="button" onClick={decrementQty}><Minus size={16} /></button>
              <span className="qty-display">{qty}</span>
              <button type="button" onClick={incrementQty} disabled={qty >= Math.min(10, Math.max(1, stockValue))}><Plus size={16} /></button>
            </div>

            <div className="action-btns">
              <button className="add-to-cart" disabled={stockValue <= 0} onClick={() => addToCart(productForCart())}>
                <ShoppingBag size={20} /> {stockValue <= 0 ? 'Sold Out' : 'Add to Bag'}
              </button>
              <button className="buy-now" disabled={stockValue <= 0} onClick={() => { addToCart(productForCart()); navigate('/cart'); }}>
                <Zap size={20} /> Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
      <section className="reviews-panel">
        <div className="reviews-header">
          <h2 className="reviews-title">
            <Star size={16} fill="currentColor" />
            {Number(product.rating || 4.5).toFixed(1)}
            <span className="reviews-title-muted">· Ratings & Reviews</span>
          </h2>
        </div>

        <form
          className="review-form-compact"
          onSubmit={(e) => {
            e.preventDefault();
            submitReview();
          }}
        >
          <div className="review-form-row">
            <div className="review-stars-input" role="group" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`review-star-btn ${star <= reviewRating ? 'active' : ''}`}
                  onClick={() => setReviewRating(star)}
                  aria-label={`Rate ${star} out of 5`}
                  aria-pressed={star <= reviewRating}
                >
                  ★
                </button>
              ))}
            </div>
            <input
              type="text"
              className="review-input-compact"
              value={reviewText}
              maxLength={200}
              placeholder="Write a review..."
              onChange={(event) => setReviewText(event.target.value)}
              aria-label="Review text"
            />
            <button
              type="submit"
              className="review-submit-compact"
              disabled={!reviewText.trim()}
            >
              <Send size={15} strokeWidth={2.5} aria-hidden />
              Post Review
            </button>
          </div>
        </form>

        <div className="reviews-list">
          {allReviews.length === 0 ? (
            <p className="no-reviews">No reviews yet. Be the first to review this product.</p>
          ) : (
            allReviews.slice(0, 6).map((review, index) => (
              <article className="review-card" key={review.id || index}>
                <div>
                  <strong>{review.userName || review.name || 'Verified customer'}</strong>
                  {review.verified && <span>Verified purchase</span>}
                </div>
                <p className="review-stars">{'★'.repeat(Number(review.rating) || 5)}</p>
                <p>{review.comment || review.text || 'Great product experience.'}</p>
              </article>
            ))
          )}
        </div>
      </section>
      <Recommendations
        title="Similar products you may like"
        subtitle="Recommendations based on this product and store trends"
        currentProductId={product.id}
        category={product.category}
        cart={cart}
        user={user}
        addToCart={addToCart}
        toggleWishlist={toggleWishlist}
        isInWishlist={isInWishlist}
        limit={12}
      />
    </div>
  );
}

export default ProductDetail;
