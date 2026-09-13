import React from 'react';
import { useParams } from 'react-router-dom';
import './StaticPage.css';

const pages = {
  about: {
    title: 'About SuperNova',
    subtitle: 'Premium ecommerce built around trust, speed, and useful shopping.',
    points: [
      'Curated products across fashion, shoes, jewellery, and electronics.',
      'Secure checkout with online payment and Cash on Delivery.',
      'Order tracking, invoices, returns, and customer support in one place.',
    ],
  },
  contact: {
    title: 'Contact Us',
    subtitle: 'Need help with products, orders, returns, or payments?',
    points: [
      'Email: tusharsinghal1250@gmail.com',
      'Phone: +91 7455096791',
      'Address: AS boys hostel, Paintra Knowledge Park 3, Greater Noida',
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'We collect only the information required to process orders and support customers.',
    points: [
      'Account, address, order, and payment reference details are used for order fulfilment.',
      'Payment processing is handled by secure payment providers.',
      'Customer data is not sold to third parties.',
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    subtitle: 'By using SuperNova, you agree to fair shopping and checkout usage.',
    points: [
      'Product prices, stock, and offers can change based on live availability.',
      'Orders may be cancelled if payment fails or stock is unavailable.',
      'Customers can cancel only Pending or Processing orders from My Orders.',
      'Misuse, fake orders, or invalid account activity may be restricted.',
    ],
  },
  returns: {
    title: 'Return Policy',
    subtitle: 'Eligible delivered orders can be returned from the My Orders page.',
    points: [
      'Returns can be requested only after the order status becomes Delivered.',
      'Return pickup is scheduled after request approval and usually happens within 2 business days.',
      'Refunds are processed after pickup and quality inspection.',
      'Damaged, wrong, or missing-item issues should be reported as soon as possible.',
    ],
  },
  shipping: {
    title: 'Shipping Policy',
    subtitle: 'We aim to dispatch confirmed orders quickly and keep tracking transparent.',
    points: [
      'Estimated delivery is usually 3-5 business days.',
      'Shipping charges are shown before checkout.',
      'Tracking updates are available in My Orders.',
    ],
  },
};

function StaticPage() {
  const { slug = 'about' } = useParams();
  const page = pages[slug] || pages.about;

  return (
    <main className="static-page">
      <section className="static-hero">
        <span>SuperNova help center</span>
        <h1>{page.title}</h1>
        <p>{page.subtitle}</p>
      </section>
      <section className="static-card">
        {page.points.map((point) => (
          <div className="static-row" key={point}>
            <span />
            <p>{point}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

export default StaticPage;
