// src/components/VapiWidget.js
// Toggles between two static <vapi-widget> elements in index.html
// Chat: id="jravel-vapi-chat"   |  Voice: id="jravel-vapi-voice"

import React, { useState, useEffect } from 'react';

export default function VapiWidget() {
  const [mode, setMode] = useState('chat');

  // Show the active widget, hide the other
  useEffect(() => {
    const chatEl  = document.getElementById('jravel-vapi-chat');
    const voiceEl = document.getElementById('jravel-vapi-voice');
    if (chatEl)  chatEl.style.display  = mode === 'chat'  ? '' : 'none';
    if (voiceEl) voiceEl.style.display = mode === 'voice' ? '' : 'none';
  }, [mode]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.tabBar}>
        <button
          style={{ ...styles.tab, ...(mode === 'chat' ? styles.tabActive : styles.tabInactive) }}
          onClick={() => setMode('chat')}
        >
          💬 Chat
        </button>
        <button
          style={{ ...styles.tab, ...(mode === 'voice' ? styles.tabActive : styles.tabInactive) }}
          onClick={() => setMode('voice')}
        >
          🎙️ Voice
        </button>
      </div>

      <p style={styles.desc}>
        {mode === 'chat'
          ? '💬 Chat mode — click the widget button to type your travel questions.'
          : '🎙️ Voice mode — click the widget button to speak with your AI assistant.'}
      </p>
    </div>
  );
}

const styles = {
  wrapper: { width: '100%', maxWidth: 780, margin: '0 auto', textAlign: 'center' },
  tabBar: { display: 'flex', gap: 12, marginBottom: 18, justifyContent: 'center' },
  tab: {
    padding: '10px 32px', borderRadius: 999, border: 'none', cursor: 'pointer',
    fontSize: 15, fontWeight: 700, fontFamily: 'inherit', transition: 'all 0.2s', letterSpacing: '0.3px',
  },
  tabActive: {
    background: 'linear-gradient(90deg, #47b5ff 0%, #2563eb 100%)',
    color: '#fff', boxShadow: '0 4px 16px rgba(71,181,255,0.30)',
  },
  tabInactive: { background: '#f0f6ff', color: '#223a5f' },
  desc: { color: '#223a5f', fontSize: 15, marginBottom: 8, marginTop: 0, fontWeight: 500 },
};
