import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, ShoppingCart, Zap } from 'lucide-react';
import './Products.css';

function Products({ addToCart }) {
  const { category } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(category || 'all');
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');

  const placeholder = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const res = await fetch('http://localhost:5005/api/products');
        const data = await res.json();
        setProducts(data);
      } catch (err) {
        console.error('Fetch error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (category) setSelectedCategory(category);
  }, [category]);

  const processedProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory !== 'all') {
      result = result.filter(p => p.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (sortBy === 'price-low') result.sort((a, b) => a.price - b.price);
    else if (sortBy === 'price-high') result.sort((a, b) => b.price - a.price);
    else if (sortBy === 'name-az') result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  }, [products, selectedCategory, searchQuery, sortBy]);

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="sort-wrapper">
            <SlidersHorizontal size={18} />
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="default">New Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-az">A-Z Name</option>
            </select>
          </div>
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
          ) : processedProducts.length > 0 ? (
            processedProducts.map((product, index) => (
              <div 
                key={product.id} 
                className="modern-product-card"
                style={{ animationDelay: `${index * 0.05}s` }}
                onClick={() => navigate(`/product/${product.id}`)}
              >
                <div className="card-image-wrapper">
                  <div className="rating-badge">
                    <Star size={12} fill="currentColor" />
                    <span>{product.rating || "4.5"}</span>
                  </div>
                  <img
                    src={product.image || (product.images && product.images[0]) || placeholder}
                    alt={product.name}
                    loading="lazy"
                  />
                </div>

                <div className="card-body">
                  <span className="card-category">{product.category}</span>
                  <h3>{product.name}</h3>
                  <div className="card-footer">
                    <p className="card-price">₹{Number(product.price).toLocaleString('en-IN')}</p>
                    <div className="card-btns" onClick={(e) => e.stopPropagation()}>
                      <button className="icon-btn add" title="Add to Cart" onClick={() => addToCart(product)}>
                        <ShoppingCart size={18} />
                      </button>
                      <button className="icon-btn buy" title="Buy Now" onClick={() => { addToCart(product); navigate('/cart'); }}>
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
      </div>
    </div>
  );
}

export default Products;