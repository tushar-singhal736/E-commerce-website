import React from 'react';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './Wishlist.css';

function Wishlist({ wishlist = [], addToCart, removeFromWishlist, clearWishlist }) {
  const navigate = useNavigate();

  if (wishlist.length === 0) {
    return (
      <main className="wishlist-page">
        <section className="wishlist-empty">
          <div className="wishlist-empty-icon">
            <Heart size={34} />
          </div>
          <h1>Your wishlist is empty</h1>
          <p>Save products you like and compare them later before checkout.</p>
          <Link to="/products" className="wishlist-primary-link">Explore Products</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="wishlist-page">
      <section className="wishlist-header">
        <div>
          <span>Saved collection</span>
          <h1>My Wishlist</h1>
          <p>{wishlist.length} product{wishlist.length > 1 ? 's' : ''} saved for later.</p>
        </div>
        <button type="button" className="wishlist-clear" onClick={clearWishlist}>
          <Trash2 size={16} />
          Clear all
        </button>
      </section>

      <section className="wishlist-grid">
        {wishlist.map((product) => (
          <article className="wishlist-card" key={product.id} onClick={() => navigate(`/product/${product.id}`)}>
            <div className="wishlist-image">
              <img
                src={getProductImage(product)}
                alt={product.name}
                loading="lazy"
                onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
              />
              <span>{product.category || 'Product'}</span>
            </div>
            <div className="wishlist-body">
              <h2>{product.name}</h2>
              <p>{product.description || 'Saved product from SuperNova collection.'}</p>
              <div className="wishlist-price-row">
                <strong>Rs. {Number(product.price || 0).toLocaleString('en-IN')}</strong>
                <span>{Number(product.rating || 4.5).toFixed(1)} rating</span>
              </div>
              <div className="wishlist-actions" onClick={(event) => event.stopPropagation()}>
                <button type="button" className="wishlist-cart-btn" onClick={() => addToCart(product)}>
                  <ShoppingCart size={16} />
                  Add to cart
                </button>
                <button type="button" className="wishlist-remove-btn" onClick={() => removeFromWishlist(product.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Wishlist;
