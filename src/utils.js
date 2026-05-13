import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import L from 'leaflet';

export const CHAT_USER_COLORS = [
  '#2563eb', '#ff715b', '#22c55e', '#f59e42', '#a855f7', '#eab308', '#14b8a6', '#ef4444', '#6366f1', '#f43f5e', '#0ea5e9', '#fbbf24', '#10b981', '#f472b6', '#8b5cf6', '#facc15', '#4ade80', '#f87171', '#60a5fa', '#fcd34d'
];

export const userNameCache = {};

// Helper to get color for a user
export function getUserColor(user) {
  const key = typeof user === 'object'
    ? (user.uid || user.email || user.id)
    : user;
  if (!key) return CHAT_USER_COLORS[0];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return CHAT_USER_COLORS[Math.abs(hash) % CHAT_USER_COLORS.length];
}

// Helper to get first name for a sender
export async function getUserFirstName(sender) {
  if (!sender) return 'User';
  if (userNameCache[sender]) return userNameCache[sender];
  let firstName = '';
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', sender));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      firstName = data.firstName || sender.split('@')[0];
    } else {
      firstName = sender.split('@')[0];
    }
  } catch {
    firstName = sender.split('@')[0];
  }
  userNameCache[sender] = firstName;
  return firstName;
}

// Helper to get display name
export async function getDisplayName(user) {
  let uid = user.uid || user.id || null;
  let email = user.email || (typeof user === 'string' ? user : null);
  if (uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.firstName || data.lastName) {
          return `${data.firstName || ''} ${data.lastName || ''}`.trim();
        }
      }
    } catch {}
  }
  return email || 'User';
}

export function generateInviteCode() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}


export const bigMarkerIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Example: big colorful marker
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48],
});
