const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const rateLimit = require("express-rate-limit");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const app = express();
const PORT = process.env.PORT || 5005;
const IS_PRODUCTION = process.env.NODE_ENV === "production";

// ============ CORS CONFIGURATION ============
const allowedOrigins = IS_PRODUCTION
    ? [process.env.FRONTEND_URL, process.env.ADMIN_URL].filter(Boolean)
    : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

if (IS_PRODUCTION && allowedOrigins.length === 0) {
    console.warn('⚠️ No FRONTEND_URL or ADMIN_URL configured for production CORS. Allowing all origins.');
}

app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (!IS_PRODUCTION || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('CORS origin denied'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 3600
}));

app.use(express.json({ limit: '10mb' }));

// ============ RATE LIMITING ============
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: IS_PRODUCTION ? 100 : 2000, // Local dev needs room for React polling/hot reload
    message: { success: false, error: "Too many requests from this IP, please try again later.", code: "RATE_LIMITED" },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    skip: (req) => req.method === 'OPTIONS'
});

const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: IS_PRODUCTION ? 30 : 500, // Stricter in production
    message: { success: false, error: "Too many API requests, please try again later.", code: "API_RATE_LIMITED" },
    skip: (req) => req.method === 'OPTIONS'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: IS_PRODUCTION ? 5 : 50, // Limit login/signup/reset attempts
    message: { success: false, error: "Too many authentication attempts, please try again later.", code: "AUTH_RATE_LIMITED" },
    skipSuccessfulRequests: true, // Don't count successful requests
    skip: (req) => req.method === 'OPTIONS'
});

const adminLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: IS_PRODUCTION ? 20 : 500, // Very strict for admin operations
    message: { success: false, error: "Too many admin requests, please try again later.", code: "ADMIN_RATE_LIMITED" },
    skip: (req) => req.method === 'OPTIONS'
});

app.use(generalLimiter); // Apply to all routes

// ============ SECURITY HEADERS ============
app.use((req, res, next) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // Prevent MIME sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Enable XSS Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Prevent referrer leakage
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Content Security Policy
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;");
    next();
});

const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");
const SETTINGS_FILE = path.join(__dirname, "settings.json");
const COUPONS_FILE = path.join(__dirname, "coupons.json");
const PRODUCT_PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1560393464-5c69a73c5770?q=80&w=800&auto=format&fit=crop";
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const configuredUseMongo = String(process.env.USE_MONGO ?? "").trim().toLowerCase();
const USE_MONGO = configuredUseMongo === "true" || (configuredUseMongo === "" && Boolean(process.env.MONGODB_URI));
const db = require("./db");
const MONGODB_URI = process.env.MONGODB_URI || "";
const MONGODB_DB = process.env.MONGODB_DB || "ecommerce";
const MIGRATE_MONGO_ON_START = String(process.env.MIGRATE_MONGO_ON_START || "false").toLowerCase() === "true";
const { migrateMongoFromJson } = require("./mongoMigration");
let mongoConnected = false;

const shouldUseMongo = () => USE_MONGO && mongoConnected;

const hasRazorpayKeys = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
const razorpay = hasRazorpayKeys ? new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
}) : null;

if (!hasRazorpayKeys) {
    console.warn("⚠️ Razorpay keys missing. Payment order creation will be disabled until RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are configured.");
}

const USERS_FILE = path.join(__dirname, "users.json");
const SESSIONS_FILE = path.join(__dirname, "sessions.json");

const JSON_COLLECTION_MAP = new Map([
    [USERS_FILE, 'users'],
    [SESSIONS_FILE, 'sessions'],
    [PRODUCTS_FILE, 'products'],
    [ORDERS_FILE, 'orders'],
    [SETTINGS_FILE, 'settings'],
    [COUPONS_FILE, 'coupons'],
]);

const writeData = async (file, data) => {
    try {
        if (shouldUseMongo()) {
            const collection = JSON_COLLECTION_MAP.get(file);
            if (collection) {
                if (collection === 'settings') {
                    return await db.saveSettings(data);
                }
                await db.replaceAll(collection, data);
                return data;
            }
        }
        fs.writeFileSync(file, JSON.stringify(data, null, 2));
        return data;
    } catch (err) {
        console.error("Error writing file:", file, err);
        return null;
    }
};

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const hashPassword = (password, salt = null) => {
    const actualSalt = salt || crypto.randomBytes(16).toString("hex");
    const derived = crypto.scryptSync(String(password), actualSalt, 64);
    return { salt: actualSalt, hash: derived.toString("hex") };
};

const verifyPassword = (password, storedHash, storedSalt) => {
    if (!password || !storedHash || !storedSalt) return false;
    try {
        const derived = crypto.scryptSync(String(password), storedSalt, 64);
        const hashBuffer = Buffer.from(storedHash, "hex");
        return hashBuffer.length === derived.length && crypto.timingSafeEqual(hashBuffer, derived);
    } catch {
        return false;
    }
};

const createSessionToken = () => crypto.randomBytes(32).toString("hex");

const sanitizeUser = (user) => ({
    id: user.id,
    fullName: user.fullName,
    email: normalizeEmail(user.email),
    phone: user.phone || "",
    dateOfBirth: user.dateOfBirth || "",
    role: user.role || "customer",
});

// Helper: Read JSON safely
const readData = async (file) => {
    if (shouldUseMongo()) {
        const collection = JSON_COLLECTION_MAP.get(file);
        if (collection && collection !== 'settings') {
            return await db.getAll(collection);
        }
    }

    try {
        if (!fs.existsSync(file)) return [];
        const data = fs.readFileSync(file, "utf8");
        return JSON.parse(data || "[]");
    } catch (err) {
        console.error("Error reading file:", file, err);
        return [];
    }
};

// Helper: Read settings safely
const readSettings = async () => {
    if (shouldUseMongo()) {
        return await db.getSettings();
    }

    try {
        if (!fs.existsSync(SETTINGS_FILE)) return { discountPercent: 0 };
        const raw = fs.readFileSync(SETTINGS_FILE, "utf8");
        const parsed = JSON.parse(raw || "{}");
        const discountPercent = Number(parsed.discountPercent) || 0;
        return { discountPercent };
    } catch (err) {
        console.error("Error reading settings:", err);
        return { discountPercent: 0 };
    }
};

const writeSettings = async (settings) => {
    const discountPercent = Math.max(0, Math.min(90, Number(settings.discountPercent) || 0));
    const next = { discountPercent };

    if (shouldUseMongo()) {
        return await db.saveSettings(next);
    }

    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(next, null, 2));
    return next;
};

const DEFAULT_COUPONS = [
    {
        id: "cpn_1",
        code: "SUPERNOVA10",
        percent: 10,
        minOrderAmount: 0,
        maxUses: null,
        usedCount: 0,
        active: true,
        expiresAt: null,
        description: "10% off on all orders",
        createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
        id: "cpn_2",
        code: "WELCOME15",
        percent: 15,
        minOrderAmount: 500,
        maxUses: 100,
        usedCount: 0,
        active: true,
        expiresAt: null,
        description: "15% off for new shoppers (min ₹500)",
        createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
        id: "cpn_3",
        code: "FESTIVE20",
        percent: 20,
        minOrderAmount: 1000,
        maxUses: 50,
        usedCount: 0,
        active: true,
        expiresAt: null,
        description: "Festive sale — 20% off (min ₹1000)",
        createdAt: "2026-01-01T00:00:00.000Z",
    },
];

const normalizeCouponCode = (code) =>
    String(code || "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");

const readCouponsRaw = async () => {
    if (USE_MONGO) {
        const coupons = await db.getAll('coupons');
        return Array.isArray(coupons) ? coupons : [];
    }

    try {
        if (!fs.existsSync(COUPONS_FILE)) {
            await writeData(COUPONS_FILE, DEFAULT_COUPONS);
            return [...DEFAULT_COUPONS];
        }
        const parsed = await readData(COUPONS_FILE);
        return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
        console.error("Error reading coupons:", err);
        return [...DEFAULT_COUPONS];
    }
};

const saveCoupons = async (coupons) => await writeData(COUPONS_FILE, coupons);

const sanitizeCouponForPublic = (coupon) => ({
    id: coupon.id,
    code: coupon.code,
    percent: Number(coupon.percent) || 0,
    minOrderAmount: Number(coupon.minOrderAmount) || 0,
    description: String(coupon.description || "").trim(),
    expiresAt: coupon.expiresAt || null,
});

const isCouponExpired = (coupon) => {
    if (!coupon?.expiresAt) return false;
    return new Date(coupon.expiresAt) < new Date();
};

const validateCouponRecord = (coupon, subtotal = 0) => {
    if (!coupon) {
        return { valid: false, error: "Invalid coupon code", code: "COUPON_INVALID" };
    }
    if (!coupon.active) {
        return { valid: false, error: "This coupon is no longer active", code: "COUPON_INACTIVE" };
    }
    if (isCouponExpired(coupon)) {
        return { valid: false, error: "This coupon has expired", code: "COUPON_EXPIRED" };
    }
    const minOrderAmount = Number(coupon.minOrderAmount) || 0;
    if (subtotal < minOrderAmount) {
        return {
            valid: false,
            error: `Minimum order amount is ₹${minOrderAmount}`,
            code: "COUPON_MIN_ORDER",
        };
    }
    const maxUses = coupon.maxUses;
    if (maxUses != null && Number(coupon.usedCount) >= Number(maxUses)) {
        return { valid: false, error: "Coupon usage limit reached", code: "COUPON_LIMIT_REACHED" };
    }
    return { valid: true };
};

const findCouponByCode = async (code) => {
    const normalized = normalizeCouponCode(code);
    if (!normalized) return null;
    return (await readCouponsRaw()).find((coupon) => normalizeCouponCode(coupon.code) === normalized) || null;
};

const getActiveCoupons = async () =>
    (await readCouponsRaw())
        .filter((coupon) => coupon.active && !isCouponExpired(coupon))
        .map(sanitizeCouponForPublic);

const incrementCouponUsage = async (code) => {
    const normalized = normalizeCouponCode(code);
    if (!normalized) return false;
    const coupons = await readCouponsRaw();
    const index = coupons.findIndex((coupon) => normalizeCouponCode(coupon.code) === normalized);
    if (index === -1) return false;
    coupons[index].usedCount = (Number(coupons[index].usedCount) || 0) + 1;
    await saveCoupons(coupons);
    return true;
};

const normalizeCouponInput = (body = {}, existing = null) => {
    const code = normalizeCouponCode(body.code ?? existing?.code);
    const percent = Math.max(0, Math.min(90, Number(body.percent ?? existing?.percent) || 0));
    const minOrderAmount = Math.max(0, Number(body.minOrderAmount ?? existing?.minOrderAmount) || 0);
    const maxUsesRaw = body.maxUses ?? existing?.maxUses;
    const maxUses = maxUsesRaw === null || maxUsesRaw === "" || maxUsesRaw === undefined
        ? null
        : Math.max(1, Number(maxUsesRaw) || 1);
    const active = body.active !== undefined ? Boolean(body.active) : (existing?.active !== false);
    const expiresAt = body.expiresAt !== undefined
        ? (body.expiresAt ? new Date(body.expiresAt).toISOString() : null)
        : (existing?.expiresAt || null);
    const description = String(body.description ?? existing?.description ?? "").trim();

    return {
        id: existing?.id || `cpn_${Date.now()}`,
        code,
        percent,
        minOrderAmount,
        maxUses,
        usedCount: Number(existing?.usedCount) || 0,
        active,
        expiresAt,
        description,
        createdAt: existing?.createdAt || new Date().toISOString(),
    };
};

// ============ AUTH STORAGE HELPERS ============
const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL || "admin@supernova.com");
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "admin123");

const getSessions = async () => await readData(SESSIONS_FILE) || [];
const saveSessions = async (sessions) => await writeData(SESSIONS_FILE, sessions);

const getUsers = async () => await readData(USERS_FILE) || [];
const saveUsers = async (users) => await writeData(USERS_FILE, users);

const createSession = async (userId) => {
    const sessions = await getSessions();
    const token = createSessionToken();
    const nextSession = {
        token,
        userId,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
    sessions.push(nextSession);
    await saveSessions(sessions);
    return nextSession;
};

const getSessionUser = async (token) => {
    if (!token) return null;
    const sessions = await getSessions();
    const session = sessions.find((item) => item.token === token);
    if (!session) return null;
    if (new Date(session.expiresAt) < new Date()) return null;
    if (session.userId === 'admin') {
        return {
            id: 'admin',
            fullName: 'SuperNova Admin',
            email: ADMIN_EMAIL,
            phone: '',
            dateOfBirth: '',
            role: 'admin',
        };
    }
    const users = await getUsers();
    return users.find((user) => user.id === session.userId) || null;
};

const getBearerToken = (req) => {
    const auth = String(req.headers.authorization || "").trim();
    if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
    return null;
};

// Middleware: Verify admin session token
const verifyAdmin = async (req, res, next) => {
    try {
        const token = getBearerToken(req);
        const user = await getSessionUser(token);
        if (!user || user.role !== 'admin') {
            return errorResponse(res, 403, "Admin access denied. Invalid or missing admin session token.", "ADMIN_AUTH_FAILED");
        }
        req.authUser = user;
        next();
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to verify admin session.", "ADMIN_VERIFY_FAILED");
    }
};

const verifyUser = async (req, res, next) => {
    try {
        const token = getBearerToken(req);
        const user = await getSessionUser(token);
        if (!user) {
            return errorResponse(res, 401, "Authentication required.", "AUTH_REQUIRED");
        }
        req.authUser = user;
        next();
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to verify user session.", "USER_VERIFY_FAILED");
    }
};

// ============ ERROR RESPONSE HELPERS ============
const errorResponse = (res, statusCode, message, code = 'UNKNOWN_ERROR') => {
    res.status(statusCode).json({ 
        success: false, 
        error: message, 
        code,
        timestamp: new Date().toISOString()
    });
};

const successResponse = (res, data, statusCode = 200) => {
    res.status(statusCode).json({ 
        success: true, 
        data,
        timestamp: new Date().toISOString()
    });
};

const getCleanProductImages = (product) => {
    const images = [
        product?.image,
        ...(Array.isArray(product?.images) ? product.images : [])
    ]
        .map((image) => String(image || "").trim())
        .filter(Boolean);

    return images.length ? [...new Set(images)] : [PRODUCT_PLACEHOLDER_IMAGE];
};

const normalizeProduct = (product) => {
    const images = getCleanProductImages(product);
    return {
        ...product,
        image: images[0],
        images
    };
};

const normalizeProducts = (products) => products.map(normalizeProduct);

const normalizeStatus = (status) => String(status || "").trim().toLowerCase();
const isCancellableStatus = (status) => [
    "pending",
    "processing",
    "paid",
    "success",
    "pending - cash on delivery"
].includes(normalizeStatus(status));
const isDeliveredStatus = (status) => normalizeStatus(status) === "delivered";

const restoreStockForOrder = async (order) => {
    if (order.inventoryRestoredAt) return order.inventoryRestoredAt;

    const products = await readData(PRODUCTS_FILE);
    let changed = false;

    (order.items || []).forEach((item) => {
        const index = (Array.isArray(products) ? products : []).findIndex((product) => Number(product.id) === Number(item.id));
        if (index === -1) return;

        products[index].stock = (Number(products[index].stock) || 0) + (Number(item.quantity) || 1);
        changed = true;
    });

    if (changed) {
        await writeData(PRODUCTS_FILE, products);
    }

    return new Date().toISOString();
};

// ============ AI CHATBOT ============
const { STORE_INFO, buildSmartReply } = require("./chatbotEngine");

const getOrderTotal = (order) => Number(order.total) || Number(order.summary?.totalPayable) || 0;

const getPublicStats = async () => {
    const products = await readData(PRODUCTS_FILE);
    const orders = await readData(ORDERS_FILE);
    const settings = await readSettings();
    const categories = [...new Set((Array.isArray(products) ? products : []).map((p) => String(p.category || "other")))];
    const totalStock = (Array.isArray(products) ? products : []).reduce((sum, product) => sum + (Number(product.stock) || 0), 0);
    const pendingOrders = (Array.isArray(orders) ? orders : []).filter((order) => {
        const status = String(order.status || "").toLowerCase();
        return status.includes("pending") || status.includes("processing");
    }).length;
    const revenue = (Array.isArray(orders) ? orders : []).reduce((sum, order) => sum + getOrderTotal(order), 0);

    return {
        products,
        orders,
        settings,
        coupons: await getActiveCoupons(),
        categories,
        totalStock,
        pendingOrders,
        revenue
    };
};

const callOpenAIChatbot = async ({ message, context, suggestedAnswer }) => {
    if (!OPENAI_API_KEY || typeof fetch !== "function") return null;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            temperature: 0.35,
            max_tokens: 420,
            messages: [
                {
                    role: "system",
                    content: "You are SuperNova's Amazon-style shopping assistant. Reply in friendly Hinglish unless the user writes in English. Use ONLY the JSON context and suggestedAnswer — never invent products, prices, orders, or policies. Keep answers under 120 words, helpful, and action-oriented. Personalize for logged-in users. Never expose other customers' data. No source code talk."
                },
                {
                    role: "user",
                    content: `Context:\n${JSON.stringify(context)}\n\nSuggested accurate answer (prefer this facts):\n${suggestedAnswer}\n\nUser: ${message}`
                }
            ]
        })
    });

    if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new Error(`OpenAI request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
};

// ============ ROUTES ============

// Health route
app.get("/api/status", (req, res) => {
    return successResponse(res, { message: "E-commerce Backend API is running", version: "1.0.0" });
});

// Authentication: signup, login, reset password
app.post("/api/auth/signup", authLimiter, async (req, res) => {
    const { fullName, email, password, phone, dateOfBirth } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!fullName || !normalizedEmail || !password || password.length < 6) {
        return errorResponse(res, 400, "Please provide valid name, email, and password (min 6 chars).", "AUTH_INVALID_INPUT");
    }

    const users = await getUsers();
    if (users.some((user) => normalizeEmail(user.email) === normalizedEmail)) {
        return errorResponse(res, 400, "Email already registered.", "AUTH_EMAIL_EXISTS");
    }

    const { hash, salt } = hashPassword(password);
    const nextUser = {
        id: Date.now().toString(),
        fullName: String(fullName).trim(),
        email: normalizedEmail,
        phone: String(phone || "").trim(),
        dateOfBirth: String(dateOfBirth || "").trim(),
        passwordHash: hash,
        passwordSalt: salt,
        role: "customer",
        createdAt: new Date().toISOString(),
    };

    users.push(nextUser);
    await saveUsers(users);
    const session = await createSession(nextUser.id);

    return successResponse(res, {
        user: sanitizeUser(nextUser),
        token: session.token,
    }, 201);
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
        return errorResponse(res, 400, "Please provide email and password.", "AUTH_INVALID_INPUT");
    }

    if (normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        const adminUser = {
            id: "admin",
            fullName: "SuperNova Admin",
            email: ADMIN_EMAIL,
            phone: "",
            dateOfBirth: "",
            role: "admin",
        };
        const session = await createSession(adminUser.id);
        return successResponse(res, {
            user: sanitizeUser(adminUser),
            token: session.token,
        });
    }

    const users = await getUsers();
    const existingUser = users.find((user) => normalizeEmail(user.email) === normalizedEmail);
    if (!existingUser || !verifyPassword(password, existingUser.passwordHash, existingUser.passwordSalt)) {
        return errorResponse(res, 401, "Invalid email or password.", "AUTH_INVALID_CREDENTIALS");
    }

    const session = await createSession(existingUser.id);
    return successResponse(res, {
        user: sanitizeUser(existingUser),
        token: session.token,
    });
});

app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    const { email, password } = req.body || {};
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password || password.length < 6) {
        return errorResponse(res, 400, "Please provide a valid email and new password (min 6 chars).", "AUTH_INVALID_INPUT");
    }

    const users = await getUsers();
    const idx = users.findIndex((user) => normalizeEmail(user.email) === normalizedEmail);
    if (idx === -1) {
        return errorResponse(res, 404, "No user found with this email.", "AUTH_USER_NOT_FOUND");
    }

    const { hash, salt } = hashPassword(password);
    users[idx].passwordHash = hash;
    users[idx].passwordSalt = salt;
    await saveUsers(users);

    return successResponse(res, { message: "Password reset successful." });
});

app.get("/api/auth/me", async (req, res) => {
    const auth = String(req.headers.authorization || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    if (!user) {
        return errorResponse(res, 401, "Invalid or expired session token.", "AUTH_INVALID_SESSION");
    }
    return successResponse(res, { user: sanitizeUser(user) });
});

// Store: Public settings (discount etc.)
app.get("/api/settings", async (req, res) => {
    const settings = await readSettings();
    return successResponse(res, settings);
});

// Admin: Update settings (discount etc.)
app.put("/api/admin/settings", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const incoming = req.body || {};
        const next = await writeSettings(incoming);
        return successResponse(res, next);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to update settings", "SETTINGS_UPDATE_FAILED");
    }
});

// Public: active coupon codes for cart / display
app.get("/api/coupons", async (req, res) => {
    return successResponse(res, await getActiveCoupons());
});

// Public: validate coupon before apply
app.post("/api/coupons/validate", apiLimiter, async (req, res) => {
    try {
        const code = req.body?.code;
        const subtotal = Number(req.body?.subtotal) || 0;
        const coupon = await findCouponByCode(code);
        const check = validateCouponRecord(coupon, subtotal);
        if (!check.valid) {
            return errorResponse(res, 400, check.error, check.code);
        }
        return successResponse(res, sanitizeCouponForPublic(coupon));
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to validate coupon", "COUPON_VALIDATE_FAILED");
    }
});

// Admin: list all coupons
app.get("/api/admin/coupons", adminLimiter, verifyAdmin, async (req, res) => {
    return successResponse(res, await readCouponsRaw());
});

// Admin: create coupon
app.post("/api/admin/coupons", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const next = normalizeCouponInput(req.body || {});
        if (!next.code) {
            return errorResponse(res, 400, "Coupon code is required", "COUPON_CODE_REQUIRED");
        }
        if (!next.percent) {
            return errorResponse(res, 400, "Discount percent must be greater than 0", "COUPON_PERCENT_REQUIRED");
        }
        const coupons = await readCouponsRaw();
        if (coupons.some((coupon) => normalizeCouponCode(coupon.code) === next.code)) {
            return errorResponse(res, 409, "Coupon code already exists", "COUPON_DUPLICATE");
        }
        coupons.push(next);
        await saveCoupons(coupons);
        return successResponse(res, next, 201);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to create coupon", "COUPON_CREATE_FAILED");
    }
});

// Admin: update coupon
app.put("/api/admin/coupons/:id", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const coupons = await readCouponsRaw();
        const index = coupons.findIndex((coupon) => coupon.id === id);
        if (index === -1) {
            return errorResponse(res, 404, "Coupon not found", "COUPON_NOT_FOUND");
        }
        const next = normalizeCouponInput(req.body || {}, coupons[index]);
        if (!next.code) {
            return errorResponse(res, 400, "Coupon code is required", "COUPON_CODE_REQUIRED");
        }
        if (!next.percent) {
            return errorResponse(res, 400, "Discount percent must be greater than 0", "COUPON_PERCENT_REQUIRED");
        }
        const duplicate = coupons.find(
            (coupon, couponIndex) =>
                couponIndex !== index && normalizeCouponCode(coupon.code) === next.code
        );
        if (duplicate) {
            return errorResponse(res, 409, "Coupon code already exists", "COUPON_DUPLICATE");
        }
        coupons[index] = next;
        await saveCoupons(coupons);
        return successResponse(res, next);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to update coupon", "COUPON_UPDATE_FAILED");
    }
});

// Admin: delete coupon
app.delete("/api/admin/coupons/:id", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const coupons = await readCouponsRaw();
        const index = coupons.findIndex((coupon) => coupon.id === id);
        if (index === -1) {
            return errorResponse(res, 404, "Coupon not found", "COUPON_NOT_FOUND");
        }
        const [removed] = coupons.splice(index, 1);
        await saveCoupons(coupons);
        return successResponse(res, removed);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to delete coupon", "COUPON_DELETE_FAILED");
    }
});

// 1️⃣ Get All Products with optional pagination and category filtering
app.get("/api/products", async (req, res) => {
    const products = normalizeProducts(await readData(PRODUCTS_FILE));
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.max(1, Math.min(500, Number(req.query.limit) || 20));
    const category = String(req.query.category || "").trim().toLowerCase();

    let filtered = products;
    if (category && category !== 'all') {
        filtered = products.filter((product) => String(product.category || '').trim().toLowerCase() === category);
    }

    const total = filtered.length;
    const pageCount = Math.max(1, Math.ceil(total / limit));
    const startIndex = (page - 1) * limit;
    const pagedProducts = filtered.slice(startIndex, startIndex + limit);

    return successResponse(res, {
        items: pagedProducts,
        total,
        page,
        limit,
        pageCount
    });
});

// 1a️⃣ Get single product
app.get("/api/products/:id", async (req, res) => {
    const productId = Number(req.params.id);
    const products = normalizeProducts(await readData(PRODUCTS_FILE));
    const product = products.find((p) => Number(p.id) === productId);

    if (!product) {
        return errorResponse(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
    }

    return successResponse(res, normalizeProduct(product));
});

const normalizeText = (value) => String(value || "").trim().toLowerCase();
const getProductImage = (product) => getCleanProductImages(product)[0];
const getProductTokens = (product) => {
    const raw = [
        product.name,
        product.category,
        product.description,
        ...(Array.isArray(product.tags) ? product.tags : [])
    ].join(" ");

    return new Set(
        normalizeText(raw)
            .replace(/[^a-z0-9\s-]/g, " ")
            .split(/\s+/)
            .filter((token) => token.length > 2)
    );
};

const tokenOverlap = (left, right) => {
    if (!left.size || !right.size) return 0;
    let overlap = 0;
    left.forEach((token) => {
        if (right.has(token)) overlap += 1;
    });
    return overlap;
};

// Product recommendations based on cart, user orders, current product/category, popularity, rating, price, and stock
app.post("/api/recommendations", apiLimiter, async (req, res) => {
    try {
        const products = normalizeProducts(await readData(PRODUCTS_FILE));
        const orders = await readData(ORDERS_FILE);
        const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];
        const userEmail = normalizeText(req.body?.userEmail);
        const currentProductId = Number(req.body?.currentProductId) || null;
        const preferredCategory = normalizeText(req.body?.category);
        const limit = Math.max(1, Math.min(120, Number(req.body?.limit) || 12));

        const excludedIds = new Set([
            ...cart.map((item) => Number(item.id)).filter(Boolean),
            ...(currentProductId ? [currentProductId] : [])
        ]);

        const productById = new Map(products.map((product) => [Number(product.id), product]));
        const cartProducts = cart
            .map((item) => productById.get(Number(item.id)) || item)
            .filter(Boolean);
        const cartCategories = new Set(cartProducts.map((item) => normalizeText(item.category)).filter(Boolean));
        const cartTokens = cartProducts.reduce((tokens, item) => {
            getProductTokens(item).forEach((token) => tokens.add(token));
            return tokens;
        }, new Set());
        const cartPrices = cartProducts.map((item) => Number(item.price)).filter((price) => price > 0);
        const averageCartPrice = cartPrices.length
            ? cartPrices.reduce((sum, price) => sum + price, 0) / cartPrices.length
            : 0;
        const userOrders = userEmail
            ? orders.filter((order) => normalizeText(order.userEmail || order.customer?.email) === userEmail)
            : [];
        const userCategories = new Set();
        const userTokens = new Set();
        const purchasedIds = new Set();

        userOrders.forEach((order) => {
            (order.items || []).forEach((item) => {
                if (item.category) userCategories.add(normalizeText(item.category));
                getProductTokens(item).forEach((token) => userTokens.add(token));
                if (item.id) purchasedIds.add(Number(item.id));
            });
        });

        const popularity = new Map();
        const coPurchased = new Map();
        orders.forEach((order) => {
            const orderItems = Array.isArray(order.items) ? order.items : [];
            const orderIds = orderItems.map((item) => Number(item.id)).filter(Boolean);
            orderItems.forEach((item) => {
                const id = Number(item.id);
                if (!id) return;
                popularity.set(id, (popularity.get(id) || 0) + (Number(item.quantity) || 1));
            });
            cartProducts.forEach((cartItem) => {
                const cartId = Number(cartItem.id);
                if (!cartId || !orderIds.includes(cartId)) return;
                orderIds.forEach((id) => {
                    if (id !== cartId) coPurchased.set(id, (coPurchased.get(id) || 0) + 1);
                });
            });
        });

        const currentProduct = currentProductId
            ? products.find((product) => Number(product.id) === currentProductId)
            : null;
        const currentCategory = normalizeText(currentProduct?.category || preferredCategory);
        const currentTokens = currentProduct ? getProductTokens(currentProduct) : new Set();
        const maxSold = Math.max(1, ...Array.from(popularity.values()), 1);

        const recommendations = products
            .filter((product) => !excludedIds.has(Number(product.id)))
            .map((product) => {
                const category = normalizeText(product.category);
                const productTokens = getProductTokens(product);
                let score = 0;
                const reasons = [];

                if (currentCategory && category === currentCategory) {
                    score += 42;
                    reasons.push("Similar item");
                }
                if (preferredCategory && category === preferredCategory) {
                    score += 28;
                    reasons.push("Matches your browsing");
                }
                if (cartCategories.has(category)) {
                    score += 36;
                    reasons.push("Goes with your cart");
                }
                if (userCategories.has(category)) {
                    score += 30;
                    reasons.push("Based on your orders");
                }
                if (purchasedIds.has(Number(product.id))) {
                    score -= 12;
                }

                const soldCount = popularity.get(Number(product.id)) || 0;
                if (soldCount > 0) {
                    score += Math.min(34, (soldCount / maxSold) * 34);
                    reasons.push("Best seller");
                }

                const coPurchaseScore = coPurchased.get(Number(product.id)) || 0;
                if (coPurchaseScore > 0) {
                    score += Math.min(40, coPurchaseScore * 14);
                    reasons.push("Frequently bought together");
                }

                const similarity = tokenOverlap(productTokens, currentTokens) + tokenOverlap(productTokens, cartTokens);
                if (similarity > 0) {
                    score += Math.min(26, similarity * 4);
                    if (!reasons.includes("Similar item")) reasons.push("Similar style");
                }

                const userSimilarity = tokenOverlap(productTokens, userTokens);
                if (userSimilarity > 0) {
                    score += Math.min(18, userSimilarity * 3);
                }

                const rating = Number(product.rating) || 0;
                score += Math.min(18, rating * 3.6);
                if (rating >= 4.5) reasons.push("Highly rated");

                const stock = Number(product.stock) || 0;
                if (stock > 10) score += 10;
                else if (stock > 0) score += 4;
                else score -= 80;

                if (averageCartPrice > 0) {
                    const price = Number(product.price) || 0;
                    const differenceRatio = Math.abs(price - averageCartPrice) / averageCartPrice;
                    score += Math.max(0, 16 - differenceRatio * 18);
                }

                score += Math.random() * 2;
                if (score <= 0) score = rating + soldCount + Math.max(0, stock > 0 ? 2 : 0);

                return {
                    ...normalizeProduct(product),
                    image: getProductImage(product),
                    recommendationScore: Math.round(score),
                    recommendationReason: [...new Set(reasons)].slice(0, 2).join(" | ") || "Recommended for you"
                };
            })
            .sort((a, b) => b.recommendationScore - a.recommendationScore)
            .slice(0, limit);

        return successResponse(res, recommendations);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to load recommendations", "RECOMMENDATIONS_FAILED");
    }
});

// Admin: Create product
app.post("/api/admin/products", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const products = await readData(PRODUCTS_FILE);
        const maxId = (Array.isArray(products) ? products : []).reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
        const newProduct = {
            id: maxId + 1,
            name: req.body.name || "Untitled Product",
            price: Number(req.body.price) || 0,
            category: req.body.category || "electronics",
            images: getCleanProductImages(req.body),
            description: req.body.description || "",
            rating: Number(req.body.rating) || 0,
            reviews: Array.isArray(req.body.reviews) ? req.body.reviews : [],
            stock: Number(req.body.stock) || 0
        };
        newProduct.image = newProduct.images[0];

        const nextProducts = [...(Array.isArray(products) ? products : []), newProduct];
        await writeData(PRODUCTS_FILE, nextProducts);
        return successResponse(res, newProduct, 201);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to create product", "PRODUCT_CREATE_FAILED");
    }
});

// Admin: Update product
app.put("/api/admin/products/:id", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const products = await readData(PRODUCTS_FILE);
        const index = (Array.isArray(products) ? products : []).findIndex((p) => Number(p.id) === productId);

        if (index === -1) {
            return errorResponse(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
        }

        const existing = products[index];
        const updatedProduct = {
            ...existing,
            ...req.body,
            id: existing.id,
            price: req.body.price !== undefined ? Number(req.body.price) : existing.price,
            stock: req.body.stock !== undefined ? Number(req.body.stock) : existing.stock,
            rating: req.body.rating !== undefined ? Number(req.body.rating) : existing.rating,
            images: Array.isArray(req.body.images) ? getCleanProductImages(req.body) : getCleanProductImages(existing),
            reviews: Array.isArray(req.body.reviews) ? req.body.reviews : existing.reviews
        };
        updatedProduct.image = updatedProduct.images[0];

        const nextProducts = [...products];
        nextProducts[index] = updatedProduct;
        await writeData(PRODUCTS_FILE, nextProducts);
        return successResponse(res, updatedProduct);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to update product", "PRODUCT_UPDATE_FAILED");
    }
});

// Admin: Delete product
app.delete("/api/admin/products/:id", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const productId = Number(req.params.id);
        const products = await readData(PRODUCTS_FILE);
        const nextProducts = (Array.isArray(products) ? products : []).filter((p) => Number(p.id) !== productId);

        if (nextProducts.length === (Array.isArray(products) ? products : []).length) {
            return errorResponse(res, 404, "Product not found", "PRODUCT_NOT_FOUND");
        }

        const deletedProduct = (Array.isArray(products) ? products : []).find((p) => Number(p.id) === productId);
        await writeData(PRODUCTS_FILE, nextProducts);
        return successResponse(res, { deletedProduct });
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to delete product", "PRODUCT_DELETE_FAILED");
    }
});

// 2️⃣ Create Razorpay Order
app.post("/api/create-order", apiLimiter, async (req, res) => {
    if (!hasRazorpayKeys || !razorpay) {
        return errorResponse(res, 503, "Payment gateway not configured", "RAZORPAY_NOT_CONFIGURED");
    }

    try {
        const { amount } = req.body;
        const amountInPaise = Math.round(Number(amount) * 100);

        if (!amountInPaise || amountInPaise <= 0) {
            return errorResponse(res, 400, "Invalid amount", "INVALID_AMOUNT");
        }

        const options = {
            amount: amountInPaise,
            currency: "INR",
            receipt: "receipt_" + Date.now()
        };

        const order = await razorpay.orders.create(options);
        return successResponse(res, { ...order, keyId: RAZORPAY_KEY_ID });

    } catch (error) {
        console.error(error);
        return errorResponse(res, 500, "Unable to create order", "ORDER_CREATION_FAILED");
    }
});

// 3️⃣ Save Order After Payment
app.post("/api/orders", apiLimiter, async (req, res) => {
    try {
        const products = await readData(PRODUCTS_FILE);
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        
        // Validate stock for all items
        for (const item of items) {
            const product = (Array.isArray(products) ? products : []).find(p => Number(p.id) === Number(item.id));
            if (!product) {
                return errorResponse(res, 404, `Product ${item.name || item.id} not found in inventory`, "PRODUCT_NOT_FOUND");
            }
            
            const availableStock = Number(product.stock) || 0;
            const requestedQty = Number(item.quantity) || 0;
            
            if (requestedQty > availableStock) {
                return errorResponse(res, 400, `Insufficient stock for ${item.name || item.id}. Available: ${availableStock}, Requested: ${requestedQty}`, "INSUFFICIENT_STOCK");
            }
        }
        
        const orders = await readData(ORDERS_FILE);
        const incomingStatus = req.body.status;
        const incomingPaymentMethod = normalizeText(req.body.paymentMethod);
        const resolvedStatus =
            incomingStatus ||
            (["cod", "cash on delivery"].includes(incomingPaymentMethod) ? "Pending" : "Success");

        const orderSubtotal = items.reduce(
            (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
            0
        );
        const couponCode = normalizeCouponCode(req.body.couponCode || req.body.activeCoupon);
        if (couponCode) {
            const coupon = await findCouponByCode(couponCode);
            const couponCheck = validateCouponRecord(coupon, orderSubtotal);
            if (!couponCheck.valid) {
                return errorResponse(res, 400, couponCheck.error, couponCheck.code);
            }
        }

        const timestamp = new Date().toISOString();
        const newOrder = {
            ...req.body,
            orderId: "ORD-" + Date.now(),
            orderDate: req.body.orderDate || timestamp,
            createdAt: req.body.createdAt || timestamp,
            status: resolvedStatus,
            ...(couponCode ? { couponCode } : {}),
        };

        const nextOrders = [...(Array.isArray(orders) ? orders : []), newOrder];
        await writeData(ORDERS_FILE, nextOrders);

        if (couponCode) {
            await incrementCouponUsage(couponCode);
        }

        const nextProducts = (Array.isArray(products) ? products : []).map((product) => {
            const item = items.find((item) => Number(item.id) === Number(product.id));
            if (!item) return product;
            return {
                ...product,
                stock: Math.max(0, (Number(product.stock) || 0) - (Number(item.quantity) || 1))
            };
        });
        await writeData(PRODUCTS_FILE, nextProducts);

        return successResponse(res, newOrder, 201);

    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to save order", "ORDER_SAVE_FAILED");
    }
});

// Customer: Cancel own order
app.put("/api/orders/:orderId/cancel", verifyUser, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const orders = await readData(ORDERS_FILE);
        const index = (Array.isArray(orders) ? orders : []).findIndex((o) => o.orderId === orderId);

        if (index === -1) {
            return errorResponse(res, 404, "Order not found", "ORDER_NOT_FOUND");
        }

        const order = orders[index];
        const userEmail = String(req.authUser.email || '').trim().toLowerCase();
        const orderEmail = String(order.userEmail || order.customer?.email || '').trim().toLowerCase();

        if (req.authUser.role !== 'admin' && orderEmail !== userEmail) {
            return errorResponse(res, 403, "You are not authorized to cancel this order.", "ORDER_CANCEL_FORBIDDEN");
        }

        if (!isCancellableStatus(order.status)) {
            return errorResponse(res, 400, `Cannot cancel order with status: ${order.status}. Only Pending, Paid, Success, or Processing orders can be cancelled.`, "ORDER_CANCEL_NOT_ALLOWED");
        }

        const inventoryRestoredAt = await restoreStockForOrder(order);

        orders[index] = {
            ...order,
            status: "Cancelled",
            cancelReason: reason || "Cancelled by customer",
            cancelledAt: new Date().toISOString(),
            inventoryRestoredAt,
            statusUpdatedAt: new Date().toISOString()
        };

        await writeData(ORDERS_FILE, orders);
        return successResponse(res, orders[index]);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to cancel order", "ORDER_CANCEL_FAILED");
    }
});

// Customer: Return delivered order
app.put("/api/orders/:orderId/return", verifyUser, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const orders = await readData(ORDERS_FILE);
        const index = (Array.isArray(orders) ? orders : []).findIndex((o) => o.orderId === orderId);

        if (index === -1) {
            return errorResponse(res, 404, "Order not found", "ORDER_NOT_FOUND");
        }

        const order = orders[index];
        const userEmail = String(req.authUser.email || '').trim().toLowerCase();
        const orderEmail = String(order.userEmail || order.customer?.email || '').trim().toLowerCase();

        if (req.authUser.role !== 'admin' && orderEmail !== userEmail) {
            return errorResponse(res, 403, "You are not authorized to return this order.", "ORDER_RETURN_FORBIDDEN");
        }

        if (!isDeliveredStatus(order.status)) {
            return errorResponse(res, 400, `Only Delivered orders can be returned. Current status: ${order.status}`, "ORDER_RETURN_NOT_ALLOWED");
        }

        orders[index] = {
            ...order,
            status: "Return Requested",
            returnReason: reason || "Return requested by customer",
            returnRequestedAt: new Date().toISOString(),
            statusUpdatedAt: new Date().toISOString()
        };

        await writeData(ORDERS_FILE, orders);
        return successResponse(res, orders[index]);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to request order return", "ORDER_RETURN_FAILED");
    }
});

// 4️⃣ Get All Orders
app.get("/api/orders", verifyUser, async (req, res) => {
    const orders = await readData(ORDERS_FILE);
    if (req.authUser.role === 'admin') {
        return successResponse(res, orders);
    }

    const filtered = (Array.isArray(orders) ? orders : []).filter((order) => {
        const email = String(order.userEmail || order.customer?.email || '').trim().toLowerCase();
        return email && email === String(req.authUser.email || '').trim().toLowerCase();
    });
    return successResponse(res, filtered);
});

// Admin: Update order status
app.put("/api/admin/orders/:orderId/status", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;
        const allowedStatuses = ["Pending", "Paid", "Processing", "Shipped", "Out for Delivery", "Delivered", "Cancelled", "Return Requested", "Returned", "Success"];

        if (!status || !allowedStatuses.includes(status)) {
            return errorResponse(res, 400, "Invalid status", "INVALID_STATUS");
        }

        const orders = await readData(ORDERS_FILE);
        const index = (Array.isArray(orders) ? orders : []).findIndex((o) => o.orderId === orderId);

        if (index === -1) {
            return errorResponse(res, 404, "Order not found", "ORDER_NOT_FOUND");
        }

        const shouldRestoreStock = ["Cancelled", "Returned"].includes(status);
        const inventoryRestoredAt = shouldRestoreStock
            ? await restoreStockForOrder(orders[index])
            : orders[index].inventoryRestoredAt;

        orders[index] = {
            ...orders[index],
            status,
            ...(inventoryRestoredAt ? { inventoryRestoredAt } : {}),
            statusUpdatedAt: new Date().toISOString()
        };

        await writeData(ORDERS_FILE, orders);
        return successResponse(res, orders[index]);
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to update order status", "ORDER_STATUS_UPDATE_FAILED");
    }
});

// Admin: Basic analytics
app.get("/api/admin/stats", adminLimiter, verifyAdmin, async (req, res) => {
    try {
        const products = await readData(PRODUCTS_FILE);
        const orders = await readData(ORDERS_FILE);
        const totalRevenue = (Array.isArray(orders) ? orders : []).reduce((sum, order) => {
            const directTotal = Number(order.total) || 0;
            const summaryTotal = Number(order.summary?.totalPayable) || 0;
            return sum + (directTotal || summaryTotal);
        }, 0);

        const pendingOrders = (Array.isArray(orders) ? orders : []).filter((o) => {
            const status = String(o.status || "").toLowerCase();
            return status.includes("pending") || status.includes("processing");
        }).length;

        return successResponse(res, {
            totalProducts: Array.isArray(products) ? products.length : 0,
            totalOrders: Array.isArray(orders) ? orders.length : 0,
            pendingOrders,
            totalRevenue
        });
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Unable to load analytics stats", "STATS_LOAD_FAILED");
    }
});

// AI chatbot: real website assistant with live store context
app.post("/api/chatbot", apiLimiter, async (req, res) => {
    try {
        const message = String(req.body?.message || "").trim();
        const requestUser = req.body?.user || null;
        const cart = Array.isArray(req.body?.cart) ? req.body.cart : [];
        const wishlist = Array.isArray(req.body?.wishlist) ? req.body.wishlist : [];
        const clientOrders = Array.isArray(req.body?.orders) ? req.body.orders : [];
        const activeCoupon = String(req.body?.activeCoupon || "").trim();
        const discountPercent = Number(req.body?.discountPercent) || 0;
        const authToken = getBearerToken(req);
        const authUser = await getSessionUser(authToken);
        const isAdmin = authUser?.role === 'admin';
        const user = authUser || requestUser || null;

        if (!message) {
            return errorResponse(res, 400, "Message is required", "CHATBOT_MESSAGE_REQUIRED");
        }

        const { products, orders, settings, coupons } = await getPublicStats();
        const userEmail = String(user?.email || "").trim().toLowerCase();
        const userOrders = userEmail
            ? orders.filter((order) => String(order.userEmail || order.customer?.email || "").trim().toLowerCase() === userEmail)
            : clientOrders;
        const latestUserOrders = [...userOrders]
            .sort((a, b) => new Date(b.createdAt || b.orderDate || 0) - new Date(a.createdAt || a.orderDate || 0))
            .slice(0, 5)
            .map((order) => ({
                orderId: order.orderId,
                status: order.status,
                total: getOrderTotal(order),
                paymentMethod: order.paymentMethod || order.paymentStatus,
                items: (order.items || []).slice(0, 3).map((item) => ({
                    name: item.name,
                    quantity: item.quantity || 1,
                    price: item.price
                })),
                orderDate: order.orderDate || order.createdAt
            }));

        const smart = buildSmartReply({
            message,
            products,
            orders,
            settings,
            coupons,
            cart,
            user,
            isAdmin,
            wishlist,
            activeCoupon,
            discountPercent,
        });

        const context = {
            store: STORE_INFO,
            stats: {
                totalProducts: products.length,
                discountPercent: settings.discountPercent,
                activeCoupon,
            },
            products: products.slice(0, 60).map((product) => ({
                id: product.id,
                name: product.name,
                price: product.price,
                category: product.category,
                stock: product.stock,
                rating: product.rating,
            })),
            cart: cart.map((item) => ({
                name: item.name,
                price: item.price,
                quantity: item.quantity || 1,
            })),
            wishlistCount: wishlist.length,
            user: user
                ? {
                      name: user.name || user.fullName,
                      email: user.email,
                      role: isAdmin ? "admin" : "customer",
                  }
                : null,
            userOrders: latestUserOrders,
            isAdmin,
        };

        let reply = smart.reply;
        let links = smart.links || [];
        let mode = "smart";

        if (OPENAI_API_KEY && !smart.skipAiPolish) {
            try {
                const aiReply = await callOpenAIChatbot({
                    message,
                    context,
                    suggestedAnswer: smart.reply,
                });
                if (aiReply) {
                    reply = aiReply;
                    mode = "ai";
                }
            } catch (aiError) {
                console.error("AI chatbot polish skipped:", aiError.message);
            }
        }

        return successResponse(res, {
            reply,
            mode,
            links,
        });
    } catch (err) {
        console.error(err);
        return errorResponse(res, 500, "Chatbot response failed", "CHATBOT_FAILED");
    }
});

// Start Server
const CLIENT_BUILD_PATH = path.join(__dirname, '..', 'build');
const hasClientBuild = fs.existsSync(CLIENT_BUILD_PATH);

if (hasClientBuild) {
    app.use(express.static(CLIENT_BUILD_PATH));
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({ success: false, error: 'API route not found' });
        }
        return res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
    });
}

const initializeBackend = async () => {
    if (USE_MONGO) {
        try {
            await db.connect();
            mongoConnected = true;
            console.log('✅ MongoDB connected successfully.');
        } catch (err) {
            console.warn('⚠️ MongoDB connection failed. Falling back to JSON file storage.', err.message || err);
            mongoConnected = false;
        }
    }

    if (MONGODB_URI && MIGRATE_MONGO_ON_START && mongoConnected) {
        migrateMongoFromJson({ uri: MONGODB_URI, dbName: MONGODB_DB })
            .then(() => console.log('✅ MongoDB migration completed.'))
            .catch((err) => console.error('❌ MongoDB migration failed:', err.message || err));
    }

    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Backend ready at http://localhost:${PORT}`);
        if (USE_MONGO && !mongoConnected) {
            console.warn('⚠️ MongoDB is disabled because connection could not be established. The server is using local JSON data files instead.');
        }
    });
};

initializeBackend();
