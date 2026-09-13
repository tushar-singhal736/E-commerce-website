import React, { useEffect, useRef, useState } from 'react';
import { Bot, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import API_BASE_URL, { apiFetch, getAdminHeaders, parseApiResponse } from '../utils/api';
import { buildSmartReply, STORE_INFO } from '../utils/chatbotEngine';
import './Chatbot.css';

const createMessage = (sender, text, extra = {}) => ({
  id: `${sender}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  sender,
  text,
  ...extra,
});

function Chatbot({
  cart = [],
  orders = [],
  user = null,
  isAdmin = false,
  discountPercent = 0,
  activeCoupon = '',
  wishlist = [],
  adminEmail = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [products, setProducts] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [storeSettings, setStoreSettings] = useState({ discountPercent: 0 });
  const [activeCoupons, setActiveCoupons] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState(() => [
    createMessage(
      'bot',
      `Namaste! 👋 Main ${STORE_INFO.brand} ka AI assistant hoon. Pehle login karein, phir main aapke orders, products, cart sab kuch personally track kar sakta hoon.`,
      { 
        links: [
          { label: "Login / Signup", to: "/login" },
          { label: "Browse without login", to: "/products" }
        ]
      }
    ),
  ]);

  const messagesEndRef = useRef(null);

  useEffect(() => {
    const loadWebsiteData = async () => {
      setLoadingData(true);
      try {
        const [productsRes, ordersRes, settingsRes, couponsRes] = await Promise.all([
          apiFetch('/api/products?page=1&limit=100'),
          apiFetch('/api/orders'),
          apiFetch('/api/settings'),
          fetch(`${API_BASE_URL}/api/coupons`),
        ]);

        const productsPayload = await parseApiResponse(productsRes);
        const ordersPayload = await parseApiResponse(ordersRes);
        const settingsPayload = await parseApiResponse(settingsRes);
        const couponsPayload = await parseApiResponse(couponsRes);

        setProducts(Array.isArray(productsPayload) ? productsPayload : productsPayload.items || []);
        setAllOrders(Array.isArray(ordersPayload) ? ordersPayload : ordersPayload.items || []);
        setStoreSettings(settingsPayload || { discountPercent: 0 });
        setActiveCoupons(Array.isArray(couponsPayload) ? couponsPayload : []);
      } catch (error) {
        console.error('Chatbot website data load failed:', error);
      } finally {
        setLoadingData(false);
      }
    };

    loadWebsiteData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isThinking]);

  useEffect(() => {
    if (!user?.email) return;
    setMessages((current) => {
      if (current.some((message) => message.id === 'login-aware-welcome')) return current;
      const name = user.fullName || user.name || user.email.split('@')[0];
      return [
        ...current,
        {
          ...createMessage(
            'bot',
            `Welcome ${name}! 👋 Cart me ${cart.reduce((s, i) => s + Number(i.quantity || 0), 0)} item(s). Ab aapke personal orders aur cart track kar sakta hoon. Puchiye: "cart", "orders", "products", ya anything else!`
          ),
          id: 'login-aware-welcome',
        },
      ];
    });
  }, [user, cart]);

  const buildLocalReply = (question) => {
    if (loadingData && !products.length) {
      return {
        reply: 'Main abhi store ka live data load kar raha hoon — 2 second baad phir try karein.',
        links: [{ label: 'Products', to: '/products' }],
      };
    }

    return buildSmartReply({
      message: question,
      products,
      orders: allOrders,
      settings: storeSettings,
      coupons: activeCoupons,
      cart,
      user,
      isAdmin,
      wishlist,
      activeCoupon,
      discountPercent,
    });
  };

  const askBackendAssistant = async (message) => {
    const headers = isAdmin ? getAdminHeaders() : { 'Content-Type': 'application/json' };
    const res = await apiFetch('/api/chatbot', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        user,
        cart,
        orders,
        wishlist,
        isAdmin,
        activeCoupon,
        discountPercent,
      }),
    });
    const payload = await parseApiResponse(res);
    return {
      text: payload.reply,
      links: Array.isArray(payload.links) ? payload.links : [],
      mode: payload.mode,
    };
  };

  const sendMessage = async (text = input) => {
    const trimmed = text.trim();
    if (!trimmed || isThinking) return;

    setMessages((current) => [...current, createMessage('user', trimmed)]);
    setInput('');
    setIsThinking(true);

    try {
      const backendReply = await askBackendAssistant(trimmed);
      setMessages((current) => [
        ...current,
        createMessage('bot', backendReply.text, { links: backendReply.links }),
      ]);
    } catch (error) {
      console.error('Backend chatbot failed, smart local engine used:', error);
      const local = buildLocalReply(trimmed);
      setMessages((current) => [
        ...current,
        createMessage('bot', local.reply, { links: local.links }),
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const quickPrompts = [
    'About this website',
    'Website guide',
    'Track my order',
    'Cart summary',
    'Coupon codes',
    'Return policy',
    'Contact support',
    'Best products',
    ...(user ? ['My orders'] : ['How to login', 'Signup steps']),
    ...(isAdmin ? ['Admin dashboard'] : []),
  ];

  return (
    <div className={`chatbot ${isOpen ? 'chatbot--open' : ''}`}>
      {isOpen && (
        <section className="chatbot-panel" aria-label="SuperNova AI Assistant">
          <header className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-avatar"><Bot size={20} /></span>
              <div>
                <h2>SuperNova Assistant</h2>
                <p>Amazon-style shopping help · Live store data</p>
              </div>
              <span className="chatbot-status">{loadingData ? 'Syncing' : 'Online'}</span>
            </div>
            <button className="chatbot-icon-btn" type="button" onClick={() => setIsOpen(false)} aria-label="Close chatbot">
              <X size={18} />
            </button>
          </header>

          <div className="chatbot-messages">
            {messages.map((message) => (
              <div key={message.id} className={`chatbot-message chatbot-message--${message.sender}`}>
                <p>{message.text}</p>
                {message.links?.length ? (
                  <div className="chatbot-links">
                    {message.links.map((link) => (
                      <Link key={`${message.id}-${link.to}`} to={link.to} onClick={() => setIsOpen(false)}>
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            {isThinking && (
              <div className="chatbot-message chatbot-message--bot chatbot-message--typing">
                <span></span>
                <span></span>
                <span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-quick-prompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} type="button" onClick={() => sendMessage(prompt)} disabled={isThinking}>
                {prompt}
              </button>
            ))}
          </div>

          <form
            className="chatbot-input-row"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={isThinking ? 'Assistant is typing...' : 'Products, orders, cart, coupons, policies...'}
              aria-label="Chatbot question"
              disabled={isThinking}
            />
            <button type="submit" aria-label="Send message" disabled={isThinking || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </section>
      )}

      <button className="chatbot-toggle" type="button" onClick={() => setIsOpen((value) => !value)} aria-label="Open chatbot">
        {isOpen ? <Sparkles size={24} /> : <MessageCircle size={24} />}
      </button>
    </div>
  );
}

export default Chatbot;
