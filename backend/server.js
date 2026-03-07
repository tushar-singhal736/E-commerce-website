const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Razorpay = require("razorpay");

const app = express();
const PORT = 5005;

app.use(cors());
app.use(express.json());

const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

// Razorpay instance
const razorpay = new Razorpay({
    key_id: "rzp_live_SOCR2jNHefoYoj",
    key_secret: "47G33Sk0dpu2Uy5jn5qbJpYe"
});

// Helper: Read JSON safely
const readData = (file) => {
    try {
        if (!fs.existsSync(file)) return [];
        const data = fs.readFileSync(file, "utf8");
        return JSON.parse(data || "[]");
    } catch (err) {
        console.error("Error reading file:", file, err);
        return [];
    }
};

// ---------------- ROUTES ----------------

// 1️⃣ Get All Products
app.get("/api/products", (req, res) => {
    const products = readData(PRODUCTS_FILE);
    res.json(products);
});

// 2️⃣ Create Razorpay Order
app.post("/api/create-order", async (req, res) => {
    try {
        const { amount } = req.body;

        const options = {
            amount: amount * 100, // paise
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        res.json(order);

    } catch (error) {
        console.error(error);
        res.status(500).send("Order create nahi ho paya");
    }
});

// 3️⃣ Save Order After Payment
app.post("/api/orders", (req, res) => {
    try {
        const orders = readData(ORDERS_FILE);

        const newOrder = {
            ...req.body,
            orderId: "ORD-" + Date.now(),
            orderDate: new Date().toLocaleString(),
            status: "Success"
        };

        orders.push(newOrder);
        fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));

        res.status(201).json(newOrder);

    } catch (err) {
        res.status(500).json({ error: "Order save nahi ho paya" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Backend ready at http://localhost:${PORT}`);
});