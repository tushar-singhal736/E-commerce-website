import React, { useEffect, useState } from 'react';
import API_BASE_URL, { apiFetch, getAdminHeaders, parseApiResponse } from '../utils/api';
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from '../utils/productImages';
import './AdminProducts.css';

function AdminProducts({ setToast }) {
  const [products, setProducts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const showToast = (text, type = 'error') => {
    if (setToast) setToast({ message: text, type });
    else window.alert(text);
  };
  const [form, setForm] = useState({
    name: '',
    price: '',
    category: '',
    stock: '',
    images: '',
    description: ''
  });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const resetForm = () => {
    setForm({ name: '', price: '', category: '', stock: '', images: '', description: '' });
    setEditing(null);
  };

  const fetchProducts = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await apiFetch('/api/products?limit=100&page=1');
      const payload = await parseApiResponse(res);
      setProducts(Array.isArray(payload) ? payload : payload.items || []);
    } catch (err) {
      console.error(err);
      showToast('Products load nahi hue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const submitEdit = async () => {
    setSaving(true);
    setMessage('');
    try {
      const imgArray = form.images.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`${API_BASE_URL}/api/admin/products/${editing}`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ...form,
          images: imgArray,
          price: Number(form.price),
          stock: Number(form.stock)
        })
      });
      const data = await parseApiResponse(res);

      const successMessage = 'Product updated successfully.';
      setMessage(successMessage);
      showToast(successMessage, 'success');
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      const text = err.message || 'Product update nahi hua.';
      setMessage(text);
      showToast(text, 'error');
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async () => {
    setSaving(true);
    setMessage('');
    try {
      const imgArray = form.images.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`${API_BASE_URL}/api/admin/products`, {
        method: 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ...form,
          images: imgArray,
          price: Number(form.price),
          stock: Number(form.stock),
          rating: 4.5,
          reviews: []
        })
      });
      const data = await parseApiResponse(res);

      const successMessage = 'Product created successfully.';
      setMessage(successMessage);
      showToast(successMessage, 'success');
      resetForm();
      fetchProducts();
    } catch (err) {
      console.error(err);
      const text = err.message || 'Product create nahi hua.';
      setMessage(text);
      showToast(text, 'error');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: getAdminHeaders()
      });
      if (res.ok) {
        const successMessage = 'Product deleted successfully.';
        setMessage(successMessage);
        showToast(successMessage, 'success');
        fetchProducts();
      } else {
        const data = await res.json().catch(() => ({}));
        const text = data.error || 'Delete failed.';
        setMessage(text);
        showToast(text, 'error');
      }
    } catch (err) {
      console.error(err);
      const text = 'Delete request failed.';
      setMessage(text);
      showToast(text, 'error');
    }
  };

  const startEdit = (product) => {
    setEditing(product.id);
    setForm({
      name: product.name || '',
      price: product.price || '',
      category: product.category || '',
      stock: product.stock || '',
      images: Array.isArray(product.images) ? product.images.join(', ') : '',
      description: product.description || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="admin-products-page">
      <div className="admin-products-container">
        <div className="admin-products-header">
          <h2>{editing ? 'Edit Product' : 'Add New Product'}</h2>
          <p>Manage your catalog with clean and quick controls.</p>
        </div>

        <div className="admin-products-form-grid">
          <input name="name" placeholder="Product Name" value={form.name} onChange={handleChange} />
          <input name="price" placeholder="Price" value={form.price} onChange={handleChange} />
          <input name="category" placeholder="Category" value={form.category} onChange={handleChange} />
          <input name="stock" placeholder="Stock" value={form.stock} onChange={handleChange} />
        </div>
        <input
          name="images"
          placeholder="Image URLs (comma separated)"
          value={form.images}
          onChange={handleChange}
          className="full-width-input"
        />
        <textarea
          name="description"
          placeholder="Description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="full-width-input"
        />

        <div className="admin-products-actions">
          <button className="btn-primary" onClick={editing ? submitEdit : submitCreate} disabled={saving}>
            {saving ? 'Saving...' : editing ? 'Update Product' : 'Create Product'}
          </button>
          {editing && <button className="btn-secondary" onClick={resetForm}>Cancel Edit</button>}
          <button className="btn-secondary" onClick={fetchProducts}>Refresh</button>
        </div>
        {message && <p className="admin-message">{message}</p>}

        <div className="admin-products-list-head">
          <h3>All Products ({products.length})</h3>
        </div>
        {loading ? <p className="loading-text">Loading...</p> : (
          <div className="admin-products-table-wrap">
            <table className="admin-products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Image</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>#{p.id}</td>
                    <td>
                      <img
                        className="admin-product-thumb"
                        src={getProductImage(p)}
                        alt={p.name}
                        onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                      />
                    </td>
                    <td>{p.name}</td>
                    <td>₹{p.price}</td>
                    <td>{p.stock}</td>
                    <td><span className="category-pill">{p.category}</span></td>
                    <td>
                      <button className="btn-table-edit" onClick={() => startEdit(p)}>Edit</button>
                      <button className="btn-table-delete" onClick={() => deleteProduct(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminProducts;
