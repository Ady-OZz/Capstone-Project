import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TripCreateModal from '../components/TripCreateModal';
import AITripFlow from '../AITripFlow';

export default function ItineraryBuilderPage() {
  const navigate = useNavigate();
  const [showTripModal, setShowTripModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [showPersonalizedModal, setShowPersonalizedModal] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #e0f7fa 60%, #fff 100%)', padding: '48px 0' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: '40px', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Plan Trip Card */}
        <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, #47b5ff 0%, #2563eb 100%)', borderRadius: 24, boxShadow: '0 4px 24px rgba(71,181,255,0.10)', padding: 36, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 280 }}>
          <span style={{ fontSize: 48, marginBottom: 16 }}>🗺️</span>
          <h2 style={{ fontWeight: 700, fontSize: 28, margin: '16px 0 8px 0' }}>Plan Your Trip</h2>
          <p style={{ fontSize: 16, marginBottom: 32, textAlign: 'center', color: '#eaf6fb' }}>
            Create a custom itinerary, add destinations, and organize your travel schedule step by step.
          </p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', width: '100%', justifyContent: 'center' }}>
            <button
              style={{
                background: '#fff',
                color: '#2563eb',
                border: 'none',
                borderRadius: 999,
                padding: '14px 36px',
                fontWeight: 700,
                fontSize: 18,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(71,181,255,0.10)',
                marginBottom: 8,
                transition: 'background 0.2s, color 0.2s, transform 0.2s',
              }}
              onClick={() => setShowTripModal(true)}
            >
              Create Trip
            </button>
            <button
              style={{
                background: 'linear-gradient(90deg, #47b5ff 0%, #2563eb 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
                padding: '14px 36px',
                fontWeight: 700,
                fontSize: 18,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(71,181,255,0.10)',
                marginBottom: 8,
                transition: 'background 0.2s, color 0.2s, transform 0.2s',
              }}
              onClick={() => navigate('/my-trips')}
            >
              My Trips
            </button>
          </div>
        </div>
        {/* AI Suggestions Card */}
        <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, #ff715b 0%, #ff9472 100%)', borderRadius: 24, boxShadow: '0 4px 24px rgba(255,113,91,0.10)', padding: 36, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 280 }}>
          <span style={{ fontSize: 48, marginBottom: 18 }}>🤖</span>
          <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 16 }}>AI Suggestions</h2>
          <p style={{ marginBottom: 24, textAlign: 'center' }}>Get smart recommendations for destinations, activities, and routes based on your interests and travel history.</p>
          <button style={{ background: '#fff', color: '#ff715b', border: 'none', borderRadius: 999, padding: '12px 36px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,113,91,0.10)', transition: 'background 0.2s, color 0.2s' }} onClick={() => setShowAIModal(true)}>Get AI Suggestions</button>
        </div>
        {/* Personalized Travel Ideas Card */}
        <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, #4CA1AF 0%, #2C3E50 100%)', borderRadius: 24, boxShadow: '0 4px 24px rgba(44,161,175,0.10)', padding: 36, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 280 }}>
          <span style={{ fontSize: 48, marginBottom: 18 }}>💡</span>
          <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 16 }}>Personalized Travel Ideas</h2>
          <p style={{ marginBottom: 24, textAlign: 'center' }}>Explore unique travel ideas and inspiration tailored just for you, based on your profile and preferences.</p>
          <button style={{ background: '#fff', color: '#2C3E50', border: 'none', borderRadius: 999, padding: '12px 36px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(44,161,175,0.10)', transition: 'background 0.2s, color 0.2s' }} onClick={() => setShowPersonalizedModal(true)}>Show Ideas</button>
        </div>
      </div>
      <TripCreateModal open={showTripModal} onClose={() => setShowTripModal(false)} />
      <AITripFlow open={showAIModal} onClose={() => setShowAIModal(false)} />
      <AITripFlow open={showPersonalizedModal} onClose={() => setShowPersonalizedModal(false)} />
    </div>
  );
}
