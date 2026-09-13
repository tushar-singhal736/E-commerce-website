import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import API_BASE_URL, { parseApiResponse } from "../utils/api";
import { getProductImage, handleImageFallback, PRODUCT_PLACEHOLDER } from "../utils/productImages";
import "./Orders.css";

const CANCEL_REASONS = [
  "Changed my mind",
  "Found a better price elsewhere",
  "Ordered by mistake",
  "Shipping time too long",
  "Payment issue",
];
const RETURN_REASONS = [
  "Product damaged / defective",
  "Wrong item delivered",
  "Item not as described",
  "Missing parts or accessories",
  "Changed my mind",
];

/* ── Dark mode: watches class on <html>/<body> ─────────────────────────── */
function useDarkMode() {
  const check = () =>
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark") ||
    document.documentElement.getAttribute("data-theme") === "dark";
  const [dark, setDark] = useState(check);
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(check()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ── SVG Icons ─────────────────────────────────────────────────────────── */
const IcoFile = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IcoX = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const IcoReturn = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="1 4 1 10 7 10"/>
    <path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
  </svg>
);
const IcoCheck = ({ s = 11, c = "#fff" }) => (
  <svg width={s} height={s} viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IcoTruck = ({ s = 13 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

/* ── Tracking step icons (SVG, not emoji) ─────────────────────────────── */
const StepIcons = {
  placed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  packed: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  shipped: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  ),
  ofd: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  delivered: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
  cancelled: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
    </svg>
  ),
  returnInit: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/>
    </svg>
  ),
  pickup: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  refund: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
function Orders({ orders, returnOrder, cancelOrder, submitFeedback, setToast }) {
  const location = useLocation();
  const dark = useDarkMode();
  const [productsMap, setProductsMap] = useState({});

  const showToast = (message, type = 'error') => {
    if (setToast) setToast({ message, type });
    else window.alert(message);
  };
  const [expanded, setExpanded] = useState(null);
  const [ratings, setRatings] = useState({});
  const [modalType, setModalType] = useState(null);
  const [modalStep, setModalStep] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reason, setReason] = useState("");
  const [returnNote, setReturnNote] = useState("");

  useEffect(() => {
    if (location.state?.openOrderId) setExpanded(location.state.openOrderId);
  }, [location.state]);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE_URL}/api/products?limit=100&page=1`)
      .then((r) => parseApiResponse(r))
      .then((payload) => {
        if (!alive) return;
        const items = Array.isArray(payload) ? payload : payload.items || [];
        const m = {};
        items.forEach((p) => { m[p.id] = p; });
        setProductsMap(m);
      })
      .catch((err) => {
        console.error(err);
        showToast('Unable to load product information.', 'error');
      });
    return () => { alive = false; };
  }, []);

  const fmtDate = (ds) =>
    new Date(ds).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  const fmtDateLong = (ds) =>
    new Date(ds).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const getOrderItemImage = (item) => {
    const catalogProduct = productsMap[item.id] || {};
    return getProductImage({
      ...item,
      image: item.image || catalogProduct.image,
      images: Array.isArray(item.images) && item.images.length > 0 ? item.images : catalogProduct.images,
    });
  };

  /* order status */
  const getStatus = (order) => {
    const normalizedStatus = String(order.status || "").trim().toLowerCase();
    if (normalizedStatus === "return requested") return "Return Requested";
    if (normalizedStatus === "returned") return "Returned";
    if (normalizedStatus === "return approved") return "Return Approved";
    if (normalizedStatus === "pickup scheduled") return "Pickup Scheduled";
    if (normalizedStatus === "refund initiated") return "Refund Initiated";
    if (normalizedStatus === "refunded") return "Refunded";
    if (normalizedStatus === "return rejected") return "Return Rejected";
    if (["cancelled", "canceled"].includes(normalizedStatus)) return "Cancelled";
    if (["delivered"].includes(normalizedStatus)) return "Delivered";
    if (["out for delivery"].includes(normalizedStatus)) return "Out for Delivery";
    if (["shipped"].includes(normalizedStatus)) return "Shipped";
    if (
      ["processing", "pending", "paid", "success", "pending - cash on delivery"].includes(normalizedStatus)
    ) return "Processing";

    // Unknown status values should not auto-mark as delivered.
    return "Processing";
  };

  const canCancelOrder = (status) => ["Processing", "Pending", "Paid", "Success"].includes(status);
  const canReturnOrder = (status) => status === "Delivered";
  const getActionHint = (status) => {
    if (canCancelOrder(status)) {
      return {
        tone: "cancel",
        title: "Cancel available before delivery",
        text: "Order abhi dispatch/deliver nahi hua hai, isliye aap isse cancel kar sakte hain.",
      };
    }
    if (canReturnOrder(status)) {
      return {
        tone: "return",
        title: "Return available after delivery",
        text: "Order delivered ho chuka hai. Agar item damaged, wrong ya pasand nahi hai to return request raise karein.",
      };
    }
    if (["Return Requested", "Return Approved", "Pickup Scheduled", "Refund Initiated"].includes(status)) {
      return {
        tone: "return",
        title: status,
        text: status === "Return Requested" ? "Return request review ke liye submit ho gayi hai." : "Return/refund process admin review me hai.",
      };
    }
    if (status === "Refunded") return { tone: "return", title: "Refund completed", text: "Refund original payment method par process ho gaya hai." };
    if (status === "Return Rejected") return { tone: "locked", title: "Return rejected", text: "Return request policy review ke baad reject hui hai." };
    if (status === "Returned") {
      return {
        tone: "return",
        title: "Return completed",
        text: "Return complete ho gaya hai. Refund original payment method par process hota hai.",
      };
    }
    if (status === "Cancelled") {
      return {
        tone: "cancel",
        title: "Order cancelled",
        text: "Ye order cancel ho chuka hai. Eligible refund original payment method par jayega.",
      };
    }
    return {
      tone: "locked",
      title: "Action not available right now",
      text: "Shipped/Out for Delivery order cancel nahi hota. Delivery ke baad return option yahin aa jayega.",
    };
  };

  /* shipping helpers */
  const getShipping = (order) => {
    const s = parseFloat(order.shippingCharge ?? order.shipping ?? order.deliveryCharge ?? 0);
    return s;
  };
  const isFreeShipping = (order) => getShipping(order) === 0;
  const getOrderTotal = (order) =>
    Number(order.total ?? order.totalAmount ?? order.grandTotal ?? order.summary?.totalPayable) ||
    (order.items || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1), 0);

  /* customer name: try multiple common field names */
  const getCustomerName = (order) =>
    order.customer?.fullName ||
    order.customerName ||
    order.shippingAddress?.name ||
    order.billingAddress?.name ||
    order.userName ||
    order.user?.name ||
    "Customer";

  /* modal */
  const openModal = (e, order, type) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setModalType(type);
    setModalStep(1);
    setReason("");
    setReturnNote("");
  };
  const closeModal = () => {
    setModalType(null);
    setReason("");
    setReturnNote("");
    setSelectedOrder(null);
    setModalStep(1);
  };
  const handleNext = () => {
    if (!reason) {
      showToast('Please select a reason.', 'error');
      return;
    }
    setModalStep(2);
  };
  const handleConfirm = async () => {
    const fullReason = returnNote ? `${reason} - ${returnNote}` : reason;
    let ok = false;
    if (modalType === "cancel") ok = await cancelOrder(selectedOrder.orderId, fullReason);
    else ok = await returnOrder(selectedOrder.orderId, fullReason);
    if (ok) setModalStep(3);
  };

  /* ── Tracking ──────────────────────────────────────────────────────────── */
  const getTrackData = (status, order) => {
    const d = Math.floor((Date.now() - new Date(order.orderDate)) / 86400000);
    const placed = fmtDate(order.orderDate);

    if (status === "Cancelled") return {
      label: "Order Status", variant: "red",
      steps: [
        { key: "placed",    icon: StepIcons.placed,    label: "Order Placed",    sub: placed,                           state: "done" },
        { key: "cancelled", icon: StepIcons.cancelled, label: "Order Cancelled", sub: order.cancelReason || "Cancelled by you", state: "bad" },
      ],
    };

    if (["Returned", "Return Requested", "Return Approved", "Pickup Scheduled", "Refund Initiated", "Refunded"].includes(status)) return {
      label: "Return Status", variant: "blue",
      steps: [
        { key: "delivered",   icon: StepIcons.delivered,   label: "Delivered",          sub: "Successfully delivered",        state: "done" },
        { key: "returnInit",  icon: StepIcons.returnInit,  label: "Return Requested",   sub: order.returnReason || "Return requested", state: "done" },
        { key: "pickup",      icon: StepIcons.pickup,      label: "Pickup Scheduled",   sub: "Agent will collect within 2 days", state: ["Pickup Scheduled", "Refund Initiated", "Refunded", "Returned"].includes(status) ? "done" : "upcoming" },
        { key: "refund",      icon: StepIcons.refund,      label: "Refund Processed",   sub: order.refundStatus || "After quality inspection", state: ["Refund Initiated", "Refunded"].includes(status) ? "done" : "upcoming" },
      ],
    };

    /* Normal order — status-based progress (no auto delivery) */
    const stage = status === "Delivered" ? 5 : status === "Out for Delivery" ? 4 : status === "Shipped" ? 3 : 2;

    return {
      label: "Track Order", variant: "green",
      steps: [
        {
          key: "placed", icon: StepIcons.placed,
          label: "Order Placed",
          sub: placed || "Order confirmed",
          state: "done",
        },
        {
          key: "packed", icon: StepIcons.packed,
          label: "Packed & Ready",
          sub: "Preparing your order",
          state: stage >= 2 ? "done" : "active",
        },
        {
          key: "shipped", icon: StepIcons.shipped,
          label: "Shipped",
          sub: stage >= 3 ? "Dispatched" : "Awaiting dispatch",
          state: stage >= 3 ? "done" : stage >= 2 ? "active" : "idle",
        },
        {
          key: "ofd", icon: StepIcons.ofd,
          label: "Out for Delivery",
          sub: stage >= 4 ? "With delivery partner" : "Coming soon",
          state: stage >= 4 ? "done" : stage >= 3 ? "active" : "idle",
        },
        {
          key: "delivered", icon: StepIcons.delivered,
          label: "Delivered",
          sub: stage >= 5 ? "Successfully delivered" : "Will update after dispatch",
          state: stage >= 5 ? "done" : stage >= 3 ? "active" : "idle",
        },
      ],
    };
  };

  /* ── Invoice PDF ───────────────────────────────────────────────────────── */
  const downloadInvoice = (order) => {
    const doc   = new jsPDF({ unit: "mm", format: "a4" });
    const W     = doc.internal.pageSize.getWidth();
    const H     = doc.internal.pageSize.getHeight();
    const invNo = "INV-" + order.orderId.slice(-8).toUpperCase();
    const cname = getCustomerName(order);
    const ship  = getShipping(order);
    const subtotal = order.items.reduce((s, i) => s + i.quantity * i.price, 0);

    /* ── HEADER ── */
    doc.setFillColor(10, 18, 40);
    doc.rect(0, 0, W, 48, "F");
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 0, 5, 48, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text("SuperNova", 13, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Your Trusted Online Store", 13, 28);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", W - 13, 23, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 140, 180);
    doc.text(invNo, W - 13, 31, { align: "right" });

    /* ── BILL TO / ORDER META ── */
    const mt = 58;

    // Bill To label
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("BILL TO", 13, mt);

    // Customer name — real name from order
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(10, 18, 40);
    doc.text(cname, 13, mt + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const email   = order.email || order.user?.email || order.shippingAddress?.email || "—";
    const address = order.address || order.shippingAddress?.address || order.shippingAddress?.city || "India";
    const phone   = order.phone || order.shippingAddress?.phone || order.user?.phone || "";
    doc.text(email, 13, mt + 16);
    if (phone) doc.text(phone, 13, mt + 22);
    doc.text(address, 13, mt + (phone ? 28 : 22));

    // Order details column
    const col2 = W / 2 + 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("ORDER DETAILS", col2, mt);

    const metaRows = [
      ["Invoice No",  invNo],
      ["Order ID",    "#" + order.orderId.slice(-6).toUpperCase()],
      ["Order Date",  fmtDateLong(order.orderDate)],
      ["Payment",     order.paymentMethod || "Online"],
      ["Shipping",    ship > 0 ? "Rs." + ship.toFixed(2) : "Free"],
    ];
    metaRows.forEach(([k, v], i) => {
      const y = mt + 8 + i * 7;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text(k, col2, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 18, 40);
      doc.text(v, W - 13, y, { align: "right" });
    });

    /* Divider */
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(13, mt + 38, W - 13, mt + 38);

    /* ── ITEMS TABLE ── */
    autoTable(doc, {
      startY: mt + 44,
      head: [["#", "Product", "Qty", "Unit Price", "Total"]],
      body: order.items.map((item, i) => [
        i + 1,
        item.name,
        item.quantity,
        "Rs." + parseFloat(item.price).toFixed(2),
        "Rs." + (item.quantity * item.price).toFixed(2),
      ]),
      headStyles: {
        fillColor: [10, 18, 40], textColor: [255, 255, 255],
        fontStyle: "bold", fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 9, textColor: [51, 65, 85],
        cellPadding: { top: 5, bottom: 5, left: 4, right: 4 },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: "auto" },
        2: { halign: "center", cellWidth: 16 },
        3: { halign: "right",  cellWidth: 34 },
        4: { halign: "right",  cellWidth: 34 },
      },
      margin: { left: 13, right: 13 },
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.25,
    });

    /* ── TOTALS BOX ── */
    const fy = doc.lastAutoTable.finalY + 8;
    const hasDisc = order.discountPercent > 0;
    const hasShip = ship > 0;

    // Count rows: subtotal + discount? + shipping? + separator + total
    let rows = 1; // subtotal
    if (hasDisc) rows++;
    if (hasShip) rows++;
    const bH = 14 + rows * 9 + 12; // dynamic height
    const bX = W - 82;
    const bW = 69;

    doc.setFillColor(248, 250, 252);
    doc.roundedRect(bX, fy, bW, bH, 3, 3, "F");
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(bX, fy, bW, bH, 3, 3, "D");

    let rowY = fy + 9;

    // Subtotal
    doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
    doc.text("Subtotal", bX + 5, rowY);
    doc.setFont("helvetica", "bold"); doc.setTextColor(10, 18, 40);
    doc.text("Rs." + subtotal.toFixed(2), bX + bW - 5, rowY, { align: "right" });
    rowY += 9;

    // Discount
    if (hasDisc) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(22, 163, 74);
      doc.text("Discount (" + order.discountPercent + "%)", bX + 5, rowY);
      doc.setFont("helvetica", "bold");
      doc.text("-Rs." + (order.discountAmount || 0).toFixed(2), bX + bW - 5, rowY, { align: "right" });
      rowY += 9;
    }

    // Shipping charge
    if (hasShip) {
      doc.setFont("helvetica", "normal"); doc.setTextColor(71, 85, 105);
      doc.text("Shipping", bX + 5, rowY);
      doc.setFont("helvetica", "bold"); doc.setTextColor(10, 18, 40);
      doc.text("Rs." + ship.toFixed(2), bX + bW - 5, rowY, { align: "right" });
      rowY += 9;
    }

    // Total line
    doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.4);
    doc.line(bX + 5, rowY - 3, bX + bW - 5, rowY - 3);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(10, 18, 40);
    doc.text("Total Paid", bX + 5, rowY + 5);
    doc.setTextColor(59, 130, 246);
    doc.text("Rs." + getOrderTotal(order).toFixed(2), bX + bW - 5, rowY + 5, { align: "right" });

    // Payment / shipping badge (left of totals box)
    if (hasShip) {
      doc.setFillColor(220, 252, 231);
      doc.roundedRect(13, fy, 62, 11, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(22, 101, 52);
      doc.text("PAID  " + (order.paymentMethod || "Online"), 17, fy + 7.5);
    } else {
      // Free shipping badge
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(13, fy, 62, 11, 2, 2, "F");
      doc.setFillColor(219, 234, 254);
      doc.roundedRect(13, fy, 30, 11, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(30, 64, 175);
      doc.text("FREE SHIP", 16, fy + 7.5);
      doc.setTextColor(22, 101, 52);
      doc.text("  PAID " + (order.paymentMethod || "Online"), 46, fy + 7.5);
    }

    /* ── FOOTER ── */
    doc.setFillColor(10, 18, 40);
    doc.rect(0, H - 20, W, 20, "F");
    doc.setFillColor(59, 130, 246);
    doc.rect(0, H - 20, 5, 20, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
    doc.text("Thank you for shopping with us!", W / 2, H - 12, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setTextColor(148, 163, 184);
    doc.text("tusharsinghal1250@gmail.com   |   SuperNova Store", W / 2, H - 6, { align: "center" });

    doc.save("Invoice_" + order.orderId.slice(-6).toUpperCase() + ".pdf");
  };

  /* ── RENDER ────────────────────────────────────────────────────────────── */
  return (
    <div className={`orders-page${dark ? " dark" : ""}`}>
      <div className="orders-container">
        <h1 className="page-title">My Orders</h1>

        <div className="orders-list">
          {orders.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity=".4">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
              </div>
              <p>No orders placed yet.</p>
            </div>
          )}

          {orders.map((order) => {
            const status = getStatus(order);
            const isOpen = expanded === order.orderId;
            const track  = getTrackData(status, order);
            const ship   = getShipping(order);
            const free   = isFreeShipping(order);
            const actionHint = getActionHint(status);
            const orderTotal = getOrderTotal(order);

            return (
              <div key={order.orderId}
                className={["order-card", isOpen ? "active" : "",
                  status === "Cancelled" ? "card-cancelled" : "",
                  ["Returned", "Return Requested"].includes(status)  ? "card-returned"  : "",
                ].filter(Boolean).join(" ")}
              >
                {/* ── CARD HEADER ── */}
                <div className="order-summary-header"
                  onClick={() => setExpanded(isOpen ? null : order.orderId)}
                >
                  <div className="header-left">
                    <div className="order-thumb-stack">
                      {order.items.slice(0, 3).map((item, i) => {
                        const img = getOrderItemImage(item);
                        return (
                          <img key={i} src={img} alt="" className="thumb-img"
                            style={{ zIndex: 3 - i, marginLeft: i > 0 ? "-12px" : 0 }}
                            onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                          />
                        );
                      })}
                      {order.items.length > 3 && <span className="thumb-more">+{order.items.length - 3}</span>}
                    </div>
                    <div className="main-info">
                      <span className="order-no">#{order.orderId.slice(-6).toUpperCase()}</span>
                      <span className="order-date">
                        {fmtDate(order.orderDate)}&nbsp;&middot;&nbsp;
                        {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="status-group">
                    {free
                      ? <span className="ship-tag ship-free"><IcoTruck s={11} /> Free Shipping</span>
                      : <span className="ship-tag ship-paid"><IcoTruck s={11} /> &#8377;{ship.toFixed(0)} Shipping</span>
                    }
                    <span className={`status-badge badge-${status.toLowerCase().replace(/\s/g, "-")}`}>{status}</span>
                    <span className="order-total-header">&#8377;{orderTotal.toFixed(2)}</span>
                    <span className={`chevron${isOpen ? " open" : ""}`}>&#9660;</span>
                  </div>
                </div>

                {/* ── EXPANDED ── */}
                {isOpen && (
                  <div className="order-details-panel">
                    <div className="order-quick-actions">
                      <div className={`order-action-hint hint-${actionHint.tone}`}>
                        <strong>{actionHint.title}</strong>
                        <span>{actionHint.text}</span>
                      </div>
                      <div className="action-area">
                        <button className="btn-invoice" onClick={(e) => { e.stopPropagation(); downloadInvoice(order); }}>
                          <IcoFile /> Invoice
                        </button>
                        {canCancelOrder(status) && (
                          <button className="btn-danger" onClick={(e) => openModal(e, order, "cancel")}>
                            <IcoX /> Cancel Order
                          </button>
                        )}
                        {canReturnOrder(status) && (
                          <button className="btn-return" onClick={(e) => openModal(e, order, "return")}>
                            <IcoReturn /> Return Items
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="order-summary-meta">
                      <div className="order-meta-item">
                        <span>Order Date</span>
                        <strong>{fmtDate(order.orderDate)}</strong>
                      </div>
                      <div className="order-meta-item">
                        <span>Item(s)</span>
                        <strong>{order.items.length}</strong>
                      </div>
                      <div className="order-meta-item">
                        <span>Order Total</span>
                        <strong>&#8377;{orderTotal.toFixed(2)}</strong>
                      </div>
                    </div>

                    <div className="tracking-wrap">
                      <div className="track-header">
                        <span className="track-title">{track.label}</span>
                        <div className="track-meta">
                          {status === "Shipped" && (
                            <span className="track-eta">
                              <IcoTruck s={11} /> Expected in 3&#8211;4 days
                            </span>
                          )}
                          {status === "Out for Delivery" && (
                            <span className="track-eta">
                              <IcoTruck s={11} /> Out for delivery today
                            </span>
                          )}
                          {status === "Processing" && (
                            <span className="track-eta">Order confirmed</span>
                          )}
                        </div>
                      </div>

                      <div className="track-timeline">
                        {track.steps.map((step, idx) => {
                          const last = idx === track.steps.length - 1;
                          return (
                            <div key={step.key} className={`tl-item tl-${step.state}`}>
                              <div className="tl-left">
                                <div className="tl-circle">
                                  {step.state === "done" && <IcoCheck s={11} />}
                                  {step.state === "bad" && (
                                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                      <path d="M3 3l6 6M9 3l-6 6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round"/>
                                    </svg>
                                  )}
                                  {step.state === "active" && <div className="tl-pulse" />}
                                  {(step.state === "idle" || step.state === "upcoming") && <div className="tl-idle-dot" />}
                                </div>
                                {!last && <div className="tl-line" />}
                              </div>
                              <div className="tl-body">
                                <div className="tl-top-row">
                                  <span className="tl-step-icon">{step.icon}</span>
                                  <span className="tl-label">{step.label}</span>
                                </div>
                                <span className="tl-sub">{step.sub}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className={`ship-strip ${free ? "ship-strip-free" : "ship-strip-paid"}`}>
                        <IcoTruck s={12} />
                        {free
                          ? <span>Free Delivery included with this order</span>
                          : <span>Delivery charge: <strong>&#8377;{ship.toFixed(2)}</strong></span>
                        }
                      </div>
                    </div>

                    <div className="items-list">
                      {order.items.map((item, idx) => {
                        const img = getOrderItemImage(item);
                        return (
                          <div key={idx} className="item-row">
                            <img src={img} alt={item.name} className="product-img"
                              onError={handleImageFallback(PRODUCT_PLACEHOLDER)}
                            />
                            <div className="item-info">
                              <p className="item-name">{item.name}</p>
                              <p className="item-meta">Qty: {item.quantity}&nbsp;&middot;&nbsp;&#8377;{item.price} each</p>
                            </div>
                            <div className="item-total">&#8377;{(item.quantity * item.price).toFixed(2)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {status === "Delivered" && (
                      <div className="order-footer-grid">
                        <div className="feedback-box">
                          <p>Rate your experience</p>
                          <div className="stars">
                            {[1,2,3,4,5].map((s) => (
                              <span key={s}
                                className={ratings[order.orderId] >= s ? "star on" : "star"}
                                onClick={() => setRatings({ ...ratings, [order.orderId]: s })}
                              >&#9733;</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grand-total-row">
                      {order.discountPercent > 0 && (
                        <span className="discount-tag">
                          Discount ({order.discountPercent}%): &#8722;&#8377;{(order.discountAmount || 0).toFixed(2)}
                        </span>
                      )}
                      {!free && (
                        <span className="ship-charge-tag">
                          Shipping: +&#8377;{ship.toFixed(2)}
                        </span>
                      )}
                      {free && (
                        <span className="free-ship-tag">
                          <IcoTruck s={11} /> Free Shipping
                        </span>
                      )}
                      <span className="total-paid">Total Paid: <strong>&#8377;{orderTotal.toFixed(2)}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── MODAL ── */}
      {modalType && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>

            <div className="modal-prog">
              {[1,2,3].map((n) => (
                <React.Fragment key={n}>
                  <div className={`prog-dot${modalStep >= n ? " prog-active" : ""}`}>
                    {modalStep > n ? <IcoCheck s={10} /> : n}
                  </div>
                  {n < 3 && <div className={`prog-line${modalStep > n ? " line-active" : ""}`} />}
                </React.Fragment>
              ))}
            </div>

            {/* Step 1 */}
            {modalStep === 1 && (
              <>
                <div className={`modal-badge ${modalType === "cancel" ? "mbadge-cancel" : "mbadge-return"}`}>
                  {modalType === "cancel" ? <IcoX s={22} /> : <IcoReturn s={22} />}
                </div>
                <h3 className="modal-title">{modalType === "cancel" ? "Cancel Order" : "Return Items"}</h3>
                <p className="modal-sub">
                  {modalType === "cancel"
                    ? "Please tell us why you want to cancel this order."
                    : "Let us know the reason for your return."}
                </p>
                <div className="reason-list">
                  {(modalType === "cancel" ? CANCEL_REASONS : RETURN_REASONS).map((r) => (
                    <label key={r} className={`reason-opt${reason === r ? " reason-sel" : ""}`}>
                      <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} hidden />
                      <span className="rcheck">{reason === r && <IcoCheck s={10} />}</span>
                      <span>{r}</span>
                    </label>
                  ))}
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={closeModal}>Go Back</button>
                  <button className={`btn-cta ${modalType === "cancel" ? "cta-red" : "cta-blue"}`} onClick={handleNext}>
                    Continue &#8594;
                  </button>
                </div>
              </>
            )}

            {/* Step 2 */}
            {modalStep === 2 && (
              <>
                <div className={`modal-badge ${modalType === "cancel" ? "mbadge-cancel" : "mbadge-return"}`}>
                  {modalType === "cancel" ? <IcoX s={22} /> : <IcoReturn s={22} />}
                </div>
                <h3 className="modal-title">Confirm {modalType === "cancel" ? "Cancellation" : "Return"}</h3>
                <div className="confirm-card">
                  {(() => {
                    // Compute total robustly — try every common field name, fallback to items sum
                    const displayTotal = "\u20B9" + getOrderTotal(selectedOrder).toFixed(2);

                    return [
                      ["Order",  "#" + selectedOrder.orderId.slice(-6).toUpperCase()],
                      ["Name",   getCustomerName(selectedOrder)],
                      ["Reason", reason],
                      ["Amount", displayTotal],
                    ];
                  })().map(([k, v]) => (
                    <div key={k} className="crow">
                      <span className="ck">{k}</span>
                      <strong className="cv">{v}</strong>
                    </div>
                  ))}
                </div>
                {modalType === "return" && (
                  <div className="modal-note-group">
                    <label htmlFor="return-note">Tell us more (optional)</label>
                    <textarea
                      id="return-note"
                      value={returnNote}
                      onChange={(e) => setReturnNote(e.target.value)}
                      placeholder="Describe the issue or what you want returned"
                    />
                  </div>
                )}
                <div className={`refund-strip ${modalType === "return" ? "strip-blue" : "strip-green"}`}>
                  {modalType === "cancel"
                    ? "Refund credited to original payment method within 5-7 business days."
                    : "Pickup within 2 business days. Refund processed after quality check."}
                </div>
                <div className="modal-actions">
                  <button className="btn-ghost" onClick={() => setModalStep(1)}>&#8592; Back</button>
                  <button className={`btn-cta ${modalType === "cancel" ? "cta-red" : "cta-blue"}`} onClick={handleConfirm}>
                    {modalType === "cancel" ? "Yes, Cancel Order" : "Yes, Return Items"}
                  </button>
                </div>
              </>
            )}

            {/* Step 3 */}
            {modalStep === 3 && (
              <div className="success-wrap">
                <div className="success-circle">
                  <svg viewBox="0 0 60 60" fill="none">
                    <circle cx="30" cy="30" r="28" stroke="#10b981" strokeWidth="2" opacity=".25"/>
                    <circle cx="30" cy="30" r="20" fill="#10b981" opacity=".12"/>
                    <path d="M18 30l9 9 15-16" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>{modalType === "cancel" ? "Order Cancelled" : "Return Initiated"}</h3>
                <p>
                  {modalType === "cancel"
                    ? "Your order has been cancelled. Refund will be processed within 5-7 business days."
                    : "Return request submitted. We will arrange a pickup within 2 business days."}
                </p>
                <button className="btn-cta cta-blue" onClick={closeModal}>Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Orders;
