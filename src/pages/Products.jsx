import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Heart, Search, SlidersHorizontal, Star, ShoppingCart, Zap } from 'lucide-react';
import Recommendations from '../components/Recommendations';
import { debounce } from '../utils/debounce';
import { getProducts } from '../data/products';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './Products.css';

function Products({ addToCart, discountPercent = 0, cart = [], user = null, toggleWishlist, isInWishlist }) {
  const { category } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const debouncedSearchRef = useRef(null);

  // Debounced search handler
  const handleSearchChange = useCallback((value) => {
    if (!debouncedSearchRef.current) {
      debouncedSearchRef.current = debounce((val) => {
        setSearchQuery(val);
      }, 300);
    }
    debouncedSearchRef.current(value);
  }, []);

  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      setLoading(true);
      try {
        const items = await getProducts({ page: 1, limit: 500 });
        if (active) setProducts(items);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchProducts();

    const refreshOnFocus = () => {
      if (document.visibilityState === 'visible') fetchProducts();
    };
    const intervalId = window.setInterval(fetchProducts, 15000);
    document.addEventListener('visibilitychange', refreshOnFocus);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, []);

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
      setPage(1);
    }
  }, [category]);

  const processedProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== 'all') {
      result = result.filter(p => String(p.category || '').toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        String(p.name || '').toLowerCase().includes(query) ||
        String(p.description || '').toLowerCase().includes(query)
      );
    }

    if (priceRange !== 'all') {
      const [min, max] = priceRange.split('-').map(Number);
      result = result.filter((p) => {
        const price = Number(p.price) || 0;
        return price >= min && (Number.isFinite(max) ? price <= max : true);
      });
    }

    if (ratingFilter !== 'all') {
      const [minRating, maxRating] = ratingFilter.split('-').map(Number);
      result = result.filter((p) => {
        const rating = Number(p.rating) || 0;
        if (ratingFilter === '4.5-5') {
          return rating >= minRating && rating <= maxRating;
        }
        return rating >= minRating && rating < maxRating;
      });
    }

    if (availabilityFilter === 'in-stock') {
      result = result.filter((p) => (Number(p.stock) || 0) > 0);
    } else if (availabilityFilter === 'low-stock') {
      result = result.filter((p) => {
        const stock = Number(p.stock) || 0;
        return stock > 0 && stock <= 10;
      });
    }

    if (sortBy === 'price-low') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'rating-high') result.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    else if (sortBy === 'name-az') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, selectedCategory, searchQuery, sortBy, priceRange, ratingFilter, availabilityFilter]);

  const categoryFilteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => String(p.category || '').toLowerCase() === selectedCategory.toLowerCase());
  }, [products, selectedCategory]);

  const ratingCounts = useMemo(() => {
    const counts = { '4-4.5': 0, '4.5-5': 0 };
    categoryFilteredProducts.forEach((product) => {
      const rating = Number(product.rating) || 0;
      if (rating >= 4 && rating < 4.5) counts['4-4.5'] += 1;
      if (rating >= 4.5 && rating <= 5) counts['4.5-5'] += 1;
    });
    return counts;
  }, [categoryFilteredProducts]);

  const ratingFilterLabelMap = {
    '4-4.5': '4.0 to 4.4 rating',
    '4.5-5': '4.5 to 5.0 rating',
  };

  const activeFiltersLabelParts = [
    selectedCategory !== 'all' ? `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)}` : null,
    priceRange !== 'all' ? `Price ${priceRange.replace('-', ' - ').replace('Infinity', '+')}` : null,
    ratingFilter !== 'all' ? ratingFilterLabelMap[ratingFilter] : null,
    availabilityFilter !== 'all' ? availabilityFilter.replace('-', ' ') : null,
  ].filter(Boolean);

  const activeFiltersLabel = activeFiltersLabelParts.length > 0 ? activeFiltersLabelParts.join(' · ') : '';

  const totalPages = Math.max(1, Math.ceil(processedProducts.length / limit));
  const currentPage = Math.min(page, totalPages);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    return processedProducts.slice(startIndex, startIndex + limit);
  }, [processedProducts, currentPage, limit]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, searchQuery, sortBy, priceRange, ratingFilter, availabilityFilter]);

  const handleCategoryChange = (cat) => {
    setSelectedCategory(cat);
    navigate(cat === 'all' ? '/products' : `/products/${cat}`);
  };

  const categories = ['all', 'women', 'men', 'shoes', 'jewellery', 'electronics'];

  return (
    <div className="products-page">
      <div className="products-container">
        <header className="page-header">
          <h1>Discover Our Collection</h1>
          <p>Handpicked premium products just for you</p>
        </header>

        {/* --- Controls Bar --- */}
        <div className="controls-section">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or detail..." 
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="sort-wrapper">
            <SlidersHorizontal size={18} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">New Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating-high">Top Rated</option>
              <option value="name-az">A-Z Name</option>
            </select>
          </div>
        </div>

        <div className="advanced-filters">
          <select value={priceRange} onChange={(e) => setPriceRange(e.target.value)}>
            <option value="all">All prices</option>
            <option value="0-500">Under Rs. 500</option>
            <option value="500-1500">Rs. 500 - 1,500</option>
            <option value="1500-5000">Rs. 1,500 - 5,000</option>
            <option value="5000-Infinity">Above Rs. 5,000</option>
          </select>
          <div className="rating-select-wrapper">
            <select value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
              <option value="all">All ratings</option>
              <option value="4-4.5">4.0 to 4.4 rating ({ratingCounts['4-4.5']})</option>
              <option value="4.5-5">4.5 to 5.0 rating ({ratingCounts['4.5-5']})</option>
            </select>
          </div>
          <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)}>
            <option value="all">All stock</option>
            <option value="in-stock">In stock</option>
            <option value="low-stock">Low stock</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setPriceRange('all');
              setRatingFilter('all');
              setAvailabilityFilter('all');
              setSortBy('default');
            }}
          >
            Reset filters
          </button>
        </div>

        <div className="active-filters-summary">
          <span>
            Showing {processedProducts.length} product{processedProducts.length === 1 ? '' : 's'}
            {activeFiltersLabel ? ` for ${activeFiltersLabel}` : ''}
          </span>
        </div>

        {/* --- Category Tabs --- */}
        <div className="category-scroll-container">
          <div className="category-filters">
            {categories.map(cat => (
              <button
                key={cat}
                className={`modern-filter-btn ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => handleCategoryChange(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* --- Product Grid --- */}
        <div className="products-grid">
          {loading ? (
            <div className="loading-state">
               <div className="spinner"></div>
               <p>Curating products...</p>
            </div>
          ) : paginatedProducts.length > 0 ? (
            paginatedProducts.map((product, index) => (
              <div 
                key={product.id} 
                className="modern-product-card"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="card-image-wrapper">
                  <button
                    type="button"
                    className={`product-wishlist-btn ${isInWishlist?.(product.id) ? 'active' : ''}`}
                    title={isInWishlist?.(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                    onClick={(event) => {
                      event.stopPropagation();
                      toggleWishlist?.(product);
                    }}
                  >
                    <Heart size={18} fill={isInWishlist?.(product.id) ? 'currentColor' : 'none'} />
                  </button>
                  <div className="rating-badge">
                    <Star size={12} fill="currentColor" />
                    <span>{product.rating || "4.5"}</span>
                  </div>
                  <div className={`stock-badge ${(Number(product.stock) || 0) <= 0 ? 'out' : (Number(product.stock) || 0) <= 10 ? 'low' : ''}`}>
                    {(Number(product.stock) || 0) <= 0 ? 'Sold out' : (Number(product.stock) || 0) <= 10 ? `Only ${product.stock} left` : 'In stock'}
                  </div>
                  {discountPercent > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        right: 12,
                        bottom: 12,
                        background: '#16a34a',
                        color: '#fff',
                        fontSize: 12,
                        padding: '4px 8px',
                        borderRadius: 999,
                        boxShadow: '0 8px 18px rgba(0,0,0,0.18)',
                        zIndex: 4
                      }}
                    >
                      {discountPercent}% OFF
                    </div>
                  )}
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    loading="lazy"
                    onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                  />
                </div>

                <div className="card-body">
                  <span className="card-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <div className="card-footer">
                    <p className="card-price">
                      ₹{Number(product.price).toLocaleString('en-IN')}
                      {discountPercent > 0 ? (
                        <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 700, fontSize: 11 }}>
                          at checkout
                        </span>
                      ) : null}
                    </p>
                    <div className="card-btns" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="icon-btn add"
                        title="Add to Cart"
                        disabled={(Number(product.stock) || 0) <= 0}
                        onClick={() => addToCart(product)}
                      >
                        <ShoppingCart size={18} />
                      </button>
                      <button
                        className="icon-btn buy"
                        title="Buy Now"
                        disabled={(Number(product.stock) || 0) <= 0}
                        onClick={() => { addToCart(product); navigate('/cart'); }}
                      >
                        <Zap size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <h3>No items found</h3>
              <p>Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
        <div className="pagination-section">
          <div className="pagination-summary">
            Showing {paginatedProducts.length} of {processedProducts.length} products
          </div>
          <div className="pagination-controls">
            <button disabled={currentPage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Previous
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button disabled={currentPage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
              Next
            </button>
          </div>
        </div>
      </div>
      <Recommendations
        title="Recommended from this collection"
        subtitle="Suggestions based on category, popularity, and ratings"
        cart={cart}
        user={user}
        category={selectedCategory !== 'all' ? selectedCategory : ''}
        addToCart={addToCart}
        toggleWishlist={toggleWishlist}
        isInWishlist={isInWishlist}
        limit={16}
      />
    </div>
  );
}

export default Products;
