import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import "./Orders.css";

/* ─── Constants ─────────────────────────────────────────────── */

const PLACEHOLDER_IMG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">' +
  '<rect width="100%" height="100%" fill="%23f3f4f6"/>' +
  '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999" font-size="20">No Image</text>' +
  '</svg>';

const CANCEL_REASONS = [
  "Changed my mind",
  "Found better price elsewhere",
  "Ordered by mistake",
  "Delayed delivery",
  "Duplicate order",
];

const RETURN_REASONS = [
  "Damaged product received",
  "Wrong item delivered",
  "Product not as described",
  "Missing parts / accessories",
  "Quality not satisfactory",
];

/* ─── Helpers ────────────────────────────────────────────────── */

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getOrderStatus(order) {
  if (order.status === "returned")  return "Returned";
  if (order.status === "cancelled") return "Cancelled";
  const days = Math.floor(
    (Date.now() - new Date(order.orderDate).getTime()) / 86400000
  );
  if (days >= 7) return "Delivered";
  if (days >= 3) return "Shipped";
  return "Processing";
}

function getTrackingSteps(status) {
  const ALL = [
    { key: "ordered",          label: "Order Placed",      icon: "📦", desc: "We received your order" },
    { key: "confirmed",        label: "Confirmed",          icon: "✅", desc: "Order confirmed" },
    { key: "shipped",          label: "Shipped",            icon: "🚚", desc: "Package on its way" },
    { key: "out_for_delivery", label: "Out for Delivery",   icon: "📍", desc: "Arriving today" },
    { key: "delivered",        label: "Delivered",          icon: "🎉", desc: "Package delivered" },
  ];

  const DONE_MAP = {
    Processing: ["ordered"],
    Shipped:    ["ordered", "confirmed", "shipped"],
    Delivered:  ["ordered", "confirmed", "shipped", "out_for_delivery", "delivered"],
  };

  const ACTIVE_MAP = {
    Processing: "confirmed",
    Shipped:    "out_for_delivery",
    Delivered:  null,
  };

  const done   = DONE_MAP[status]  || ["ordered"];
  const active = ACTIVE_MAP[status] ?? null;

  return ALL.map((s) => ({
    ...s,
    completed: done.includes(s.key),
    active:    s.key === active,
  }));
}

/* ─── Empty bank-detail state ────────────────────────────────── */
const EMPTY_BANK = {
  accountHolder:        "",
  accountNumber:        "",
  confirmAccountNumber: "",
  ifsc:                 "",
  bankName:             "",
  upiId:                "",
  refundMode:           "bank",
};

/* ════════════════════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════════════════════ */
function Orders({ orders = [], returnOrder, cancelOrder, submitFeedback }) {
  const location = useLocation();

  const [productsMap, setProductsMap]   = useState({});
  const [expanded,    setExpanded]      = useState(null);
  const [ratings,     setRatings]       = useState({});

  /* modal state — renamed to avoid shadowing map-variable "step" */
  const [modalType,    setModalType]    = useState(null); // 'cancel' | 'return'
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason,       setReason]       = useState("");
  const [modalStep,    setModalStep]    = useState(1);   // 1 | 2 | 3
  const [bankDetails,  setBankDetails]  = useState(EMPTY_BANK);
  const [bankErrors,   setBankErrors]   = useState({});

  /* ── open order from navigation state ── */
  useEffect(() => {
    if (location.state?.openOrderId) {
      setExpanded(location.state.openOrderId);
    }
  }, [location.state]);

  /* ── load product images ── */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res  = await fetch("http://localhost:5001/api/products");
        const data = await res.json();
        if (!alive) return;
        const map = {};
        data.forEach((p) => { map[p.id] = p; });
        setProductsMap(map);
      } catch (err) {
        console.error("Failed to load products", err);
      }
    })();
    return () => { alive = false; };
  }, []);

  /* ── rating ── */
  const handleRating = (orderId, rate) => {
    setRatings((prev) => ({ ...prev, [orderId]: rate }));
    if (submitFeedback) submitFeedback(orderId, rate);
  };

  /* ── open modal ── */
  const openModal = (e, order, type) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setModalType(type);
    setModalStep(1);
    setReason("");
    setBankDetails(EMPTY_BANK);
    setBankErrors({});
  };

  /* ── close modal ── */
  const closeModal = () => {
    setModalType(null);
    setSelectedOrder(null);
    setModalStep(1);
    setReason("");
    setBankErrors({});
  };

  /* ── bank validation ── */
  const validateBank = () => {
    const errs = {};
    if (bankDetails.refundMode === "bank") {
      if (!bankDetails.accountHolder.trim())
        errs.accountHolder = "Account holder name required";
      if (!/^\d{9,18}$/.test(bankDetails.accountNumber))
        errs.accountNumber = "Enter valid account number (9–18 digits)";
      if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber)
        errs.confirmAccountNumber = "Account numbers do not match";
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifsc.toUpperCase()))
        errs.ifsc = "Enter valid IFSC (e.g. SBIN0001234)";
      if (!bankDetails.bankName.trim())
        errs.bankName = "Bank name required";
    } else {
      if (!bankDetails.upiId.trim() || !bankDetails.upiId.includes("@"))
        errs.upiId = "Enter valid UPI ID (e.g. name@upi)";
    }
    setBankErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── modal next step ── */
  const handleNextStep = () => {
    if (modalStep === 1) {
      if (!reason) { alert("Please select a reason"); return; }
      if (modalType === "cancel") {
        if (cancelOrder) cancelOrder(selectedOrder.orderId, reason);
        setModalStep(3);
      } else {
        setModalStep(2);
      }
    } else if (modalStep === 2) {
      if (!validateBank()) return;
      if (returnOrder) returnOrder(selectedOrder.orderId, reason, bankDetails);
      setModalStep(3);
    }
  };

  /* ── invoice PDF ── */
  const downloadInvoice = (order) => {
    const doc    = new jsPDF();
    const status = getOrderStatus(order);
    const pageW  = doc.internal.pageSize.getWidth();
    const pageH  = doc.internal.pageSize.getHeight();

    // Use "Rs." instead of rupee unicode — jsPDF helvetica cannot render \u20B9
    const fmt = (n) => `Rs. ${Number(n).toFixed(2)}`;

    /* ── HEADER BAR ── */
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 42, "F");

    // Brand / title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 14, 22);

    // Tagline
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("Your Store Name", 14, 30);

    // Order + date on right
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text(
      `Order #${order.orderId.slice(-6).toUpperCase()}`,
      pageW - 14, 18, { align: "right" }
    );
    doc.text(
      `Date: ${formatDate(order.orderDate)}`,
      pageW - 14, 27, { align: "right" }
    );

    // Status chip
    const chipColorMap = {
      Delivered: [16, 185, 129],
      Cancelled: [239, 68,  68],
      Returned:  [245, 158, 11],
      Shipped:   [59,  130, 246],
    };
    const chipRGB = chipColorMap[status] || [100, 116, 139];
    doc.setFillColor(...chipRGB);
    doc.roundedRect(pageW - 54, 33, 40, 9, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(status.toUpperCase(), pageW - 34, 39, { align: "center" });

    /* ── CUSTOMER INFO BOX ── */
    const boxTop = 50;
    const halfW  = (pageW - 28) / 2;

    // Left: Bill To
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, boxTop, halfW, 44, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, boxTop, halfW, 44, 3, 3, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("BILL TO", 20, boxTop + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(order.userName || "Customer", 20, boxTop + 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    let bY = boxTop + 25;
    if (order.userEmail) {
      doc.text(order.userEmail, 20, bY);
      bY += 7;
    }
    if (order.userPhone) {
      doc.text(`Phone: ${order.userPhone}`, 20, bY);
    }

    // Right: Ship To / Payment Info
    const rightX = 14 + halfW + 4;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(rightX, boxTop, halfW, 44, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(rightX, boxTop, halfW, 44, 3, 3, "S");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(100, 116, 139);
    doc.text("PAYMENT INFO", rightX + 6, boxTop + 8);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(15, 23, 42);
    let pY = boxTop + 17;
    doc.text(
      `Method: ${order.paymentMethod || "Online (Razorpay)"}`,
      rightX + 6, pY
    );
    pY += 8;
    doc.text(`Status: ${status}`, rightX + 6, pY);
    pY += 8;
    if (order.razorpayPaymentId) {
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      const txnText = `Txn: ${order.razorpayPaymentId}`;
      const wrapped = doc.splitTextToSize(txnText, halfW - 12);
      doc.text(wrapped, rightX + 6, pY);
    }

    // Ship-to address if available
    if (order.address) {
      const addr =
        typeof order.address === "string"
          ? order.address
          : [
              order.address.line1,
              order.address.city,
              order.address.state,
              order.address.pincode,
            ]
              .filter(Boolean)
              .join(", ");
      // Append address below payment block
      const addrY = boxTop + 44 + 8;
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, addrY, pageW - 28, 18, 3, 3, "F");
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(14, addrY, pageW - 28, 18, 3, 3, "S");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 116, 139);
      doc.text("SHIP TO", 20, addrY + 7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      const wrappedAddr = doc.splitTextToSize(addr, pageW - 60);
      doc.text(wrappedAddr, 48, addrY + 7);
    }

    /* ── ITEMS TABLE ── */
    const tableStartY = order.address ? boxTop + 44 + 8 + 18 + 6 : boxTop + 44 + 8;

    const tableResult = autoTable(doc, {
      startY: tableStartY,
      head: [["#", "Product", "Qty", "Unit Price", "Total"]],
      body: order.items.map((item, i) => [
        i + 1,
        item.name,
        item.quantity,
        fmt(item.price),
        fmt(item.quantity * item.price),
      ]),
      headStyles: {
        fillColor:  [15, 23, 42],
        textColor:  255,
        fontStyle:  "bold",
        fontSize:   9,
        cellPadding: 5,
      },
      bodyStyles: {
        fontSize:   9,
        textColor:  [30, 41, 59],
        cellPadding: 4,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10,  halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 18,  halign: "center" },
        3: { cellWidth: 32,  halign: "right" },
        4: { cellWidth: 32,  halign: "right" },
      },
      margin: { left: 14, right: 14 },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.3,
    });

    /* ── TOTALS SECTION ── */
    const subtotal = order.items.reduce(
      (acc, item) => acc + item.quantity * item.price, 0
    );
    const discount  = Number(order.discountAmount) || 0;
    const delivery  = Number(order.deliveryCharge) || 0;

    let ty = (doc.lastAutoTable?.finalY ?? tableResult?.finalY ?? 150) + 8;
    const totalsX     = pageW - 90;
    const totalsWidth = 76;

    // Background box for totals
    const totalRows = 1 + (discount > 0 ? 1 : 0) + (delivery > 0 ? 1 : 0) + 1;
    const boxH = totalRows * 9 + 22;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsX - 2, ty - 4, totalsWidth + 2, boxH, 3, 3, "F");

    // Subtotal row
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Subtotal",            totalsX + 4,           ty + 2);
    doc.text(fmt(subtotal),         totalsX + totalsWidth,  ty + 2, { align: "right" });
    ty += 9;

    // Discount row
    if (discount > 0) {
      doc.setTextColor(22, 163, 74);
      doc.text("Discount",                  totalsX + 4,           ty + 2);
      doc.text(`- ${fmt(discount)}`,        totalsX + totalsWidth,  ty + 2, { align: "right" });
      doc.setTextColor(71, 85, 105);
      ty += 9;
    }

    // Delivery row
    if (delivery > 0) {
      doc.setTextColor(71, 85, 105);
      doc.text("Delivery",         totalsX + 4,           ty + 2);
      doc.text(fmt(delivery),      totalsX + totalsWidth,  ty + 2, { align: "right" });
      ty += 9;
    }

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(totalsX, ty + 1, totalsX + totalsWidth, ty + 1);
    ty += 6;

    // Grand Total row — dark chip
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(totalsX - 2, ty - 3, totalsWidth + 2, 13, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Grand Total",             totalsX + 4,           ty + 6);
    doc.text(fmt(order.total),          totalsX + totalsWidth,  ty + 6, { align: "right" });

    /* ── PAYMENT LINE ── */
    if (order.razorpayPaymentId) {
      ty += 20;
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, ty, pageW - 28, 11, 2, 2, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(22, 101, 52);
      doc.text(
        `Payment confirmed  |  Txn ID: ${order.razorpayPaymentId}`,
        pageW / 2, ty + 7, { align: "center" }
      );
    }

    /* ── FOOTER ── */
    doc.setFillColor(15, 23, 42);
    doc.rect(0, pageH - 22, pageW, 22, "F");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text("Thank you for shopping with us!", pageW / 2, pageH - 13, { align: "center" });
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(148, 163, 184);
    doc.text("support@yourstore.com  |  www.yourstore.com", pageW / 2, pageH - 6, { align: "center" });

    doc.save(`Invoice_${order.orderId.slice(-6).toUpperCase()}.pdf`);
  };

  /* ── image resolver ── */
  const resolveImg = (item) =>
    item.image ||
    item.images?.[0] ||
    productsMap[item.id]?.images?.[0] ||
    PLACEHOLDER_IMG;

  /* ════════════════════════════════════════
     RENDER
  ════════════════════════════════════════ */
  return (
    <div className="orders-page">
      <div className="orders-container">
        <h1 className="page-title">My Orders</h1>

        {orders.length === 0 && (
          <div className="empty-orders">
            <div className="empty-icon">🛍️</div>
            <h3>No orders yet</h3>
            <p>Your orders will appear here once you place them.</p>
          </div>
        )}

        <div className="orders-list">
          {orders.map((order) => {
            const status      = getOrderStatus(order);
            const isOpen      = expanded === order.orderId;
            const isCancelled = status === "Cancelled";
            const isReturned  = status === "Returned";
            const tSteps      = getTrackingSteps(status);

            return (
              <div
                key={order.orderId}
                className={[
                  "order-card",
                  isOpen      ? "active"         : "",
                  isCancelled ? "cancelled-card" : "",
                  isReturned  ? "returned-card"  : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {/* ── Card Header ── */}
                <div
                  className="order-summary-header"
                  onClick={() => setExpanded(isOpen ? null : order.orderId)}
                >
                  <div className="header-left">
                    {/* thumb stack */}
                    <div className="order-thumb-stack">
                      {order.items.slice(0, 3).map((item, i) => (
                        <img
                          key={i}
                          src={resolveImg(item)}
                          alt={item.name}
                          className="thumb-mini"
                          style={{ marginLeft: i ? -10 : 0, zIndex: 3 - i }}
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = PLACEHOLDER_IMG;
                          }}
                        />
                      ))}
                      {order.items.length > 3 && (
                        <div className="thumb-more">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>

                    <div className="main-info">
                      <span className="order-no">
                        Order #{order.orderId.slice(-6).toUpperCase()}
                      </span>
                      <span className="order-date">
                        {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""} ·{" "}
                        {formatDate(order.orderDate)}
                      </span>
                    </div>
                  </div>

                  <div className="header-right">
                    <span className="order-total-preview">₹{order.total}</span>
                    <span
                      className={`status-badge ${status
                        .toLowerCase()
                        .replace(/ /g, "-")}`}
                    >
                      {status}
                    </span>
                    <span
                      className={`chevron-icon${isOpen ? " rotate" : ""}`}
                    >
                      ▼
                    </span>
                  </div>
                </div>

                {/* ── Expanded Content ── */}
                {isOpen && (
                  <div className="order-details-content">

                    {/* Tracking */}
                    {!isCancelled && !isReturned && (
                      <div className="tracking-section">
                        <h4 className="section-label">📦 Order Tracking</h4>
                        <div className="stepper-container">
                          {tSteps.map((ts, idx) => (
                            <div
                              key={ts.key}
                              className={[
                                "step-item",
                                ts.completed ? "completed" : "",
                                ts.active    ? "active"    : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                            >
                              {/* left connector */}
                              <div className="step-connector-left">
                                {idx > 0 && (
                                  <div
                                    className={`connector-line${
                                      tSteps[idx - 1].completed ? " filled" : ""
                                    }`}
                                  />
                                )}
                              </div>

                              {/* dot */}
                              <div className="step-dot-wrap">
                                <div className="step-dot">
                                  {ts.completed && (
                                    <span className="step-check">✓</span>
                                  )}
                                  {ts.active && (
                                    <span className="step-pulse" />
                                  )}
                                </div>
                              </div>

                              {/* right connector */}
                              <div className="step-connector-right">
                                {idx < tSteps.length - 1 && (
                                  <div
                                    className={`connector-line${
                                      ts.completed ? " filled" : ""
                                    }`}
                                  />
                                )}
                              </div>

                              {/* label */}
                              <div className="step-label-wrap">
                                <span className="step-icon">{ts.icon}</span>
                                <p className="step-name">{ts.label}</p>
                                <p className="step-desc">{ts.desc}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cancelled / Returned notice */}
                    {(isCancelled || isReturned) && (
                      <div
                        className={`notice-banner ${
                          isCancelled ? "cancel-notice" : "return-notice"
                        }`}
                      >
                        <span className="notice-icon">
                          {isCancelled ? "❌" : "↩️"}
                        </span>
                        <div>
                          <strong>
                            Order{" "}
                            {isCancelled ? "Cancelled" : "Return Initiated"}
                          </strong>
                          <p>
                            {isCancelled
                              ? "Refund (if applicable) will be credited within 5–7 business days."
                              : "Return in process. Refund within 7–10 business days to your provided account."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Items */}
                    <div className="items-list">
                      <h4 className="section-label">🛍️ Items</h4>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="item-row">
                          <img
                            src={resolveImg(item)}
                            alt={item.name}
                            className="product-img"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = PLACEHOLDER_IMG;
                            }}
                          />
                          <div className="item-info">
                            <p className="item-name">{item.name}</p>
                            <p className="item-meta">
                              Qty: {item.quantity} &nbsp;·&nbsp; ₹{item.price}{" "}
                              each
                            </p>
                          </div>
                          <div className="item-total">
                            ₹{(item.quantity * item.price).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order summary */}
                    <div className="order-summary-box">
                      <div className="summary-row">
                        <span>Subtotal</span>
                        <span>
                          ₹
                          {order.items
                            .reduce(
                              (s, i) => s + i.quantity * i.price,
                              0
                            )
                            .toFixed(2)}
                        </span>
                      </div>

                      {Number(order.discountAmount) > 0 && (
                        <div className="summary-row discount">
                          <span>Discount</span>
                          <span>
                            -₹{Number(order.discountAmount).toFixed(2)}
                          </span>
                        </div>
                      )}

                      {Number(order.deliveryCharge) > 0 && (
                        <div className="summary-row">
                          <span>Delivery</span>
                          <span>
                            ₹{Number(order.deliveryCharge).toFixed(2)}
                          </span>
                        </div>
                      )}

                      <div className="summary-row total-row">
                        <span>Total Paid</span>
                        <span>₹{Number(order.total).toFixed(2)}</span>
                      </div>

                      {(order.paymentMethod || order.razorpayPaymentId) && (
                        <div className="payment-info-row">
                          <span className="pay-icon">💳</span>
                          <span>
                            {order.paymentMethod || "Razorpay"}
                            {order.razorpayPaymentId && (
                              <span className="txn-id">
                                &nbsp;· Txn: {order.razorpayPaymentId}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer — rating + actions */}
                    <div className="order-footer-grid">
                      {status === "Delivered" && (
                        <div className="feedback-box">
                          <p>Rate your experience</p>
                          <div className="stars">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <span
                                key={n}
                                className={`star${
                                  (ratings[order.orderId] || 0) >= n
                                    ? " active"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleRating(order.orderId, n)
                                }
                              >
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="action-area">
                        <button
                          className="btn-invoice"
                          onClick={() => downloadInvoice(order)}
                        >
                          <span>⬇</span> Invoice
                        </button>

                        {status === "Processing" && (
                          <button
                            className="btn-danger"
                            onClick={(e) => openModal(e, order, "cancel")}
                          >
                            ✕ Cancel Order
                          </button>
                        )}

                        {status === "Delivered" && (
                          <button
                            className="btn-return"
                            onClick={(e) => openModal(e, order, "return")}
                          >
                            ↩ Return Items
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════
          MODAL
      ════════════════════════════════════════ */}
      {modalType && (
        <div className="modal-overlay" onClick={closeModal}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header / step indicator */}
            {modalStep < 3 && (
              <div className="modal-header">
                <div className="modal-steps-indicator">
                  {modalType === "return" ? (
                    <>
                      <span className={`ms${modalStep >= 1 ? " done" : ""}`}>
                        1. Reason
                      </span>
                      <span className="ms-sep">›</span>
                      <span className={`ms${modalStep >= 2 ? " done" : ""}`}>
                        2. Refund Details
                      </span>
                    </>
                  ) : (
                    <span className="ms done">Cancel Order</span>
                  )}
                </div>
                <button className="modal-close" onClick={closeModal}>
                  ✕
                </button>
              </div>
            )}

            {/* ── Step 1 — Reason ── */}
            {modalStep === 1 && (
              <div className="modal-body">
                <h3 className="modal-title">
                  {modalType === "cancel" ? "❌ Cancel Order" : "↩️ Return Order"}
                </h3>
                <p className="modal-subtitle">
                  Order #{selectedOrder?.orderId.slice(-6).toUpperCase()}
                </p>

                <label className="field-label">Select Reason</label>
                <div className="reason-list">
                  {(modalType === "cancel"
                    ? CANCEL_REASONS
                    : RETURN_REASONS
                  ).map((r) => (
                    <label
                      key={r}
                      className={`reason-item${reason === r ? " selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="modal-reason"
                        value={r}
                        checked={reason === r}
                        onChange={() => setReason(r)}
                      />
                      {r}
                    </label>
                  ))}
                </div>

                {modalType === "cancel" && (
                  <div className="refund-note">
                    💰 Refund will be credited to your original payment method
                    within 5–7 business days.
                  </div>
                )}

                <div className="modal-btns">
                  <button className="btn-text" onClick={closeModal}>
                    Back
                  </button>
                  <button
                    className="btn-confirm"
                    onClick={handleNextStep}
                    disabled={!reason}
                  >
                    {modalType === "cancel" ? "Confirm Cancel" : "Next →"}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2 — Bank / UPI details (return only) ── */}
            {modalStep === 2 && modalType === "return" && (
              <div className="modal-body">
                <h3 className="modal-title">💳 Refund Details</h3>
                <p className="modal-subtitle">
                  Refund amount:{" "}
                  <strong>₹{selectedOrder?.total}</strong>
                </p>

                {/* Bank / UPI toggle */}
                <div className="refund-mode-toggle">
                  <button
                    className={`mode-btn${
                      bankDetails.refundMode === "bank" ? " active" : ""
                    }`}
                    onClick={() =>
                      setBankDetails((b) => ({ ...b, refundMode: "bank" }))
                    }
                  >
                    🏦 Bank Account
                  </button>
                  <button
                    className={`mode-btn${
                      bankDetails.refundMode === "upi" ? " active" : ""
                    }`}
                    onClick={() =>
                      setBankDetails((b) => ({ ...b, refundMode: "upi" }))
                    }
                  >
                    📲 UPI
                  </button>
                </div>

                {bankDetails.refundMode === "bank" ? (
                  <div className="bank-form">
                    {/* Account Holder */}
                    <div className="form-group">
                      <label>Account Holder Name *</label>
                      <input
                        type="text"
                        placeholder="As per bank records"
                        value={bankDetails.accountHolder}
                        onChange={(e) =>
                          setBankDetails((b) => ({
                            ...b,
                            accountHolder: e.target.value,
                          }))
                        }
                      />
                      {bankErrors.accountHolder && (
                        <span className="err">{bankErrors.accountHolder}</span>
                      )}
                    </div>

                    {/* Account Number */}
                    <div className="form-group">
                      <label>Account Number *</label>
                      <input
                        type="password"
                        placeholder="Enter account number"
                        value={bankDetails.accountNumber}
                        onChange={(e) =>
                          setBankDetails((b) => ({
                            ...b,
                            accountNumber: e.target.value,
                          }))
                        }
                      />
                      {bankErrors.accountNumber && (
                        <span className="err">{bankErrors.accountNumber}</span>
                      )}
                    </div>

                    {/* Confirm Account Number */}
                    <div className="form-group">
                      <label>Confirm Account Number *</label>
                      <input
                        type="text"
                        placeholder="Re-enter account number"
                        value={bankDetails.confirmAccountNumber}
                        onChange={(e) =>
                          setBankDetails((b) => ({
                            ...b,
                            confirmAccountNumber: e.target.value,
                          }))
                        }
                      />
                      {bankErrors.confirmAccountNumber && (
                        <span className="err">
                          {bankErrors.confirmAccountNumber}
                        </span>
                      )}
                    </div>

                    {/* IFSC + Bank Name */}
                    <div className="form-row-2">
                      <div className="form-group">
                        <label>IFSC Code *</label>
                        <input
                          type="text"
                          placeholder="e.g. SBIN0001234"
                          value={bankDetails.ifsc}
                          onChange={(e) =>
                            setBankDetails((b) => ({
                              ...b,
                              ifsc: e.target.value.toUpperCase(),
                            }))
                          }
                        />
                        {bankErrors.ifsc && (
                          <span className="err">{bankErrors.ifsc}</span>
                        )}
                      </div>
                      <div className="form-group">
                        <label>Bank Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. State Bank of India"
                          value={bankDetails.bankName}
                          onChange={(e) =>
                            setBankDetails((b) => ({
                              ...b,
                              bankName: e.target.value,
                            }))
                          }
                        />
                        {bankErrors.bankName && (
                          <span className="err">{bankErrors.bankName}</span>
                        )}
                      </div>
                    </div>

                    <div className="secure-note">
                      🔒 Your bank details are encrypted and used only for
                      this refund.
                    </div>
                  </div>
                ) : (
                  <div className="bank-form">
                    <div className="form-group">
                      <label>UPI ID *</label>
                      <input
                        type="text"
                        placeholder="yourname@upi"
                        value={bankDetails.upiId}
                        onChange={(e) =>
                          setBankDetails((b) => ({
                            ...b,
                            upiId: e.target.value,
                          }))
                        }
                      />
                      {bankErrors.upiId && (
                        <span className="err">{bankErrors.upiId}</span>
                      )}
                    </div>
                    <div className="upi-logos">
                      Works with:
                      <strong>GPay · PhonePe · Paytm · BHIM</strong>
                    </div>
                    <div className="secure-note">
                      🔒 Your UPI ID is encrypted and used only for this
                      refund.
                    </div>
                  </div>
                )}

                <div className="modal-btns">
                  <button
                    className="btn-text"
                    onClick={() => setModalStep(1)}
                  >
                    ← Back
                  </button>
                  <button className="btn-confirm" onClick={handleNextStep}>
                    Submit Return
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3 — Success ── */}
            {modalStep === 3 && (
              <div className="modal-body success-body">
                <div className="success-icon">
                  {modalType === "cancel" ? "✅" : "↩️"}
                </div>
                <h3 className="modal-title">
                  {modalType === "cancel"
                    ? "Order Cancelled!"
                    : "Return Initiated!"}
                </h3>
                <p className="success-msg">
                  {modalType === "cancel"
                    ? "Your order has been cancelled. Refund (if paid online) will be credited within 5–7 business days."
                    : "Your return request is submitted. Our team will pick up the item within 2–3 days. Refund in 7–10 business days."}
                </p>
                <button className="btn-confirm" onClick={closeModal}>
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;