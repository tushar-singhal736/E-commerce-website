import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  ShoppingCart,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch, parseApiResponse } from '../utils/api';
import { products as fallbackProducts } from '../data/products';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './Recommendations.css';

function Recommendations({
  title = 'Recommended for you',
  subtitle = 'Picked from your browsing, cart, and store trends',
  cart = [],
  user = null,
  currentProductId = null,
  category = '',
  addToCart,
  toggleWishlist,
  isInWishlist,
  limit = 12,
}) {
  const navigate = useNavigate();
  const rowRef = useRef(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const loadRecommendations = async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cart,
            userEmail: user?.email || '',
            currentProductId,
            category,
            limit,
          }),
        });
        const payload = await parseApiResponse(res);
        if (alive) setItems(Array.isArray(payload) ? payload : []);
      } catch (error) {
        console.error('Recommendations load failed:', error);
        if (alive) {
          const fallbackItems = fallbackProducts
            .filter((product) => Number(product.id) !== Number(currentProductId))
            .filter((product) => !category || String(product.category || '').toLowerCase() === String(category).toLowerCase())
            .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
            .slice(0, limit);
          setItems(fallbackItems);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadRecommendations();
    return () => {
      alive = false;
    };
  }, [cart, user?.email, currentProductId, category, limit]);

  const rankedItems = useMemo(() => {
    return items.map((product, index) => ({
      ...product,
      rank: index + 1,
      imageUrl: getProductImage(product),
      ratingValue: Number(product.rating) || 4.5,
      stockValue: Number(product.stock) || 0,
    }));
  }, [items]);

  const scrollRow = (direction) => {
    const row = rowRef.current;
    if (!row) return;
    const amount = Math.min(row.clientWidth * 0.85, 860);
    row.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  if (!loading && rankedItems.length === 0) return null;

  return (
    <section className="recommendations-section" aria-label={title}>
      <div className="recommendations-header">
        <div>
          <span className="recommendations-eyebrow">
            <Sparkles size={14} />
            Smart picks
          </span>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>

        <div className="recommendations-actions">
          <button type="button" aria-label="Previous recommendations" onClick={() => scrollRow(-1)}>
            <ChevronLeft size={20} />
          </button>
          <button type="button" aria-label="Next recommendations" onClick={() => scrollRow(1)}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="recommendations-shell">
        <div className="recommendations-row" ref={rowRef}>
          {loading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div className="recommendation-card recommendation-card--loading" key={index}>
                <div className="recommendation-img-skeleton" />
                <div className="recommendation-line short" />
                <div className="recommendation-line" />
                <div className="recommendation-line medium" />
              </div>
            ))
          ) : (
            rankedItems.map((product) => (
              <article
                key={product.id}
                className="recommendation-card"
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="recommendation-image">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    loading="lazy"
                    onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                  />
                  <span className="recommendation-rank">#{product.rank} pick</span>
                  <span className="recommendation-rating">
                    <Star size={12} fill="currentColor" />
                    {product.ratingValue.toFixed(1)}
                  </span>
                  <div className="recommendation-quick-actions" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      className={isInWishlist?.(product.id) ? 'is-saved' : ''}
                      aria-label={`${isInWishlist?.(product.id) ? 'Remove' : 'Save'} ${product.name}`}
                      onClick={() => toggleWishlist?.(product)}
                    >
                      <Heart size={15} fill={isInWishlist?.(product.id) ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" aria-label={`View ${product.name}`} onClick={() => navigate(`/product/${product.id}`)}>
                      <Eye size={15} />
                    </button>
                  </div>
                </div>

                <div className="recommendation-body">
                  <div className="recommendation-meta">
                    <span className="recommendation-category">{product.category || 'Featured'}</span>
                    <span className={product.stockValue > 0 ? 'stock-live' : 'stock-out'}>
                      {product.stockValue > 0 ? 'In stock' : 'Sold out'}
                    </span>
                  </div>
                  <h3>{product.name}</h3>
                  <p className="recommendation-reason">{product.recommendationReason || 'Recommended for you'}</p>
                  <div className="recommendation-footer">
                    <div>
                      <strong>Rs. {Number(product.price || 0).toLocaleString('en-IN')}</strong>
                      <span>Fast delivery eligible</span>
                    </div>
                    {addToCart && (
                      <button
                        type="button"
                        aria-label={`Add ${product.name} to cart`}
                        disabled={product.stockValue <= 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(product);
                        }}
                      >
                        <ShoppingCart size={16} />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    className="recommendation-buy-now"
                    disabled={product.stockValue <= 0}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (addToCart) addToCart(product);
                      navigate('/cart');
                    }}
                  >
                    <Zap size={15} />
                    Buy now
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default Recommendations;
