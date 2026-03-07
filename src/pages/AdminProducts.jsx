import React, { useState } from 'react';

function AdminProducts() {
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', price: '', category: '', stock: '', images: '', description: '' });

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submitEdit = async () => {
    try {
      const imgArray = form.images.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch(`http://localhost:5001/api/admin/products/${editing}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, images: imgArray, price: Number(form.price) })
      });
      if (res.ok) alert('Product updated!');
    } catch (err) { console.error(err); }
  };

  const submitCreate = async () => {
    try {
      const imgArray = form.images.split(',').map(s => s.trim()).filter(Boolean);
      const res = await fetch('http://localhost:5001/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, images: imgArray, price: Number(form.price), rating: 0, reviews: [] })
      });
      if (res.ok) alert('Product created!');
    } catch (err) { console.error(err); }
  };

  return (
    <div className="admin-container" style={{padding: '20px'}}>
      <h2>{editing ? 'Edit Product' : 'Add New Product'}</h2>
      <input name="name" placeholder="Name" value={form.name} onChange={handleChange} /><br/>
      <input name="price" placeholder="Price" value={form.price} onChange={handleChange} /><br/>
      <input name="category" placeholder="Category" value={form.category} onChange={handleChange} /><br/>
      <input name="images" placeholder="Image URLs (comma separated)" value={form.images} onChange={handleChange} /><br/>
      <button onClick={editing ? submitEdit : submitCreate}>Save Product</button>
    </div>
  );
}

export default AdminProducts;