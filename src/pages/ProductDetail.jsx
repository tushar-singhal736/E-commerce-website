import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Zap, Minus, Plus, Star, ShieldCheck, Truck, RotateCcw } from 'lucide-react';
import './ProductDetail.css';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop';

function ProductDetail({ addToCart }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState("");
  const [qty, setQty] = useState(1); // Quantity state

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:5005/api/products`);
        const all = await res.json();
        const data = all.find(p => String(p.id) === String(id));
        if (data) {
          setProduct(data);
          setSelectedImage(data.images?.[0] || data.image || PLACEHOLDER);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchProduct();
  }, [id]);

  const validImages = useMemo(() => {
    if (!product) return [];
    let imgs = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    if (imgs.length === 0 && product.image) imgs.push(product.image);
    return imgs.length > 0 ? imgs : [PLACEHOLDER];
  }, [product]);

  // Quantity Badhane ka Function
  const incrementQty = () => {
    setQty(prev => prev + 1);
  };

  // Quantity Ghatane ka Function
  const decrementQty = () => {
    setQty(prev => (prev > 1 ? prev - 1 : 1));
  };

  if (loading) return <div className="loader-container"><div className="modern-spinner"></div></div>;
  if (!product) return <div className="error-screen"><h2>Product Not Found</h2></div>;

  return (
    <div className="modern-detail-container">
      <div className="product-grid">
        
        {/* Gallery */}
        <div className="gallery-column">
          <div className="main-viewer">
             <img src={selectedImage} alt={product.name} />
          </div>
          <div className="thumb-row" onMouseDown={(e) => e.preventDefault()}>
            {validImages.map((img, i) => (
              <div 
                key={i} 
                className={`modern-thumb ${selectedImage === img ? 'active' : ''}`}
                onClick={() => setSelectedImage(img)}
              >
                <img src={img} alt="thumbnail" />
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
          
          <div className="price-tag">
            <span className="currency">₹</span>
            {/* Price calculation based on quantity */}
            <span className="amount">{Number(product.price * qty).toLocaleString('en-IN')}</span>
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

          <div className="purchase-controls">
            <label className="qty-label">Quantity</label>
            <div className="qty-selector">
              <button type="button" onClick={decrementQty}><Minus size={16} /></button>
              <span className="qty-display">{qty}</span>
              <button type="button" onClick={incrementQty}><Plus size={16} /></button>
            </div>

            <div className="action-btns">
              <button className="add-to-cart" onClick={() => addToCart({...product, quantity: qty})}>
                <ShoppingBag size={20} /> Add to Bag
              </button>
              <button className="buy-now" onClick={() => { addToCart({...product, quantity: qty}); navigate('/cart'); }}>
                <Zap size={20} /> Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;