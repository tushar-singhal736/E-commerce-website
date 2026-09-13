import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, ShoppingBag, Clock3, IndianRupee, Tag, ArrowRight, Pencil, Trash2 } from 'lucide-react';
import API_BASE_URL, { getAdminHeaders, parseApiResponse } from '../utils/api';
import './AdminPanel.css';

const emptyCouponForm = {
  code: '',
  percent: 10,
  minOrderAmount: 0,
  maxUses: '',
  expiresAt: '',
  description: '',
  active: true,
};

function AdminPanel({ setToast }) {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });
  const [discountPercent, setDiscountPercent] = useState(0);
  const [saving, setSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState('');
  const [coupons, setCoupons] = useState([]);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponMsg, setCouponMsg] = useState('');
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const revenueRounded = useMemo(() => {
    const n = Number(stats.totalRevenue) || 0;
    return Math.round(n);
  }, [stats.totalRevenue]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        headers: getAdminHeaders()
      });
      const data = await parseApiResponse(res);
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/settings`);
      const data = await parseApiResponse(res);
      setDiscountPercent(Number(data?.discountPercent) || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRecentOrders = async () => {
    setOrdersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        headers: getAdminHeaders(),
      });
      const data = await parseApiResponse(res);
      const orders = Array.isArray(data) ? data : data.items || [];
      const sortedOrders = (orders || []).sort(
        (a, b) => new Date(b.createdAt || b.orderDate || 0).getTime() - new Date(a.createdAt || a.orderDate || 0).getTime()
      );
      setRecentOrders(sortedOrders.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    const refreshPanel = async () => {
      await Promise.all([fetchStats(), fetchRecentOrders()]);
    };

    refreshPanel();
    const intervalId = setInterval(refreshPanel, 8000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/coupons`, {
        headers: getAdminHeaders(),
      });
      const data = await parseApiResponse(res);
      setCoupons(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const resetCouponForm = () => {
    setCouponForm(emptyCouponForm);
    setEditingCouponId(null);
  };

  const startEditCoupon = (coupon) => {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code || '',
      percent: Number(coupon.percent) || 0,
      minOrderAmount: Number(coupon.minOrderAmount) || 0,
      maxUses: coupon.maxUses == null ? '' : String(coupon.maxUses),
      expiresAt: coupon.expiresAt ? String(coupon.expiresAt).slice(0, 10) : '',
      description: coupon.description || '',
      active: coupon.active !== false,
    });
    setCouponMsg('');
  };

  const saveCoupon = async () => {
    setCouponSaving(true);
    setCouponMsg('');
    try {
      const payload = {
        code: String(couponForm.code || '').trim().toUpperCase(),
        percent: Number(couponForm.percent) || 0,
        minOrderAmount: Number(couponForm.minOrderAmount) || 0,
        maxUses: couponForm.maxUses === '' ? null : Number(couponForm.maxUses),
        expiresAt: couponForm.expiresAt ? new Date(couponForm.expiresAt).toISOString() : null,
        description: String(couponForm.description || '').trim(),
        active: Boolean(couponForm.active),
      };
      const url = editingCouponId
        ? `${API_BASE_URL}/api/admin/coupons/${editingCouponId}`
        : `${API_BASE_URL}/api/admin/coupons`;
      const res = await fetch(url, {
        method: editingCouponId ? 'PUT' : 'POST',
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      });
      await parseApiResponse(res);
      setCouponMsg(editingCouponId ? 'Coupon updated.' : 'Coupon created.');
      setToast?.({ message: editingCouponId ? 'Coupon updated' : 'Coupon created', type: 'success' });
      resetCouponForm();
      fetchCoupons();
    } catch (err) {
      console.error(err);
      setCouponMsg(err.message || 'Coupon save failed.');
      setToast?.({ message: err.message || 'Coupon save failed', type: 'error' });
    } finally {
      setCouponSaving(false);
    }
  };

  const deleteCoupon = async (couponId) => {
    if (!window.confirm('Delete this coupon?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/coupons/${couponId}`, {
        method: 'DELETE',
        headers: getAdminHeaders(),
      });
      await parseApiResponse(res);
      setToast?.({ message: 'Coupon deleted', type: 'success' });
      if (editingCouponId === couponId) resetCouponForm();
      fetchCoupons();
    } catch (err) {
      console.error(err);
      setToast?.({ message: err.message || 'Delete failed', type: 'error' });
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSettingsMsg('');
    try {
      const clean = Math.max(0, Math.min(90, Number(discountPercent) || 0));
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: getAdminHeaders(),
        body: JSON.stringify({ discountPercent: clean })
      });
      const data = await parseApiResponse(res);
      setDiscountPercent(Number(data?.discountPercent) || 0);
      setSettingsMsg('Discount updated.');
      fetchStats();
    } catch (err) {
      console.error(err);
      setSettingsMsg(err.message || 'Discount update failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-panel-page">
      <div className="admin-panel-container">
        <div className="admin-panel-hero">
          <div>
            <h1>Admin Dashboard</h1>
            <p>Manage products, discounts, and monitor orders in one place.</p>
          </div>
        </div>

        <div className="admin-kpi-grid">
          <div className="admin-kpi-card">
            <div className="admin-kpi-icon kpi-blue"><Package size={18} /></div>
            <div className="admin-kpi-body">
              <span className="admin-kpi-label">Total Products</span>
              <div className="admin-kpi-value">{stats.totalProducts}</div>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon kpi-violet"><ShoppingBag size={18} /></div>
            <div className="admin-kpi-body">
              <span className="admin-kpi-label">Total Orders</span>
              <div className="admin-kpi-value">{stats.totalOrders}</div>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon kpi-amber"><Clock3 size={18} /></div>
            <div className="admin-kpi-body">
              <span className="admin-kpi-label">Pending Orders</span>
              <div className="admin-kpi-value">{stats.pendingOrders}</div>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-icon kpi-green"><IndianRupee size={18} /></div>
            <div className="admin-kpi-body">
              <span className="admin-kpi-label">Revenue</span>
              <div className="admin-kpi-value">
                ₹{revenueRounded.toLocaleString('en-IN')}
              </div>
              <span className="admin-kpi-subtext">rounded</span>
            </div>
          </div>
        </div>

        <div className="admin-card admin-order-preview-card">
          <div className="admin-card-head">
            <div className="admin-card-title">
              <span className="admin-card-icon"><ShoppingBag size={16} /></span>
              <h3>Recent Orders</h3>
            </div>
            <button className="admin-btn-secondary" onClick={fetchRecentOrders} disabled={ordersLoading}>
              {ordersLoading ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
          <p className="admin-card-sub">
            Orders aate hi yahan dikh jayenge. Full order management ke liye button se Admin Orders page par jayein.
          </p>

          {ordersLoading ? (
            <p className="admin-info-text">Loading latest orders…</p>
          ) : recentOrders.length === 0 ? (
            <div className="admin-empty-state">
              <h2>No recent orders yet</h2>
              <p>Customers ka order place karne par yahan entries aa jayengi.</p>
            </div>
          ) : (
            <div className="admin-order-preview-table-wrap">
              <table className="admin-order-preview-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr key={order.orderId}>
                      <td>{order.orderId}</td>
                      <td>{order.userEmail || order.customer?.email || 'Guest'}</td>
                      <td>₹{Number(order.total || order.summary?.totalPayable || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`admin-pill ${order.status && order.status.toLowerCase().includes('delivered') ? 'pill-green' : order.status && order.status.toLowerCase().includes('cancel') ? 'pill-red' : 'pill-blue'}`}>
                        {order.status || 'Processing'}
                      </span></td>
                      <td>{new Date(order.orderDate || order.createdAt || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="admin-card-footer">
            <Link to="/admin/orders" className="admin-link-cta">
              Open Admin Orders <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="admin-panel-grid">
          <div className="admin-card">
            <div className="admin-card-head">
              <div className="admin-card-title">
                <span className="admin-card-icon"><Tag size={16} /></span>
                <h3>Store Discount</h3>
              </div>
              {settingsMsg && (
                <span className={`admin-pill ${/fail/i.test(settingsMsg) ? 'pill-red' : 'pill-green'}`}>
                  {settingsMsg}
                </span>
              )}
            </div>
            <p className="admin-card-sub">
              Ye discount cart/checkout me auto‑apply hoga. <strong>0%</strong> = off.
            </p>

            <div className="admin-discount-row">
              <label className="admin-field">
                <span>Discount %</span>
                <input
                  type="number"
                  min={0}
                  max={90}
                  step={1}
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="e.g. 10"
                />
              </label>
              <button className="admin-btn-primary" onClick={saveSettings} disabled={saving}>
                {saving ? 'Saving…' : 'Save Discount'}
              </button>
            </div>
          </div>

          <div className="admin-card admin-links">
            <Link to="/admin/products" className="admin-link-card">
              <div className="admin-link-top">
                <div className="admin-link-icon blue"><Package size={18} /></div>
                <div className="admin-link-text">
                  <h3>Product Management</h3>
                  <p>Add, edit, and delete product catalog items.</p>
                </div>
              </div>
              <span className="admin-link-cta">Open <ArrowRight size={16} /></span>
            </Link>

            <Link to="/admin/orders" className="admin-link-card">
              <div className="admin-link-top">
                <div className="admin-link-icon violet"><ShoppingBag size={18} /></div>
                <div className="admin-link-text">
                  <h3>Order Management</h3>
                  <p>View and track all customer orders.</p>
                </div>
              </div>
              <span className="admin-link-cta">Open <ArrowRight size={16} /></span>
            </Link>
          </div>
        </div>

        <div className="admin-card admin-coupon-card">
          <div className="admin-card-head">
            <div className="admin-card-title">
              <span className="admin-card-icon"><Tag size={16} /></span>
              <h3>Coupon Codes</h3>
            </div>
            {couponMsg && (
              <span className={`admin-pill ${/fail/i.test(couponMsg) ? 'pill-red' : 'pill-green'}`}>
                {couponMsg}
              </span>
            )}
          </div>
          <p className="admin-card-sub">
            Cart page par customers yeh codes apply kar sakte hain. Store-wide discount active ho to coupon override nahi hota.
          </p>

          <div className="admin-coupon-form-grid">
            <label className="admin-field">
              <span>Code</span>
              <input
                value={couponForm.code}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="SUMMER25"
              />
            </label>
            <label className="admin-field">
              <span>Discount %</span>
              <input
                type="number"
                min={1}
                max={90}
                value={couponForm.percent}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, percent: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span>Min order (₹)</span>
              <input
                type="number"
                min={0}
                value={couponForm.minOrderAmount}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
              />
            </label>
            <label className="admin-field">
              <span>Max uses</span>
              <input
                type="number"
                min={1}
                value={couponForm.maxUses}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, maxUses: e.target.value }))}
                placeholder="Unlimited"
              />
            </label>
            <label className="admin-field">
              <span>Expires</span>
              <input
                type="date"
                value={couponForm.expiresAt}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
              />
            </label>
            <label className="admin-field admin-field--wide">
              <span>Description</span>
              <input
                value={couponForm.description}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Short note for admin / chatbot"
              />
            </label>
            <label className="admin-field admin-field--checkbox">
              <input
                type="checkbox"
                checked={couponForm.active}
                onChange={(e) => setCouponForm((prev) => ({ ...prev, active: e.target.checked }))}
              />
              <span>Active</span>
            </label>
          </div>

          <div className="admin-coupon-actions">
            <button className="admin-btn-primary" onClick={saveCoupon} disabled={couponSaving}>
              {couponSaving ? 'Saving…' : editingCouponId ? 'Update Coupon' : 'Add Coupon'}
            </button>
            {editingCouponId && (
              <button type="button" className="admin-btn-secondary" onClick={resetCouponForm}>
                Cancel edit
              </button>
            )}
          </div>

          <div className="admin-coupon-table-wrap">
            <table className="admin-coupon-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Off</th>
                  <th>Min</th>
                  <th>Used</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="admin-coupon-empty">No coupons yet.</td>
                  </tr>
                ) : coupons.map((coupon) => (
                  <tr key={coupon.id}>
                    <td>
                      <strong>{coupon.code}</strong>
                      {coupon.description && <small>{coupon.description}</small>}
                    </td>
                    <td>{coupon.percent}%</td>
                    <td>₹{Number(coupon.minOrderAmount) || 0}</td>
                    <td>
                      {Number(coupon.usedCount) || 0}
                      {coupon.maxUses != null ? ` / ${coupon.maxUses}` : ''}
                    </td>
                    <td>
                      <span className={`admin-pill ${coupon.active ? 'pill-green' : 'pill-red'}`}>
                        {coupon.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="admin-coupon-row-actions">
                      <button type="button" className="admin-icon-btn" onClick={() => startEditCoupon(coupon)} title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button type="button" className="admin-icon-btn danger" onClick={() => deleteCoupon(coupon.id)} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;
