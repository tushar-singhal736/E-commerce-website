/**
 * SuperNova smart shopping assistant — Amazon-style intent engine.
 * Uses live store data; no hallucinated products or orders.
 */

const STORE_INFO = {
    brand: "SuperNova",
    owner: "Tushar Singhal",
    contactEmail: "tusharsinghal1250@gmail.com",
    contactPhone: "+91 7455096791",
    address: "AS boys hostel, Paintra Knowledge Park 3, Greater Noida",
    tagline: "Premium ecommerce for fashion, shoes, jewellery, and electronics.",
};

const WEBSITE_PAGES = {
    home: { path: "/", label: "Home", desc: "Banner deals, categories, featured products, add to cart" },
    products: { path: "/products", label: "All Products", desc: "Search, filter by category, sort, pagination" },
    productDetail: { path: "/product/:id", label: "Product Page", desc: "Images, variants, reviews, add to cart, buy now" },
    cart: { path: "/cart", label: "Cart", desc: "Update quantity, remove items, coupons, checkout" },
    checkout: { path: "/checkout", label: "Checkout", desc: "Address, Razorpay online pay, Cash on Delivery" },
    orders: { path: "/orders", label: "My Orders", desc: "Track status, cancel pending orders, return delivered" },
    wishlist: { path: "/wishlist", label: "Wishlist", desc: "Saved products, move to cart" },
    profile: { path: "/profile", label: "Profile", desc: "Account details and logout" },
    login: { path: "/login", label: "Login", desc: "Sign in for orders, checkout, profile" },
    admin: { path: "/admin", label: "Admin Panel", desc: "Dashboard, products, orders, store discount (admin only)" },
};

const POLICY_PAGES = {
    about: { path: "/pages/about", title: "About SuperNova" },
    contact: { path: "/pages/contact", title: "Contact Us" },
    privacy: { path: "/pages/privacy", title: "Privacy Policy" },
    terms: { path: "/pages/terms", title: "Terms & Conditions" },
    returns: { path: "/pages/returns", title: "Return Policy" },
    shipping: { path: "/pages/shipping", title: "Shipping Policy" },
};

const AUTO_DISCOUNT_RULES = [
    { minSubtotal: 1000, percent: 10 },
    { minSubtotal: 500, percent: 5 },
];

const formatCouponList = (coupons = []) => {
    if (!Array.isArray(coupons) || !coupons.length) {
        return "Abhi koi active coupon nahi hai";
    }
    return coupons
        .map((coupon) => {
            const minText = Number(coupon.minOrderAmount) > 0
                ? `, min Rs.${Number(coupon.minOrderAmount).toLocaleString("en-IN")}`
                : "";
            return `${coupon.code} (${Number(coupon.percent) || 0}% OFF${minText})`;
        })
        .join(", ");
};

const normalize = (value = "") => String(value).trim().toLowerCase();

const formatPrice = (price) => `Rs. ${Number(price || 0).toLocaleString("en-IN")}`;

const matchAny = (q, keywords = []) => keywords.some((word) => q.includes(normalize(word)));

const isLoginQuestion = (q) =>
    matchAny(q, [
        "login",
        "log in",
        "sign in",
        "signin",
        "signup",
        "sign up",
        "register",
        "create account",
        "forgot password",
        "reset password",
    ]) ||
    /\bhow\s+(to|do\s+i)\s+(login|sign\s*in|register|signup)\b/.test(q) ||
    /\b(login|sign\s*in|signup)\s+kaise\b/.test(q) ||
    /\bkaise\s+(login|sign\s*in|account\s+banau|register)\b/.test(q);

const buildLoginAnswer = (userEmail) => {
    if (userEmail) {
        return {
            reply:
                `Aap pehle se login ho (${userEmail}). Profile ya Orders use kar sakte ho. Logout ke liye Profile page par jao. Naye account ki zaroorat nahi — agar doosre account se login karna ho to pehle logout karein, phir Login page par Sign In karein.`,
            links: [
                { label: "My Profile", to: "/profile" },
                { label: "My Orders", to: "/orders" },
            ],
            skipAiPolish: true,
        };
    }

    return {
        reply:
            "Login kaise karein (SuperNova):\n" +
            "1) Navbar se Login / account icon par click karein ya /login page kholo.\n" +
            "2) Apna Email aur Password enter karo.\n" +
            "3) Sign In dabao — sahi credentials par Profile page khulega.\n\n" +
            "Naya account: Login page par Signup → Full name, DOB, phone, email, password → Create Account → phir Sign In.\n" +
            "Password bhool gaye: Forgot password? → email + naya password (min 6 chars) → reset ke baad Sign In.\n\n" +
            "Login ke baad: checkout, My Orders, wishlist aur profile sab unlock ho jata hai.",
        links: [
            { label: "Go to Login", to: "/login" },
            { label: "Browse products", to: "/products" },
        ],
        skipAiPolish: true,
    };
};

const getOrderTotal = (order) => Number(order?.total) || Number(order?.summary?.totalPayable) || 0;

const getCartSummary = (cart = []) => {
    const items = Array.isArray(cart) ? cart : [];
    const itemCount = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const subtotal = items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
        0
    );
    const lines = items.slice(0, 5).map(
        (item) => `${item.name} x${item.quantity || 1} (${formatPrice(item.price)})`
    );
    return { itemCount, subtotal, lines };
};

const getAutoDiscountPercent = (subtotal) => {
    const rules = [...AUTO_DISCOUNT_RULES].sort((a, b) => b.minSubtotal - a.minSubtotal);
    const rule = rules.find((entry) => subtotal >= entry.minSubtotal);
    return rule ? rule.percent : 0;
};

const getOfferText = (settings = {}, discountPercent = 0, activeCoupon = "", coupons = []) => {
    const store = Number(settings.discountPercent) || 0;
    const effective = Number(discountPercent) || Math.max(store, 0);
    const parts = [];

    if (store > 0) parts.push(`Store-wide ${store}% OFF (admin offer) checkout par apply hota hai`);
    if (activeCoupon) parts.push(`Coupon ${activeCoupon} active hai`);
    if (!parts.length && effective > 0) parts.push(`Abhi ${effective}% discount checkout par apply ho sakta hai`);
    parts.push("Auto discount: cart Rs.500+ par 5% OFF, Rs.1000+ par 10% OFF");
    parts.push(`Valid coupons: ${formatCouponList(coupons)} (Cart page par apply karein)`);

    if (!effective && !store) {
        return `${parts.join(". ")}. Abhi koi extra live store offer active nahi — coupon ya auto cart discount use kar sakte hain.`;
    }
    return parts.join(". ") + ".";
};

const scoreProduct = (product, query) => {
    const q = normalize(query);
    const name = normalize(product.name);
    const category = normalize(product.category);
    const description = normalize(product.description || "");
    let score = 0;

    if (q.includes(name) || name.includes(q)) score += 20;
    if (q.includes(category)) score += 8;

    const tokens = q.split(/[^a-z0-9]+/).filter((token) => token.length > 2);
    tokens.forEach((token) => {
        if (name.includes(token)) score += 4;
        if (category.includes(token)) score += 3;
        if (description.includes(token)) score += 1;
    });

    return score;
};

const findProducts = (products, query, limit = 5) => {
    return [...products]
        .map((product) => ({ product, score: scoreProduct(product, query) }))
        .filter((entry) => entry.score > 0)
        .sort((a, b) => b.score - a.score || (Number(b.product.rating) || 0) - (Number(a.product.rating) || 0))
        .slice(0, limit)
        .map((entry) => entry.product);
};

const getCategoryStats = (products) => {
    const counts = products.reduce((acc, product) => {
        const category = String(product.category || "other").toLowerCase();
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});
    return Object.entries(counts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, count]) => ({ name, count }));
};

const extractOrderId = (message) => {
    const match = String(message || "").match(/ord[-\s]?\d+/i);
    return match ? match[0].replace(/\s+/g, "-").toUpperCase() : null;
};

const buildGreeting = ({ user, cart, sortedUserOrders, isAdmin, settings, discountPercent, activeCoupon, coupons = [] }) => {
    const { itemCount } = getCartSummary(cart);

    if (!user?.email) {
        return {
            reply: `Namaste! 👋 Main ${STORE_INFO.brand} ka AI assistant hoon. Pehle login karein, phir main aapke orders, products, cart sab kuch personally track kar sakta hoon.`,
            links: [
                { label: "Login / Signup", to: "/login" },
                { label: "Browse without login", to: "/products" },
            ],
        };
    }

    const name = user.name || user.fullName || user.email.split("@")[0];
    const latest = sortedUserOrders[0];
    const orderLine = latest
        ? ` Latest order ${latest.orderId} — status: ${latest.status || "Processing"}.`
        : " Abhi aapke account me koi order nahi hai.";
    const adminLine = isAdmin ? " Aap admin mode me ho — dashboard, products aur orders manage kar sakte hain." : "";

    return {
        reply: `Namaste ${name}! Aap ${user.email} se login ho. Cart me ${itemCount} item(s) hain.${orderLine}${adminLine} ${getOfferText(settings, discountPercent, activeCoupon, coupons)}`,
        links: [
            { label: "My Orders", to: "/orders" },
            { label: "Cart", to: "/cart" },
            { label: "Shop", to: "/products" },
        ],
    };
};

const buildSmartReply = ({
    message,
    products = [],
    orders = [],
    settings = {},
    coupons = [],
    cart = [],
    user = null,
    isAdmin = false,
    wishlist = [],
    activeCoupon = "",
    discountPercent = 0,
}) => {
    const q = normalize(message);
    if (!q) {
        return { reply: "Apna sawal type kijiye — main website ki har cheez me help karunga.", links: [{ label: "Products", to: "/products" }] };
    }

    const userEmail = String(user?.email || "").trim().toLowerCase();
    const userOrders = userEmail
        ? orders.filter(
              (order) =>
                  String(order.userEmail || order.customer?.email || "")
                      .trim()
                      .toLowerCase() === userEmail
          )
        : [];
    const sortedUserOrders = [...userOrders].sort(
        (a, b) => new Date(b.createdAt || b.orderDate || 0) - new Date(a.createdAt || a.orderDate || 0)
    );
    const categories = getCategoryStats(products);
    const { itemCount, subtotal, lines } = getCartSummary(cart);
    const totalStock = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const orderId = extractOrderId(message);

    // —— Login (high priority — "how to login" etc.) ——
    if (isLoginQuestion(q)) {
        return buildLoginAnswer(userEmail);
    }

    // —— Greeting ——
    if (matchAny(q, ["hello", "hi", "hey", "namaste", "start"]) || q === "help") {
        return buildGreeting({ user, cart, sortedUserOrders, isAdmin, settings, discountPercent, activeCoupon, coupons });
    }

    // —— Account / profile (already logged in) ——
    if (matchAny(q, ["my account", "profile", "logout", "account settings"])) {
        if (!userEmail) {
            return buildLoginAnswer("");
        }
        return {
            reply: `Aap logged in ho as ${userEmail}. Profile page par naam/email dekh sakte hain aur logout kar sakte hain. Orders page par saari purchases, cancel aur return options milengi.`,
            links: [{ label: "Profile", to: "/profile" }, { label: "My Orders", to: "/orders" }],
            skipAiPolish: true,
        };
    }

    // —— Specific order tracking ——
    if (orderId || matchAny(q, ["track", "tracking", "order status", "mera order", "delivery status", "kahan hai order"])) {
        if (!userEmail && !isAdmin) {
            return {
                reply: "Order track karne ke liye pehle login karein. Phir My Orders par status, items aur payment details dikhengi. Order ID bhi puch sakte hain jaise ORD-123.",
                links: [{ label: "Login", to: "/login" }],
            };
        }

        const pool = isAdmin ? orders : userOrders;
        const target = orderId
            ? pool.find((o) => normalize(o.orderId) === normalize(orderId))
            : sortedUserOrders[0];

        if (!target) {
            return {
                reply: orderId
                    ? `Order ID ${orderId} aapke account me nahi mila. Sahi ID check karein ya naya order place karein.`
                    : "Aapke account me abhi koi order nahi hai. Products add karke checkout se order place karein.",
                links: [{ label: "Shop products", to: "/products" }, { label: "Checkout", to: "/checkout" }],
            };
        }

        const items = (target.items || [])
            .slice(0, 4)
            .map((item) => `${item.name} x${item.quantity || 1}`)
            .join(", ");

        return {
            reply: `Order ${target.orderId}: Status — ${target.status || "Processing"}. Items: ${items || "details unavailable"}. Total ${formatPrice(getOrderTotal(target))}. Payment: ${target.paymentMethod || target.paymentStatus || "N/A"}. Date: ${target.orderDate || target.createdAt || "N/A"}. Cancel sirf Pending/Processing par; Return Delivered ke baad My Orders se.`,
            links: [{ label: "Open orders", to: isAdmin ? "/admin/orders" : "/orders" }],
        };
    }

    // —— All orders list ——
    if (matchAny(q, ["all orders", "mere orders", "order history", "kitne order", "orders list"])) {
        if (!userEmail) {
            return {
                reply: "Order history dekhne ke liye login karein.",
                links: [{ label: "Login", to: "/login" }],
            };
        }
        if (!sortedUserOrders.length) {
            return {
                reply: "Aapne abhi tak koi order place nahi kiya.",
                links: [{ label: "Start shopping", to: "/products" }],
            };
        }
        const summary = sortedUserOrders
            .slice(0, 5)
            .map((o) => `${o.orderId} (${o.status || "Processing"}) — ${formatPrice(getOrderTotal(o))}`)
            .join("; ");
        return {
            reply: `Aapke ${sortedUserOrders.length} order(s): ${summary}.`,
            links: [{ label: "My Orders", to: "/orders" }],
        };
    }

    // —— Wishlist ——
    if (matchAny(q, ["wishlist", "wish list", "saved", "favourite", "favorite"])) {
        const count = Array.isArray(wishlist) ? wishlist.length : 0;
        if (!count) {
            return {
                reply: "Wishlist khali hai. Product card par heart icon se items save karein.",
                links: [{ label: "Browse products", to: "/products" }],
            };
        }
        const names = wishlist.slice(0, 4).map((item) => item.name).join(", ");
        return {
            reply: `Wishlist me ${count} product(s): ${names}${count > 4 ? "..." : ""}. Wishlist page se cart me add kar sakte hain.`,
            links: [{ label: "Open wishlist", to: "/wishlist" }],
        };
    }

    // —— Cart ——
    if (matchAny(q, ["cart", "bag", "basket", "subtotal"])) {
        if (!itemCount) {
            return {
                reply: "Cart empty hai. Products se Add to Cart karein.",
                links: [{ label: "Products dekhen", to: "/products" }],
            };
        }
        const auto = getAutoDiscountPercent(subtotal);
        return {
            reply: `${itemCount} item(s) - Subtotal ${formatPrice(subtotal)}. Items: ${lines.join(", ")}. Auto discount: ${auto}% available.`,
            links: [{ label: "Cart", to: "/cart" }, { label: "Checkout", to: "/checkout" }],
        };
    }

    // —— Coupons ——
    if (matchAny(q, ["coupon", "promo", "promocode", "code"])) {
        const mentioned = (coupons || []).find((coupon) => q.includes(String(coupon.code || "").toLowerCase()));
        const activeText = activeCoupon ? `Aapka active coupon: ${activeCoupon}.` : "Abhi koi coupon apply nahi hai.";
        const detail = mentioned
            ? `${mentioned.code}: ${mentioned.percent}% OFF${Number(mentioned.minOrderAmount) > 0 ? ` (min Rs.${mentioned.minOrderAmount})` : ""}.`
            : formatCouponList(coupons);
        return {
            reply: `${activeText} Active coupons — ${detail} Cart page par code enter karke Apply karein.`,
            links: [{ label: "Go to Cart", to: "/cart" }],
        };
    }

    // —— Offers / discount ——
    if (matchAny(q, ["discount", "offer", "sale", "off", "deal"])) {
        return {
            reply: getOfferText(settings, discountPercent, activeCoupon, coupons),
            links: [{ label: "Shop deals", to: "/products" }, { label: "Cart", to: "/cart" }],
        };
    }

    // —— Checkout & payment ——
    if (matchAny(q, ["checkout", "payment", "pay", "razorpay", "cod", "cash on delivery", "online pay"])) {
        if (!userEmail) {
            return {
                reply: "Checkout ke liye login zaroori hai. Phir address aur payment method (Online/COD) choose karein.",
                links: [{ label: "Login", to: "/login" }],
            };
        }
        return {
            reply: "Checkout: Address fill karein → Payment method (Razorpay/Cash on Delivery) select → Order confirm. Track order My Orders par.",
            links: [{ label: "Checkout", to: "/checkout" }, { label: "Cart", to: "/cart" }],
        };
    }

    // —— Cancel ——
    if (matchAny(q, ["cancel", "cancel order", "order cancel"])) {
        return {
            reply: "Sirf Pending ya Processing orders cancel ho sakte hain — My Orders page par Cancel button se. Shipped/Delivered orders cancel nahi hote.",
            links: [{ label: "My Orders", to: "/orders" }],
        };
    }

    // —— Return / refund ——
    if (matchAny(q, ["return", "refund", "exchange", "wapas"])) {
        return {
            reply: "Return: Delivered order par My Orders se return request. Pickup ~2 business days, refund inspection ke baad. Policy: /pages/returns — damaged/wrong item jaldi report karein.",
            links: [{ label: "Returns policy", to: "/pages/returns" }, { label: "My Orders", to: "/orders" }],
        };
    }

    // —— Shipping ——
    if (matchAny(q, ["shipping", "delivery", "dispatch", "courier", "kitne din"])) {
        return {
            reply: "Shipping: usually 3–5 business days. Charges checkout se pehle dikhte hain. Tracking My Orders par update hoti hai. Details: Shipping Policy page.",
            links: [{ label: "Shipping policy", to: "/pages/shipping" }, { label: "My Orders", to: "/orders" }],
        };
    }

    // —— Policies & static pages ——
    if (matchAny(q, ["privacy", "data", "personal information"])) {
        return {
            reply: "Privacy: sirf order/support ke liye data; payment secure providers; data third parties ko sell nahi hota.",
            links: [{ label: "Privacy policy", to: "/pages/privacy" }],
        };
    }
    if (matchAny(q, ["terms", "condition", "rules"])) {
        return {
            reply: "Terms: prices/stock change ho sakte hain; failed payment par cancel; misuse restrict ho sakta hai.",
            links: [{ label: "Terms", to: "/pages/terms" }],
        };
    }
    if (matchAny(q, ["about", "supernova", "brand", "company"])) {
        return {
            reply: `${STORE_INFO.brand}: ${STORE_INFO.tagline} Categories — fashion, shoes, jewellery, electronics. Secure checkout, tracking, returns.`,
            links: [{ label: "About us", to: "/pages/about" }],
        };
    }

    // —— Contact ——
    if (matchAny(q, ["contact", "email", "phone", "call", "owner", "address", "support", "help line"])) {
        return {
            reply: `Support — Owner: ${STORE_INFO.owner}. Email: ${STORE_INFO.contactEmail}. Phone: ${STORE_INFO.contactPhone}. Address: ${STORE_INFO.address}.`,
            links: [{ label: "Contact page", to: "/pages/contact" }, { label: userEmail ? "Profile" : "Login", to: userEmail ? "/profile" : "/login" }],
        };
    }

    // —— Admin ——
    if (matchAny(q, ["admin", "dashboard", "panel", "manage product", "manage order"])) {
        const pending = orders.filter((o) => {
            const s = normalize(o.status);
            return s.includes("pending") || s.includes("processing");
        }).length;
        const revenue = orders.reduce((sum, o) => sum + getOrderTotal(o), 0);
        if (!isAdmin) {
            return {
                reply: `Admin panel sirf admin login ke liye hai — products CRUD, order status, revenue, store discount. Stats: ${products.length} products, ${orders.length} orders, ${pending} pending.`,
                links: [{ label: "Customer shopping", to: "/products" }],
            };
        }
        return {
            reply: `Admin mode ON. ${products.length} products, ${orders.length} orders, ${pending} pending/processing, revenue ${formatPrice(revenue)}. Admin Products, Admin Orders, store discount set kar sakte hain.`,
            links: [
                { label: "Admin dashboard", to: "/admin" },
                { label: "Manage products", to: "/admin/products" },
                { label: "Manage orders", to: "/admin/orders" },
            ],
        };
    }

    // —— How to use website (not login — login handled above) ——
    if (
        matchAny(q, ["website", "site", "guide", "kya kya", "features", "sab kuch", "full info", "help center"]) ||
        (q.includes("kaise") && !isLoginQuestion(q))
    ) {
        const catList = categories.slice(0, 5).map((c) => `${c.name} (${c.count})`).join(", ") || "loading";
        return {
            reply: `Website flow: Home → Products (search/filter) → Product Detail → Cart → Checkout → Track Order. Categories: ${catList}. Ask me: "cart", "orders", "products under 1000", "return policy", etc.`,
            links: [
                { label: "Home", to: "/" },
                { label: "Products", to: "/products" },
                { label: "My Orders", to: "/orders" },
            ],
        };
    }

    // —— Reviews ——
    if (matchAny(q, ["review", "rating", "feedback", "star"])) {
        return {
            reply: "Product page ke neeche Ratings & Reviews: stars select karein, short review likhein, Post Review dabayein. Reviews local save hoti hain product ke saath.",
            links: [{ label: "Browse products", to: "/products" }],
        };
    }

    // —— Theme ——
    if (matchAny(q, ["dark mode", "light mode", "theme"])) {
        return {
            reply: "Navbar par theme toggle se Dark/Light mode switch hota hai. Preference browser me save hoti hai.",
            links: [{ label: "Home", to: "/" }],
        };
    }

    // —— Search tips ——
    if (matchAny(q, ["search", "find product", "dhundo", "filter", "sort"])) {
        return {
            reply: "Products page par category filter, search bar, aur sorting use karein. Home banner se category shortcuts bhi hain.",
            links: [{ label: "All products", to: "/products" }],
        };
    }

    // —— Stats ——
    if (matchAny(q, ["kitne product", "how many", "total product", "stock", "inventory", "count", "kul"])) {
        const orderCount = isAdmin ? orders.length : sortedUserOrders.length;
        if (matchAny(q, ["product"])) {
            return {
                reply: `Catalog me ${products.length} products hain - ${categories.length} categories me. Total stock: ${totalStock} units.`,
                links: [{ label: "Sab products dekhen", to: "/products" }],
            };
        }
        if (matchAny(q, ["order"])) {
            if (!userEmail && !isAdmin) {
                return {
                    reply: "Apne abhi login nahi kiya. Login karein to aapke orders dikhenge.",
                    links: [{ label: "Login", to: "/login" }],
                };
            }
            if (orderCount === 0) {
                return {
                    reply: "Abhi koi order nahi hai.",
                    links: [{ label: "Shopping start karein", to: "/products" }],
                };
            }
            return {
                reply: `${orderCount} order(s) hain. My Orders page par sab details dekh sakte hain.`,
                links: [{ label: "My Orders", to: isAdmin ? "/admin/orders" : "/orders" }],
            };
        }
        // General stats
        return {
            reply: `${products.length} products, ${categories.length} categories, ${totalStock} stock. ${isAdmin ? `${orders.length} total orders, ${sortedUserOrders.length} your orders.` : `${orderCount} aapke orders.`}`,
            links: [{ label: "Products", to: "/products" }],
        };
    }

    // —— Categories ——
    const matchedCategory = categories.find((c) => q.includes(normalize(c.name)));
    if (matchedCategory || matchAny(q, ["category", "categories", "section"])) {
        const cat = matchedCategory || categories[0];
        if (!cat) {
            return { reply: "Categories load ho rahi hain, thodi der baad try karein.", links: [{ label: "Products", to: "/products" }] };
        }
        const catProducts = products
            .filter((p) => normalize(p.category) === normalize(cat.name))
            .slice(0, 5);
        const list = catProducts.map((p) => `${p.name} (${formatPrice(p.price)})`).join(", ");
        return {
            reply: `${cat.name} me ${cat.count} products. Examples: ${list || "browse on products page"}.`,
            links: [{ label: `Shop ${cat.name}`, to: `/products/${cat.name}` }],
        };
    }

    // —— Budget / price ——
    const priceMatch = String(message).match(/(?:under|below|kam|budget|upto|max)\s*(?:rs\.?|₹)?\s*(\d+)/i);
    if (priceMatch || matchAny(q, ["cheap", "sasta", "affordable", "low price"])) {
        const maxPrice = priceMatch ? Number(priceMatch[1]) : 2000;
        const affordable = products
            .filter((p) => Number(p.price) <= maxPrice && Number(p.stock) > 0)
            .sort((a, b) => Number(a.price) - Number(b.price))
            .slice(0, 6);
        if (!affordable.length) {
            return {
                reply: `${formatPrice(maxPrice)} ke andar koi in-stock product nahi mila.`,
                links: [{ label: "All products", to: "/products" }],
            };
        }
        return {
            reply: `${formatPrice(maxPrice)} ke andar: ${affordable.map((p) => `${p.name} (${formatPrice(p.price)}, ★${p.rating || 4.5})`).join("; ")}.`,
            links: [{ label: "Browse products", to: "/products" }],
        };
    }

    // —— Best / top ——
    if (matchAny(q, ["best", "top", "popular", "trending", "recommended"])) {
        const top = [...products]
            .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
            .slice(0, 5);
        return {
            reply: `Top rated: ${top.map((p) => `${p.name} — ${formatPrice(p.price)}, ★${p.rating || 4.5}, stock ${p.stock || 0}`).join("; ")}.`,
            links: [{ label: "Shop top picks", to: "/products" }],
        };
    }

    // —— Stock ——
    if (matchAny(q, ["in stock", "available", "sold out", "out of stock"])) {
        const inStock = products.filter((p) => Number(p.stock) > 0).length;
        const out = products.length - inStock;
        return {
            reply: `${inStock} products in stock, ${out} sold out. Product page par stock count dikhta hai.`,
            links: [{ label: "Products", to: "/products" }],
        };
    }

    // —— Product name search ——
    const matchedProducts = findProducts(products, message, 4);
    if (
        matchedProducts.length &&
        (matchAny(q, ["product", "price", "buy", "cost", "kitna", "details"]) ||
            matchedProducts.some((p) => q.includes(normalize(p.name).slice(0, 8))))
    ) {
        const p = matchedProducts[0];
        if (matchedProducts.length === 1 || q.includes(normalize(p.name))) {
            return {
                reply: `${p.name}: ${formatPrice(p.price)}. Category ${p.category}. Rating ${p.rating || 4.5}/5. Stock ${p.stock || 0}. ${(p.description || "").slice(0, 120)}`,
                links: [{ label: "View product", to: `/product/${p.id}` }],
            };
        }
        return {
            reply: `Matches: ${matchedProducts.map((x) => `${x.name} (${formatPrice(x.price)})`).join("; ")}.`,
            links: matchedProducts.slice(0, 2).map((x) => ({ label: x.name, to: `/product/${x.id}` })),
        };
    }

    // —— Fuzzy product fallback ——
    if (matchedProducts.length) {
        const p = matchedProducts[0];
        return {
            reply: `Shayad aap ${p.name} puch rahe hain — ${formatPrice(p.price)}, ${p.category}, stock ${p.stock || 0}.`,
            links: [{ label: "View product", to: `/product/${p.id}` }],
        };
    }

    // —— Default: helpful menu ——
    return {
        reply: `Puchiye: "cart", "orders", "electronics", "under 2000", "coupon codes", "return policy", ya product ka naam. ${userEmail ? `Logged in: ${userEmail}.` : "Login karein personal orders dekhne ke liye."}`,
        links: [
            { label: "Products", to: "/products" },
            { label: userEmail ? "My Orders" : "Login", to: userEmail ? "/orders" : "/login" },
            { label: "Contact", to: "/pages/contact" },
        ],
    };
};

module.exports = {
    STORE_INFO,
    WEBSITE_PAGES,
    buildSmartReply,
    buildLoginAnswer,
    isLoginQuestion,
    formatPrice,
    getOfferText,
};
