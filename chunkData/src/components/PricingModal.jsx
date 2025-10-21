import { useState } from 'react';
import './PricingModal.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export default function PricingModal({ isOpen, onClose, user, token }) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isPremium = user?.subscription?.status === 'active' || user?.subscription?.status === 'trialing';

  const handleUpgrade = async () => {
    if (!token) {
      alert('Please log in to upgrade');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
      alert('Failed to start checkout process. Please try again.');
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    if (!token) {
      alert('Please log in to manage subscription');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.url) {
        // Redirect to Stripe Customer Portal
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL received');
      }
    } catch (error) {
      console.error('Portal error:', error);
      alert('Failed to open subscription portal. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="pricing-modal-overlay" onClick={onClose}>
      <div className="pricing-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>

        <div className="pricing-header">
          <h2>Choose Your Plan</h2>
          <p>Unlock unlimited access to all your protected files</p>
        </div>

        <div className="pricing-plans">
          {/* Free Plan */}
          <div className="pricing-plan">
            <div className="plan-name">Free</div>
            <div className="plan-price">
              $0<small>/month</small>
            </div>
            <div className="plan-description">
              Perfect for trying out the platform
            </div>
            <ul className="plan-features">
              <li>
                <span className="icon feature-limited">⏱️</span>
                <span className="feature-text">10 seconds video viewing limit</span>
              </li>
              <li>
                <span className="icon feature-limited">📄</span>
                <span className="feature-text">5 pages PDF viewing limit</span>
              </li>
              <li>
                <span className="icon">🔒</span>
                <span className="feature-text">Encrypted file storage</span>
              </li>
              <li>
                <span className="icon">🔐</span>
                <span className="feature-text">Download protection</span>
              </li>
              <li>
                <span className="icon">🎬</span>
                <span className="feature-text">Chunked video streaming</span>
              </li>
            </ul>
            <button 
              className="plan-button secondary"
              disabled={!isPremium}
            >
              {isPremium ? 'Current Plan' : 'Current Plan'}
            </button>
          </div>

          {/* Premium Plan */}
          <div className="pricing-plan featured">
            <div className="plan-badge">RECOMMENDED</div>
            <div className="plan-name">⭐ Premium</div>
            <div className="plan-price">
              $9.99<small>/month</small>
            </div>
            <div className="plan-description">
              Complete access to all features
            </div>
            <ul className="plan-features">
              <li>
                <span className="icon feature-unlimited">♾️</span>
                <span className="feature-text">Unlimited video playback</span>
              </li>
              <li>
                <span className="icon feature-unlimited">📚</span>
                <span className="feature-text">Full PDF access - all pages</span>
              </li>
              <li>
                <span className="icon feature-unlimited">🚀</span>
                <span className="feature-text">Priority streaming</span>
              </li>
              <li>
                <span className="icon">🔒</span>
                <span className="feature-text">Encrypted file storage</span>
              </li>
              <li>
                <span className="icon">🔐</span>
                <span className="feature-text">Download protection</span>
              </li>
              <li>
                <span className="icon">🎬</span>
                <span className="feature-text">Chunked video streaming</span>
              </li>
              <li>
                <span className="icon">💫</span>
                <span className="feature-text">Cancel anytime</span>
              </li>
            </ul>
            {isPremium ? (
              <button 
                className="plan-button primary"
                onClick={handleManageSubscription}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Manage Subscription'}
              </button>
            ) : (
              <button 
                className="plan-button primary"
                onClick={handleUpgrade}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Upgrade to Premium'}
              </button>
            )}
          </div>
        </div>

        <div className="pricing-footer">
          <p>
            💳 Secure payment powered by <a href="https://stripe.com" target="_blank" rel="noopener noreferrer">Stripe</a>
          </p>
          <p style={{ marginTop: '8px', fontSize: '12px' }}>
            Cancel anytime • No hidden fees • 100% secure
          </p>
        </div>
      </div>
    </div>
  );
}
