import React, { useEffect, useState } from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useParams } from 'react-router-dom';
import LoginPage from './LoginPage';
import MainPage from './MainPage';
import DashboardPage from './DashboardPage';
import MyDetailsPage from './MyDetailsPage';
import Navbar from './Navbar';
import { auth, db, storage } from './firebase';
import { doc, getDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { AppBar, Toolbar, Typography, Tabs, Tab, Box, Avatar, IconButton, Drawer, List, ListItem, ListItemText, Button, Divider, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, FormControl, InputLabel, Select, Container, Paper, Grid, Card, CardMedia } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { onSnapshot, query, where, orderBy } from 'firebase/firestore';
import dayjs from 'dayjs';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DeleteIcon from '@mui/icons-material/Delete';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CloseIcon from '@mui/icons-material/Close';
import { updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { setDoc } from 'firebase/firestore';
import Menu from '@mui/material/Menu';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useAuth } from './contexts/AuthContext';
import { AuthProvider } from './contexts/AuthContext';
import AITripFlow, { TRENDING_TRIPS } from './AITripFlow';
import VapiWidget from './components/VapiWidget';
import SendIcon from '@mui/icons-material/Send';
import PeopleIcon from '@mui/icons-material/People';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';
import Autocomplete from '@mui/material/Autocomplete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import L from 'leaflet';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import ChatIcon from '@mui/icons-material/Chat';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';

// Custom big marker icon
const bigMarkerIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Example: big colorful marker
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48],
});

// Add at the top of the file, after imports
const CHAT_USER_COLORS = [
  '#2563eb', '#ff715b', '#22c55e', '#f59e42', '#a855f7', '#eab308', '#14b8a6', '#ef4444', '#6366f1', '#f43f5e', '#0ea5e9', '#fbbf24', '#10b981', '#f472b6', '#8b5cf6', '#facc15', '#4ade80', '#f87171', '#60a5fa', '#fcd34d'
];
const userNameCache = {};

// Helper to get color for a user
function getUserColor(user) {
  // user can be an object or a string (email/uid)
  const key = typeof user === 'object'
    ? (user.uid || user.email || user.id)
    : user;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return CHAT_USER_COLORS[Math.abs(hash) % CHAT_USER_COLORS.length];
}

// Helper to get first name for a sender (email or UID)
async function getUserFirstName(sender) {
  if (!sender) return 'User';
  if (userNameCache[sender]) return userNameCache[sender];
  // Try to find by email (sender is email)
  let firstName = '';
  try {
    // Try to find user by email (users collection, email field)
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('email', '==', sender));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const data = snap.docs[0].data();
      firstName = data.firstName || sender.split('@')[0];
    } else {
      // fallback: just use the part before @
      firstName = sender.split('@')[0];
    }
  } catch {
    firstName = sender.split('@')[0];
  }
  userNameCache[sender] = firstName;
  return firstName;
}

// Helper to get display name from user details or fallback to email
async function getDisplayName(user) {
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

function LandingPage() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [prefillTrip, setPrefillTrip] = useState(null);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        // Try to get name from Firestore
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (data.firstName || data.lastName) {
            setUserName(`${data.firstName || ''} ${data.lastName || ''}`.trim());
            return;
          }
        }
        setUserName(u.displayName || u.email || '');
      } else {
        setUserName('');
      }
    });
    return () => unsub();
  }, []);

  return (
    <>
      {userName && (
        <div style={{textAlign:'center', marginTop: '32px', marginBottom: '18px'}}>
          <h2 style={{fontWeight:700, fontSize:'2rem', color:'#223a5f', letterSpacing:'0.5px'}}>Welcome, {userName}!</h2>
        </div>
      )}
      {/* Hero Section */}
      <header className="hero">
        <div className="hero-content">
          <h5 className="hero-tag">BEST DESTINATIONS AROUND THE WORLD</h5>
          <h1 className="hero-title" style={{
            fontWeight: 800,
            fontSize: '2.7rem',
            color: '#223a5f',
            marginBottom: 18,
            letterSpacing: '0.5px',
            lineHeight: 1.18,
          }}>
            It's not just travel, it's a journey with <span style={{color:'#ff715b'}}>Jravel</span>.
          </h1>
          <p className="hero-desc">
            Built Wicket longer admire do barton vanity itself do in it. Preferred to sportsmen it engrossed listening. Park gate sell they west hard for the.
          </p>
          <div className="hero-cta">
            <button className="find-btn" onClick={() => { const el = document.querySelector('.services'); if(el) el.scrollIntoView({behavior:'smooth'}); }}>Find out more</button>
            <a
              className="demo-btn"
              href="#demo"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
            >
              <span className="play-icon">▶</span> Play Demo
            </a>
          </div>
        </div>
        <img className="hero-img" src="https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg" alt="Traveler" />
      </header>

      {/* Services/Features */}
      <section className="services">
        <h5 className="section-tag">CATEGORY</h5>
        <h2 className="section-title">We Offer Best Services</h2>
        <div className="service-cards">
          <div className="service-card">
            <span role="img" aria-label="weather">☀️</span>
            <h4>Calculated Weather</h4>
            <p>Built Wicket longer admire do barton vanity itself do in it.</p>
          </div>
          <div className="service-card">
            <span role="img" aria-label="flights">✈️</span>
            <h4>Best Flights</h4>
            <p>Engrossed listening. Park gate sell they west hard for the.</p>
          </div>
          <div className="service-card">
            <span role="img" aria-label="events">🎉</span>
            <h4>Local Events</h4>
            <p>Barton vanity itself do in it. Preferred to men it engrossed listening.</p>
          </div>
          <div className="service-card">
            <span role="img" aria-label="customization">⚙️</span>
            <h4>Customization</h4>
            <p>We deliver outsourced aviation services for military customers.</p>
          </div>
        </div>
      </section>

      {/* Top Destinations */}
      <section className="destinations">
        <h5 className="section-tag">Top Selling</h5>
        <h2 className="section-title">Top Destinations</h2>
        <div className="destination-cards">
          <div className="destination-card" onClick={() => { setPrefillTrip(TRENDING_TRIPS[0]); setShowAIModal(true); }} style={{ cursor: 'pointer' }}>
            <img src="https://images.pexels.com/photos/1051075/pexels-photo-1051075.jpeg" alt="Goa" />
            <div className="dest-info">
              <h4>Goa, India</h4>
              <p>₹15,000</p>
              <span>7 Days Trip</span>
            </div>
          </div>
          <div className="destination-card" onClick={() => { setPrefillTrip(TRENDING_TRIPS[2]); setShowAIModal(true); }} style={{ cursor: 'pointer' }}>
            <img src="https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg" alt="Jaipur" />
            <div className="dest-info">
              <h4>Jaipur, Rajasthan</h4>
              <p>₹12,000</p>
              <span>5 Days Trip</span>
            </div>
          </div>
          <div className="destination-card" onClick={() => { setPrefillTrip(TRENDING_TRIPS[5]); setShowAIModal(true); }} style={{ cursor: 'pointer' }}>
            <img src="https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg" alt="Kerala" />
            <div className="dest-info">
              <h4>Kerala, India</h4>
              <p>₹18,000</p>
              <span>8 Days Trip</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Booking */}
      <section className="steps-section">
        <h5 className="section-tag">Easy and Fast</h5>
        <h2 className="section-title">Book your next trip in 3 easy steps</h2>
        <div className="steps-cards">
          <div className="step-card">
            <span className="step-icon">1</span>
            <div>
              <h4>Choose Destination</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </div>
          <div className="step-card">
            <span className="step-icon">2</span>
            <div>
              <h4>Make Payment</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </div>
          <div className="step-card">
            <span className="step-icon">3</span>
            <div>
              <h4>Reach Airport on Selected Date</h4>
              <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
            </div>
          </div>
        </div>
        <div className="trip-card">
          <img src="https://images.pexels.com/photos/3601419/pexels-photo-3601419.jpeg" alt="Trip to Greece" />
          <div className="trip-info">
            <h4>Trip To Greece</h4>
            <p>14-29 June | by Robbie</p>
            <div className="trip-progress">
              <span>Ongoing</span>
              <span className="progress-bar"><span className="progress" style={{width: '40%'}}></span></span>
              <span>Trip to Rome</span>
            </div>
            <span>24 people going</span>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      {/* Testimonials */}
      <section className="testimonials-section">
        <h5 className="section-tag">TESTIMONIALS</h5>
        <h2 className="section-title">What people say about Us.</h2>
        <div className="testimonials-carousel">
          <div className="testimonial-card">
            <p>"Jravel made planning my family trip so easy! The itinerary builder and group chat features are a game changer. Highly recommended for anyone who loves to travel hassle-free."</p>
            <h4>Nikhil Jadaun</h4>
          </div>
          <div className="testimonial-card">
            <p>"I found the best destinations and managed my travel budget all in one place. The platform is super intuitive and the support team is very responsive. Will use again!"</p>
            <h4>Ankit Yadav</h4>
          </div>
          <div className="testimonial-card">
            <p>"Planning group trips used to be a nightmare. With Jravel's shared itinerary and budget tracker, everyone stays on the same page. It's the only travel app I'll ever need."</p>
            <h4>Akhilesh Yadav</h4>
          </div>
        </div>
      </section>

      {/* Trending AI Trip Picks */}
      <section style={{ padding: '60px 5vw', background: '#f8faff' }}>
        <h5 style={{ color: '#ff715b', fontWeight: 700, letterSpacing: 2, marginBottom: 8, fontSize: '0.85rem', textTransform:'uppercase' }}>AI PICKS</h5>
        <h2 style={{ fontWeight: 800, fontSize: '2rem', color: '#223a5f', marginBottom: 8 }}>Trending Trips Right Now</h2>
        <p style={{ color: '#64748b', marginBottom: 32, maxWidth: 500 }}>Curated destinations our AI recommends - click any card to generate a personalised itinerary instantly.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 18 }}>
          {TRENDING_TRIPS.map((trip) => (
            <div
              key={trip.id}
              onClick={() => { setPrefillTrip(trip); setShowAIModal(true); }}
              style={{
                background: '#fff', borderRadius: 18, padding: '22px 18px', cursor: 'pointer',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1.5px solid #eef2f7',
                transition: 'transform 0.18s, box-shadow 0.18s',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-5px)'; e.currentTarget.style.boxShadow='0 8px 28px rgba(0,0,0,0.13)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ fontSize: 34, marginBottom: 8 }}>{trip.emoji}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#ff715b', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>{trip.tag}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#223a5f', marginBottom: 2 }}>{trip.destination}</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>{trip.duration} · {trip.estimated_cost}</div>
              <button style={{ background: 'linear-gradient(90deg,#ff715b,#ff9472)', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 18px', fontWeight: 600, cursor: 'pointer', fontSize: 13, width: '100%' }}>
                Plan This ✨
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="newsletter">
        <h3>Subscribe to get information, latest news and other interesting offers about Jravel</h3>
        <div className="newsletter-form">
          <input type="email" placeholder="Your email" value={subscribeEmail} onChange={e => setSubscribeEmail(e.target.value)} />
          <button type="button" onClick={() => {
            if (subscribeEmail && subscribeEmail.includes('@')) {
              setSubscribeMsg('🎉 Thank you for subscribing!');
              setSubscribeEmail('');
              setTimeout(() => setSubscribeMsg(''), 3000);
            } else {
              setSubscribeMsg('Please enter a valid email.');
            }
          }}>Subscribe</button>
        </div>
        {subscribeMsg && <p style={{color:'#fff',marginTop:8,fontWeight:600}}>{subscribeMsg}</p>}
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-logo">Jravel.</div>
          <div className="footer-links">
            <div>
              <h5>Company</h5>
              <ul>
                <li>About</li>
                <li>Careers</li>
                <li>Mobile</li>
              </ul>
            </div>
            <div>
              <h5>Contact</h5>
              <ul>
                <li>Help/FAQ</li>
                <li>Press</li>
                <li>Affiliates</li>
              </ul>
            </div>
            <div>
              <h5>More</h5>
              <ul>
                <li>Airlinefees</li>
                <li>Airline</li>
                <li>Low fare tips</li>
              </ul>
            </div>
          </div>
          <div className="footer-social">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"><span role="img" aria-label="facebook">📘</span></a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer"><span role="img" aria-label="instagram">📸</span></a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer"><span role="img" aria-label="twitter">🐦</span></a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>All rights reserved © 2026 Jravel.co</span>
        </div>
      </footer>

      <AITripFlow
        open={showAIModal}
        onClose={() => { setShowAIModal(false); setPrefillTrip(null); }}
        prefillTrip={prefillTrip}
      />
    </>
  );
}

function TripCreateModal({ open, onClose, onCreated }) {
  const [destination, setDestination] = useState('');
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [placeOptions, setPlaceOptions] = useState([]);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [privacy, setPrivacy] = useState('friends');
  const [inviteEmail, setInviteEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [inviteSent, setInviteSent] = useState(false);
  const navigate = useNavigate();
  const [imageLoading, setImageLoading] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return () => unsub();
  }, []);

  // Fetch place suggestions
  useEffect(() => {
    if (!destination || destination.length < 2) {
      setPlaceOptions([]);
      return;
    }
    setPlaceLoading(true);
    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&addressdetails=1&limit=6`, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en' }
    })
      .then(res => res.json())
      .then(data => {
        setPlaceOptions(data);
        setPlaceLoading(false);
      })
      .catch(() => setPlaceLoading(false));
    return () => controller.abort();
  }, [destination]);

  const getPlaceImage = async (query) => {
    const fallbackImages = [
      'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg',
      'https://images.pexels.com/photos/3601422/pexels-photo-3601422.jpeg',
      'https://images.pexels.com/photos/3601421/pexels-photo-3601421.jpeg',
      'https://images.pexels.com/photos/3601420/pexels-photo-3601420.jpeg',
      'https://images.pexels.com/photos/3601419/pexels-photo-3601419.jpeg'
    ];
    return fallbackImages[Math.floor(Math.random() * fallbackImages.length)];
  };

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!selectedPlace) {
      setError('Choose a destination to start planning');
      return;
    }
    if (!user) {
      setError('You must be logged in to create a trip.');
      return;
    }
    setLoading(true);
    setImageLoading(true);
    try {
      // Fetch a famous photo for the place
      const photoUrl = await getPlaceImage(selectedPlace.display_name.split(',')[0]);
      setImageLoading(false);
      const docRef = await addDoc(collection(db, 'trips'), {
        name: selectedPlace.display_name,
        place: selectedPlace,
        photoUrl,
        startDate: startDate ? new Date(startDate).toISOString() : '',
        endDate: endDate ? new Date(endDate).toISOString() : '',
        createdBy: user.uid,
        createdAt: new Date(),
        updatedAt: new Date(),
        privacy,
        members: {
          [user.uid]: { role: 'admin', email: user.email }
        }
      });
      // AUTOMATION: Add tripId to user's tripIds array
      await updateDoc(doc(db, 'users', user.uid), {
        tripIds: arrayUnion(docRef.id)
      });
      setDestination('');
      setSelectedPlace(null);
      setStartDate('');
      setEndDate('');
      setPrivacy('friends');
      setInviteEmail('');
      onClose && onClose();
      navigate(`/trips/${docRef.id}`);
    } catch (err) {
      setError('Error creating trip: ' + err.message);
    } finally {
      setLoading(false);
      setImageLoading(false);
    }
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 1500);
    setInviteEmail('');
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(34,58,95,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', borderRadius: 24, boxShadow: '0 4px 24px rgba(71,181,255,0.10)', padding: 40, minWidth: 340, maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 22, position: 'relative' }}>
        <button type="button" onClick={onClose} style={{ position: 'absolute', top: 16, right: 18, background: 'none', border: 'none', fontSize: 22, color: '#888', cursor: 'pointer' }}>&times;</button>
        <h2 style={{ textAlign: 'center', color: '#223a5f', fontWeight: 700, marginBottom: 12 }}>Plan a new trip</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontWeight: 600, color: '#223a5f', marginBottom: 2 }}>Where to?</label>
          <Autocomplete
            freeSolo
            options={placeOptions}
            loading={placeLoading}
            getOptionLabel={option => option.display_name || ''}
            filterOptions={x => x}
            value={selectedPlace}
            onChange={(_, value) => setSelectedPlace(value)}
            inputValue={destination}
            onInputChange={(_, value) => { setDestination(value); if (!value) setSelectedPlace(null); }}
            renderInput={(params) => (
              <TextField {...params} placeholder="e.g. Paris, Hawaii, Japan" variant="outlined" size="small" />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.place_id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: 8 }}>
                <span style={{ fontWeight: 600 }}>{option.display_name.split(',')[0]}</span>
                <span style={{ color: '#888', fontSize: 13 }}>{option.address.state || ''}{option.address.state && option.address.country ? ', ' : ''}{option.address.country || ''}</span>
              </li>
            )}
            sx={{ mb: 0 }}
          />
          {error && <span style={{ color: '#ff715b', fontSize: 15, marginTop: 2 }}>{error}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontWeight: 600, color: '#223a5f', marginBottom: 2 }}>Dates <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ flex: 1, padding: '12px 12px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: '1rem' }} placeholder="Start date" />
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ flex: 1, padding: '12px 12px', borderRadius: 10, border: '1px solid #e0e0e0', fontSize: '1rem' }} placeholder="End date" />
          </div>
        </div>
        {/* Invite friends heading */}
        <div style={{ marginTop: 2, marginBottom: 2 }}>
          <span style={{ fontWeight: 600, color: '#223a5f', fontSize: 15 }}>Invite friends <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TextField
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="Enter an email address"
            variant="outlined"
            size="small"
            sx={{ flex: 1, borderRadius: 3, bgcolor: '#f7f9fb', boxShadow: '0 1px 4px rgba(71,181,255,0.07)', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            InputProps={{ style: { borderRadius: 16, background: '#f7f9fb' } }}
          />
          <IconButton
            type="button"
            onClick={handleInvite}
            sx={{ bgcolor: inviteSent ? '#22c55e' : '#e0f7fa', color: '#2563eb', borderRadius: '50%', width: 44, height: 44, boxShadow: '0 2px 8px rgba(71,181,255,0.10)', '&:hover': { bgcolor: '#47b5ff', color: '#fff' } }}
          >
            {inviteSent ? <SendIcon color="success" /> : <SendIcon />}
          </IconButton>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, marginBottom: 2, justifyContent: 'flex-end' }}>
          <label style={{ fontWeight: 600, color: '#223a5f' }}>Privacy</label>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <Select value={privacy} onChange={e => setPrivacy(e.target.value)} displayEmpty sx={{ borderRadius: 2, bgcolor: '#f5faff' }}>
              <MenuItem value="friends"><PeopleIcon sx={{ mr: 1 }} />Friends</MenuItem>
              <MenuItem value="public"><PublicIcon sx={{ mr: 1 }} />Public</MenuItem>
              <MenuItem value="private"><LockIcon sx={{ mr: 1 }} />Private</MenuItem>
            </Select>
          </FormControl>
        </div>
        <button type="submit" disabled={loading} style={{ background: 'linear-gradient(90deg, #ff715b 0%, #ff9472 100%)', color: '#fff', border: 'none', borderRadius: 999, padding: '16px 0', fontWeight: 700, fontSize: '1.15rem', marginTop: 18, cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,113,91,0.10)', transition: 'background 0.2s' }}>{loading ? 'Creating...' : 'Start planning'}</button>
      </form>
    </div>
  );
}

function ItineraryBuilderPage() {
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
          <button onClick={() => setShowAIModal(true)} style={{ background: '#fff', color: '#ff715b', border: 'none', borderRadius: 999, padding: '12px 36px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(255,113,91,0.10)', transition: 'background 0.2s, color 0.2s' }}>Get AI Suggestions</button>
        </div>
        {/* Personalized Travel Ideas Card */}
        <div style={{ flex: '1 1 300px', background: 'linear-gradient(135deg, #4CA1AF 0%, #2C3E50 100%)', borderRadius: 24, boxShadow: '0 4px 24px rgba(44,161,175,0.10)', padding: 36, color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 280 }}>
          <span style={{ fontSize: 48, marginBottom: 18 }}>💡</span>
          <h2 style={{ fontWeight: 700, fontSize: '1.5rem', marginBottom: 16 }}>Personalized Travel Ideas</h2>
          <p style={{ marginBottom: 24, textAlign: 'center' }}>Explore unique travel ideas and inspiration tailored just for you, based on your profile and preferences.</p>
          <button onClick={() => setShowPersonalizedModal(true)} style={{ background: '#fff', color: '#2C3E50', border: 'none', borderRadius: 999, padding: '12px 36px', fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer', boxShadow: '0 2px 8px rgba(44,161,175,0.10)', transition: 'background 0.2s, color 0.2s' }}>Show Ideas</button>
        </div>
      </div>
      <TripCreateModal open={showTripModal} onClose={() => setShowTripModal(false)} />
      <AITripFlow open={showAIModal} onClose={() => setShowAIModal(false)} />
      <AITripFlow open={showPersonalizedModal} onClose={() => setShowPersonalizedModal(false)} />

      {/* ── Vapi AI Assistant — inline Chat + Voice panel ── */}
      <div className="vapi-section" style={{ maxWidth: 1200, margin: '48px auto 0', padding: '0 24px' }}>
        <div className="vapi-section-header">
          <h5 style={{ color: '#ff715b', fontWeight: 700, letterSpacing: 2, marginBottom: 6, fontSize: '0.85rem', textTransform: 'uppercase' }}>AI TRAVEL ASSISTANT</h5>
          <h2 style={{ fontWeight: 800, fontSize: '2rem', color: '#223a5f', marginBottom: 8 }}>
            Chat or Talk — Plan Your Trip Instantly
          </h2>
          <p style={{ color: '#64748b', maxWidth: 560, margin: '0 auto 36px', fontSize: 15, lineHeight: 1.6 }}>
            Ask anything about your next adventure. Switch between <strong>Chat</strong> to type or <strong>Voice</strong> to speak — our AI assistant is ready 24/7.
          </p>
        </div>
        <VapiWidget />
      </div>
    </div>
  );
}

function AddActivityModal({ open, onClose, tripId, selectedDay, activity, onSave }) {
  const [title, setTitle] = useState(activity?.title || '');
  const [type, setType] = useState(activity?.type || '');
  const [time, setTime] = useState(activity ? dayjs(activity.date).format('HH:mm') : '');
  const [notes, setNotes] = useState(activity?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setTitle(activity?.title || '');
    setType(activity?.type || '');
    setTime(activity ? dayjs(activity.date).format('HH:mm') : '');
    setNotes(activity?.notes || '');
  }, [activity, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title || !type || !time) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    try {
      const activityDate = dayjs(selectedDay).format('YYYY-MM-DD') + 'T' + time;
      if (activity) {
        // Edit existing
        await updateDoc(doc(db, 'itineraryItems', activity.id), {
          title,
          type,
          date: activityDate,
          notes,
          updatedAt: new Date()
        });
      } else {
        // Add new
        await addDoc(collection(db, 'itineraryItems'), {
          tripId,
          title,
          type,
          date: activityDate,
          notes,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      setTitle('');
      setType('');
      setTime('');
      setNotes('');
      onClose();
      if (onSave) onSave();
    } catch (err) {
      setError('Error saving activity: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{activity ? 'Edit Activity' : 'Add New Activity'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Activity Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
          />
          <FormControl fullWidth required>
            <InputLabel>Activity Type</InputLabel>
            <Select
              value={type}
              label="Activity Type"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="Flight">Flight</MenuItem>
              <MenuItem value="Hotel">Hotel</MenuItem>
              <MenuItem value="Sightseeing">Sightseeing</MenuItem>
              <MenuItem value="Restaurant">Restaurant</MenuItem>
              <MenuItem value="Transportation">Transportation</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Time"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />
          {error && (
            <Typography color="error" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
        >
          {loading ? (activity ? 'Saving...' : 'Adding...') : (activity ? 'Save' : 'Add Activity')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function BudgetModal({ open, onClose, tripId, expense, onSave }) {
  const [amount, setAmount] = useState(expense?.amount || '');
  const [description, setDescription] = useState(expense?.description || '');
  const [date, setDate] = useState(expense ? dayjs(expense.date).format('YYYY-MM-DD') : '');
  const [category, setCategory] = useState(expense?.category || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setAmount(expense?.amount || '');
    setDescription(expense?.description || '');
    setDate(expense ? dayjs(expense.date).format('YYYY-MM-DD') : '');
    setCategory(expense?.category || '');
  }, [expense, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!amount || !description || !date || !category) {
      setError('Please fill all fields.');
      return;
    }
    setLoading(true);
    try {
      if (expense) {
        await updateDoc(doc(db, 'tripExpenses', expense.id), {
          amount: parseFloat(amount),
          description,
          date,
          category,
          updatedAt: new Date()
        });
      } else {
        await addDoc(collection(db, 'tripExpenses'), {
          tripId,
          amount: parseFloat(amount),
          description,
          date,
          category,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      setAmount('');
      setDescription('');
      setDate('');
      setCategory('');
      onClose();
      if (onSave) onSave();
    } catch (err) {
      setError('Error saving expense: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Amount"
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            required
            fullWidth
            InputProps={{ startAdornment: <span style={{marginRight:6,fontSize:16,fontWeight:600,color:'#555'}}>₹</span> }}
          />
          <TextField
            label="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth required>
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={e => setCategory(e.target.value)}
            >
              <MenuItem value="Lodging">Lodging</MenuItem>
              <MenuItem value="Transport">Transport</MenuItem>
              <MenuItem value="Food">Food</MenuItem>
              <MenuItem value="Activity">Activity</MenuItem>
              <MenuItem value="Shopping">Shopping</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </Select>
          </FormControl>
          {error && <Typography color="error" sx={{ mt: 1 }}>{error}</Typography>}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? (expense ? 'Saving...' : 'Adding...') : (expense ? 'Save' : 'Add Expense')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function generateInviteCode() {
  // Use crypto.randomUUID if available, else fallback
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function TripItineraryPage() {
  const { tripId } = useParams();
  const [trip, setTrip] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [days, setDays] = useState([]);
  const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 900);
  const [tab, setTab] = useState(0); // 0: Itinerary, 1: Budget, 2: Live Chat, 3: Collaborators, 4: Settings
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [roleMenuAnchor, setRoleMenuAnchor] = useState(null);
  const [roleMenuMember, setRoleMenuMember] = useState(null);
  const [editActivity, setEditActivity] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [budgetTabExpenses, setBudgetTabExpenses] = useState([]);
  const [budgetLoading, setBudgetLoading] = useState(true);
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [inviteSuccessCode, setInviteSuccessCode] = useState(null);
  const [inviteTab, setInviteTab] = useState(0); // 0: Email, 1: Code
  const [codeLoading, setCodeLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [docUploadName, setDocUploadName] = useState('');
  // Budget section state
  const [expenseSort, setExpenseSort] = useState('date_desc');
  const [showSetBudget, setShowSetBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');
  const [budgetSaving, setBudgetSaving] = useState(false);
  const [sortedExpenses, setSortedExpenses] = useState([]);
  const [sidebarSelected, setSidebarSelected] = useState('overview');
  // Add at the top of TripItineraryPage
  const [placesToVisit, setPlacesToVisit] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [placeSearch, setPlaceSearch] = useState('');
  const [placeOptions, setPlaceOptions] = useState([]);
  const [placeSearchLoading, setPlaceSearchLoading] = useState(false);
  const [recommendedPlaces, setRecommendedPlaces] = useState([]);
  // Add state for PDF preview modal
  const [previewUrl, setPreviewUrl] = useState(null);
  const [allDayPlans, setAllDayPlans] = useState([]);
  const [overviewPlaces, setOverviewPlaces] = useState([]);
  // In TripItineraryPage, fetch trip documents for overview
  const [overviewDocuments, setOverviewDocuments] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState(trip?.startDate || '');
  const [editEndDate, setEditEndDate] = useState(trip?.endDate || '');
  const [savingDates, setSavingDates] = useState(false);
  // Add at the top of TripItineraryPage
  const [remarks, setRemarks] = useState([]);
  const [remarkInputs, setRemarkInputs] = useState({});
  // Add at the top of TripItineraryPage
  const [sidebarWidth, setSidebarWidth] = useState(340); // default width set to 340px
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 900) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch trip data and listen for document changes
  useEffect(() => {
    if (!tripId) return;
    const unsub = onSnapshot(doc(db, 'trips', tripId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTrip({ id: docSnap.id, ...data });
        // Listen for documents array
        setDocuments(data.documents || []);
        // Calculate days array
        const start = dayjs(data.startDate);
        const end = dayjs(data.endDate);
        const daysArr = [];
        for (let d = 0; d <= end.diff(start, 'day'); d++) {
          daysArr.push(start.add(d, 'day'));
        }
        setDays(daysArr);
      }
    });
    return () => unsub();
  }, [tripId]);

  // Fetch activities for this trip
  useEffect(() => {
    if (!tripId) return;
    const q = query(
      collection(db, 'itineraryItems'),
      where('tripId', '==', tripId),
      orderBy('date', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [tripId]);

  // Fetch expenses for this trip
  useEffect(() => {
    if (!tripId) return;
    setBudgetLoading(true);
    const q = query(collection(db, 'tripExpenses'), where('tripId', '==', tripId), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setBudgetTabExpenses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setBudgetLoading(false);
    });
    return () => unsub();
  }, [tripId]);

  useEffect(() => {
    let sorted = [...budgetTabExpenses];
    if (expenseSort === 'date_desc') {
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (expenseSort === 'date_asc') {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (expenseSort === 'amount_desc') {
      sorted.sort((a, b) => (parseFloat(b.amount) || 0) - (parseFloat(a.amount) || 0));
    } else if (expenseSort === 'amount_asc') {
      sorted.sort((a, b) => (parseFloat(a.amount) || 0) - (parseFloat(b.amount) || 0));
    }
    setSortedExpenses(sorted);
  }, [budgetTabExpenses, expenseSort]);

  // Group activities by day
  const activitiesByDay = days.map(day =>
    activities.filter(act => dayjs(act.date).isSame(day, 'day'))
  );

  // Invite member handler
  const handleInvite = async () => {
    setInviteError('');
    if (!inviteEmail) {
      setInviteError('Please enter an email.');
      return;
    }
    setInviteLoading(true);
    try {
      // Generate unique code
      const code = generateInviteCode();
      // Add to trip members as before
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        [`members.${inviteEmail.replace(/\./g, '_').toLowerCase()}`]: { role: 'contributor', email: inviteEmail, inviteCode: code }
      });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteSuccessCode(code);
      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
      }
    } catch (err) {
      setInviteError('Error inviting member: ' + err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // Get members from trip
  const members = trip?.members ? Object.entries(trip.members).map(([key, value]) => ({ id: key, ...value })) : [];

  // Get current user ID
  const currentUserId = auth.currentUser?.uid;
  const isAdmin = trip?.members && currentUserId && trip.members[currentUserId]?.role === 'admin';

  // Change member role
  const handleRoleMenuOpen = (event, member) => {
    setRoleMenuAnchor(event.currentTarget);
    setRoleMenuMember(member);
  };
  const handleRoleMenuClose = () => {
    setRoleMenuAnchor(null);
    setRoleMenuMember(null);
  };
  const handleChangeRole = async (role) => {
    if (!roleMenuMember) return;
    try {
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        [`members.${roleMenuMember.id}`]: { ...roleMenuMember, role }
      });
      handleRoleMenuClose();
    } catch (err) {
      alert('Error changing role: ' + err.message);
    }
  };

  // Remove member
  const handleRemoveMember = async (member) => {
    if (!window.confirm(`Remove ${member.email || member.id} from this trip?`)) return;
    try {
      const tripRef = doc(db, 'trips', tripId);
      const updatedMembers = { ...trip.members };
      delete updatedMembers[member.id];
      await updateDoc(tripRef, { members: updatedMembers });
      // AUTOMATION: Remove tripId from user's tripIds array
      // Try to get userId from member.id (if it's a UID) or fetch by email
      let userDocId = member.id;
      if (member.email && member.id !== member.email) {
        // If member.id is not an email, assume it's a UID
        userDocId = member.id;
      } else if (member.email) {
        // If member.id is an email, try to find the user by email
        // (Assumes you have a way to map email to UID, otherwise skip this step)
        // You may want to implement a lookup here if needed
      }
      if (userDocId) {
        await updateDoc(doc(db, 'users', userDocId), {
          tripIds: arrayRemove(tripId)
        });
      }
    } catch (err) {
      alert('Error removing member: ' + err.message);
    }
  };

  // Delete activity
  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm('Delete this activity?')) return;
    try {
      await deleteDoc(doc(db, 'itineraryItems', activityId));
    } catch (err) {
      alert('Error deleting activity: ' + err.message);
    }
  };

  // Delete expense
  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteDoc(doc(db, 'tripExpenses', expenseId));
    } catch (err) {
      alert('Error deleting expense: ' + err.message);
    }
  };

  // Calculate total spent
  const totalSpent = budgetTabExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

  // Generate and store a one-time code in Firestore
  const handleGenerateCode = async () => {
    setInviteError('');
    setCodeLoading(true);
    try {
      const code = generateInviteCode();
      await addDoc(collection(db, 'tripInvites'), {
        code,
        tripId,
        email: null, // open code
        used: false,
        createdAt: new Date(),
      });
      setGeneratedCode(code);
      setInviteSuccessCode(code);
      if (navigator.clipboard) navigator.clipboard.writeText(code);
    } catch (err) {
      setInviteError('Error generating code: ' + err.message);
    } finally {
      setCodeLoading(false);
    }
  };

  // Add document upload handler (store file name only, persist to Firestore)
  const handleDocUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const storageRef = ref(storage, `tripDocuments/${tripId}/${file.name}`);
      try {
        // Upload file to Firebase Storage
        await uploadBytes(storageRef, file);
        // Get download URL
        const url = await getDownloadURL(storageRef);
        // Save to Firestore
        const tripRef = doc(db, 'trips', tripId);
        await updateDoc(tripRef, {
          documents: [...documents, { name: file.name, url }]
        });
      } catch (err) {
        alert('Error saving document: ' + err.message);
      }
    }
  };

  // Set trip budget in Firestore
  const handleSetBudget = async () => {
    if (!budgetInput || isNaN(budgetInput) || parseFloat(budgetInput) < 0) return;
    setBudgetSaving(true);
    try {
      await updateDoc(doc(db, 'trips', tripId), { budget: parseFloat(budgetInput) });
      setShowSetBudget(false);
      setBudgetInput('');
    } catch (err) {
      alert('Error saving budget: ' + err.message);
    } finally {
      setBudgetSaving(false);
    }
  };

  // Fetch saved places to visit from Firestore
  useEffect(() => {
    if (!tripId) return;
    setPlacesLoading(true);
    const q = query(collection(db, 'trips', tripId, 'placesToVisit'));
    const unsub = onSnapshot(q, (snap) => {
      setPlacesToVisit(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setPlacesLoading(false);
    });
    return () => unsub();
  }, [tripId]);

  // Fetch recommended places (static or based on trip.place)
  useEffect(() => {
    if (!trip || !trip.place) return;
    // Example: static recommendations for demo
    setRecommendedPlaces([
      { name: "Humayun's Tomb", photo: 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg' },
      { name: 'India Gate', photo: 'https://images.pexels.com/photos/3601422/pexels-photo-3601422.jpeg' },
      { name: 'Lodhi Gardens', photo: 'https://images.pexels.com/photos/3601421/pexels-photo-3601421.jpeg' }
    ]);
  }, [trip]);

  // Place search autocomplete (Nominatim)
  useEffect(() => {
    if (!placeSearch || placeSearch.length < 2) {
      setPlaceOptions([]);
      return;
    }
    setPlaceSearchLoading(true);
    const controller = new AbortController();
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(placeSearch)}&addressdetails=1&limit=6`, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'en' }
    })
      .then(res => res.json())
      .then(data => {
        setPlaceOptions(data);
        setPlaceSearchLoading(false);
      })
      .catch(() => setPlaceSearchLoading(false));
    return () => controller.abort();
  }, [placeSearch]);

  // Add place to Firestore
  const handleAddPlace = async (place) => {
    if (!place) return;
    let photoUrl = place.photoUrl || place.photo || '';
    if (!photoUrl) {
      photoUrl = 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg';
    }
    await addDoc(collection(db, 'trips', tripId, 'placesToVisit'), {
      name: place.display_name || place.name,
      address: place.address || {},
      photoUrl,
      createdAt: new Date(),
    });
    setPlaceSearch('');
    setPlaceOptions([]);
  };

  // Remove place from Firestore
  const handleRemovePlace = async (id) => {
    await deleteDoc(doc(db, 'trips', tripId, 'placesToVisit', id));
  };

  // Add delete handler for documents
  const handleDeleteDocument = async (docObj) => {
    if (!window.confirm(`Delete ${docObj.name}? This cannot be undone.`)) return;
    try {
      // Remove from Storage
      if (docObj.url) {
        const storageRef = ref(storage, `tripDocuments/${tripId}/${docObj.name}`);
        await deleteObject(storageRef);
      }
      // Remove from Firestore
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        documents: documents.filter(d => d.url !== docObj.url)
      });
    } catch (err) {
      alert('Error deleting document: ' + err.message);
    }
  };

  // Fetch all day plans for the trip
  useEffect(() => {
    if (!tripId) return;
    const daysCol = collection(db, 'trips', tripId, 'days');
    const unsub = onSnapshot(daysCol, (snap) => {
      setAllDayPlans(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    const q = collection(db, 'trips', tripId, 'placesToVisit');
    const unsub = onSnapshot(q, (snap) => {
      setOverviewPlaces(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    const tripRef = doc(db, 'trips', tripId);
    const unsub = onSnapshot(tripRef, (snap) => {
      if (snap.exists()) {
        setOverviewDocuments(snap.data().documents || []);
      }
    });
    return () => unsub();
  }, [tripId]);

  useEffect(() => {
    if (!tripId) return;
    const chatCol = collection(db, 'trips', tripId, 'chat');
    const unsub = onSnapshot(chatCol, (snap) => {
      setChatMessages(
        snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      );
    });
    return () => unsub();
  }, [tripId]);

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    await addDoc(collection(db, 'trips', tripId, 'chat'), {
      text: chatInput,
      sender: auth.currentUser?.email || 'Anonymous',
      createdAt: new Date(),
    });
    setChatInput('');
  };

  // Fetch remarks for this trip
  useEffect(() => {
    if (!tripId) return;
    const q = query(collection(db, 'trips', tripId, 'remarks'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setRemarks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [tripId]);

  // Helper: grouped remarks by section
  const groupedRemarks = remarks.reduce((acc, r) => {
    if (!acc[r.section]) acc[r.section] = [];
    acc[r.section].push(r);
    return acc;
  }, {});

  // Helper: send remark
  const handleSendRemark = async (section) => {
    const text = remarkInputs[section]?.trim();
    if (!text) return;
    await addDoc(collection(db, 'trips', tripId, 'remarks'), {
      text,
      section,
      createdBy: auth.currentUser?.email || 'Anonymous',
      createdAt: new Date(),
    });
    setRemarkInputs((prev) => ({ ...prev, [section]: '' }));
  };

  // Helper: add remark (new function)
  const handleAddRemark = async (section) => {
    if (!remarkInputs[section]?.trim()) return;
    
    try {
      const remark = {
        text: remarkInputs[section].trim(),
        createdBy: auth.currentUser?.email || 'Anonymous',
        createdAt: serverTimestamp(),
        section: section
      };

      await addDoc(collection(db, 'trips', tripId, 'remarks'), remark);
      setRemarkInputs(prev => ({ ...prev, [section]: '' }));
    } catch (error) {
      console.error('Error adding remark:', error);
    }
  };

  // Mouse event handlers for resizing
  const handleMouseDown = (e) => {
    setIsResizing(true);
  };
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      const min = 180, max = 500;
      let newWidth = e.clientX - 60; // 60px for sidebar margin/padding
      if (newWidth < min) newWidth = min;
      if (newWidth > max) newWidth = max;
      setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  if (!trip) {
    return <Box sx={{ p: 8, textAlign: 'center' }}><Typography variant="h5">Loading trip...</Typography></Box>;
  }

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(120deg, #e0f7fa 60%, #fff 100%)' }}>
      {/* Header */}
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid #e0e0e0', background: 'rgba(255,255,255,0.95)' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Typography variant="h5" sx={{ fontWeight: 700, color: '#223a5f' }}>Jravel</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#2563eb', mr: 2 }}>{trip.name}</Typography>
            <Typography variant="body1" sx={{ color: '#888', mr: 2 }}>{dayjs(trip.startDate).format('MMM D, YYYY')} - {dayjs(trip.endDate).format('MMM D, YYYY')}</Typography>
            <IconButton color="primary" onClick={() => { setEditStartDate(trip.startDate); setEditEndDate(trip.endDate); setEditDateOpen(true); }}><EditIcon /></IconButton>
            <Avatar sx={{ bgcolor: '#47b5ff', ml: 2 }}>U</Avatar>
          </Box>
        </Toolbar>
      </AppBar>
      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid #e0e0e0', px: 4 }}>
        <Tab label="Itinerary" />
        <Tab label="Budget" />
        <Tab label="LIVE CHAT" icon={<ChatIcon />} />
        <Tab label={<span><GroupAddIcon sx={{ mr: 1, fontSize: 20 }} />Collaborators</span>} />
        <Tab label="Settings" />
      </Tabs>
      {/* Tab Content */}
      {tab === 3 ? (
        <Box sx={{ display: 'flex', minHeight: '100vh', height: '100vh', bgcolor: '#fff', borderRadius: 4, boxShadow: 1, overflow: 'hidden' }}>
          {/* Sidebar ... now resizable ... */}
          <Box sx={{ width: sidebarWidth, minWidth: 180, maxWidth: 500, bgcolor: '#f7f9fb', borderRight: '1.5px solid #e6eaf0', p: 0, display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 3, pb: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>Collaborators</Typography>
              {isAdmin && (
                <Button variant="outlined" size="small" startIcon={<PersonAddIcon />} onClick={() => setInviteOpen(true)} sx={{ borderRadius: 2, fontWeight: 600, fontSize: 14, ml: 1 }}>
                  Invite
                </Button>
              )}
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pb: 2 }}>
              {members.length === 0 ? (
                <Typography sx={{ color: '#888', mt: 2 }}>No collaborators yet.</Typography>
              ) : members.map(m => (
                <Box key={m.id} sx={{
                  display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, p: 1.5, borderRadius: 3,
                  bgcolor: m.id === currentUserId ? '#e0f7fa' : '#fff',
                  boxShadow: m.id === currentUserId ? 2 : 0,
                  border: m.id === currentUserId ? '1.5px solid #47b5ff' : '1.5px solid #e6eaf0',
                  cursor: 'pointer',
                  justifyContent: 'space-between'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: '#47b5ff', width: 40, height: 40, fontWeight: 700, fontSize: 20 }}>{(m.email ? m.email[0] : m.id[0]).toUpperCase()}</Avatar>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{m.email || m.id}</Typography>
                      <Typography sx={{ color: '#888', fontSize: 13 }}>{m.role}</Typography>
                    </Box>
                  </Box>
                  {isAdmin && m.id !== currentUserId && (
                    <IconButton color="error" onClick={async () => {
                      if (!window.confirm(`Remove ${m.email || m.id} from this trip?`)) return;
                      try {
                        const tripRef = doc(db, 'trips', tripId);
                        const updatedMembers = { ...trip.members };
                        delete updatedMembers[m.id];
                        await updateDoc(tripRef, { members: updatedMembers });
                        if (m.id && !m.id.includes('@')) {
                          await updateDoc(doc(db, 'users', m.id), {
                            tripIds: arrayRemove(tripId)
                          });
                        }
                      } catch (err) {
                        alert('Error removing collaborator: ' + err.message);
                      }
                    }} title="Delete Collaborator">
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
          {/* Draggable divider */}
          <Box
            sx={{ width: 8, cursor: 'col-resize', bgcolor: isResizing ? '#47b5ff' : 'transparent', zIndex: 2 }}
            onMouseDown={handleMouseDown}
          />
          {/* Main content: Special Remarks */}
          <Box sx={{ flex: 1, bgcolor: '#fff', p: 4, overflowY: 'auto', height: '100vh' }}>
            <Typography variant="h5" sx={{ color: '#2563eb', fontWeight: 700, mb: 2 }}>Special Remarks</Typography>
            {Object.keys(groupedRemarks).length === 0 ? (
              <Typography sx={{ color: '#888', mt: 2 }}>No remarks yet.</Typography>
            ) : (
              Object.entries(groupedRemarks).map(([section, remarksArr]) => (
                <Paper key={section} sx={{ p: 2.5, mb: 2, borderRadius: 3, boxShadow: 1, maxWidth: 500, minWidth: 220, overflowX: 'auto' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>
                    {section === 'places' ? 'Places to Visit' :
                      section.match(/^\d{4}-\d{2}-\d{2}$/) ? `Day ${days.findIndex(d => d.format('YYYY-MM-DD') === section) + 1} - ${dayjs(section).format('dddd, MMMM D')}` : section}
                  </Typography>
                  {remarksArr.map((r, idx) => (
                    <Box key={r.id || idx} sx={{ mb: 1.5, pl: 1, borderLeft: '3px solid #47b5ff', wordBreak: 'break-word' }}>
                      <Typography sx={{ fontSize: 15, color: '#223a5f', fontWeight: 600 }}>{r.text}</Typography>
                      <Typography sx={{ fontSize: 13, color: '#888' }}>by {r.createdBy} {r.createdAt?.seconds ? `on ${dayjs(r.createdAt.seconds * 1000).format('MMM D, YYYY h:mm A')}` : ''}</Typography>
                    </Box>
                  ))}
                </Paper>
              ))
            )}
          </Box>
          {/* Invite Modal and Role Menu remain unchanged below */}
          <Menu anchorEl={roleMenuAnchor} open={Boolean(roleMenuAnchor)} onClose={handleRoleMenuClose}>
            <MenuItem onClick={() => handleChangeRole('admin')}>Admin</MenuItem>
            <MenuItem onClick={() => handleChangeRole('contributor')}>Contributor</MenuItem>
            <MenuItem onClick={() => handleChangeRole('viewer')}>Viewer</MenuItem>
          </Menu>
          <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Invite Member</DialogTitle>
            <IconButton onClick={() => setInviteOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
            <DialogContent>
              <Tabs value={inviteTab} onChange={(_, v) => setInviteTab(v)} sx={{ mb: 2 }}>
                <Tab label="By Email" />
                <Tab label="One-Time Code" />
              </Tabs>
              {inviteTab === 0 ? (
                <>
                  <TextField
                    label="Email"
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    fullWidth
                    required
                    sx={{ mt: 2 }}
                  />
                  {inviteError && <Typography color="error" sx={{ mt: 1 }}>{inviteError}</Typography>}
                </>
              ) : (
                <>
                  <Button
                    variant="contained"
                    onClick={handleGenerateCode}
                    disabled={codeLoading}
                    sx={{ borderRadius: 999, mt: 2 }}
                  >
                    {codeLoading ? 'Generating...' : 'Generate One-Time Code'}
                  </Button>
                  {generatedCode && (
                    <Box sx={{ mt: 3, bgcolor: '#f5f5f5', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{generatedCode}</Typography>
                      <IconButton size="small" onClick={() => navigator.clipboard.writeText(generatedCode)}><ContentCopyIcon fontSize="small" /></IconButton>
                    </Box>
                  )}
                  {inviteError && <Typography color="error" sx={{ mt: 1 }}>{inviteError}</Typography>}
                </>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
              {inviteTab === 0 && (
                <Button onClick={handleInvite} variant="contained" disabled={inviteLoading}>
                  {inviteLoading ? 'Inviting...' : 'Invite'}
                </Button>
              )}
            </DialogActions>
          </Dialog>
          <Dialog open={!!inviteSuccessCode} onClose={() => setInviteSuccessCode(null)} maxWidth="xs" fullWidth>
            <DialogTitle>Invite Code Generated</DialogTitle>
            <DialogContent>
              <Typography sx={{ mb: 2 }}>Share this code with the invited member. They can use it to join the trip.</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#f5f5f5', borderRadius: 2, p: 2, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{inviteSuccessCode}</Typography>
                <IconButton size="small" onClick={() => navigator.clipboard.writeText(inviteSuccessCode)}><ContentCopyIcon fontSize="small" /></IconButton>
              </Box>
              <Typography sx={{ color: '#2563eb', fontWeight: 500 }}>Code copied to clipboard!</Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  href={`mailto:?subject=Jravel Trip Invite&body=Join my trip \"${trip?.name || ''}\" on Jravel! Use this code: ${inviteSuccessCode}`}
                  target="_blank"
                >
                  Share via Email
                </Button>
                <Button
                  variant="outlined"
                  color="success"
                  href={`https://wa.me/?text=Join my trip \"${trip?.name || ''}\" on Jravel! Use this code: ${inviteSuccessCode}`}
                  target="_blank"
                >
                  Share via WhatsApp
                </Button>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setInviteSuccessCode(null)} variant="contained">Close</Button>
            </DialogActions>
          </Dialog>
        </Box>
      ) : tab === 1 ? (
        <Box sx={{ p: 4 }}>
          {/* Budget Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#223a5f' }}>Budgeting</Typography>
            <Button
              variant="contained"
              sx={{ bgcolor: '#ff715b', color: '#fff', borderRadius: 999, fontWeight: 700, fontSize: 16, px: 3, py: 1.2, boxShadow: 0, textTransform: 'none', '&:hover': { bgcolor: '#ff9472' } }}
              startIcon={<AddIcon />}
              onClick={() => setBudgetModalOpen(true)}
            >
              Add expense
            </Button>
          </Box>
          {/* Budget Summary Card */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
            <Paper sx={{ flex: 1, minWidth: 260, p: 3, borderRadius: 4, boxShadow: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 28, color: '#223a5f' }}>₹{totalSpent.toFixed(2)}</Typography>
              <Typography sx={{ color: '#888', fontWeight: 500, fontSize: 16 }}>Total Spent</Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                <Button variant="outlined" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} onClick={() => setShowSetBudget(true)}>Set budget</Button>
                <Button variant="outlined" size="small" sx={{ borderRadius: 999, fontWeight: 700 }} disabled>Group balances</Button>
              </Box>
            </Paper>
            <Paper sx={{ flex: 2, minWidth: 260, p: 3, borderRadius: 4, boxShadow: 2, display: 'flex', flexDirection: 'column', gap: 1, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 1 }}>
                <Button variant="text" sx={{ fontWeight: 700, color: '#223a5f' }} disabled>View breakdown</Button>
                <Button variant="text" sx={{ fontWeight: 700, color: '#223a5f' }} disabled>Add tripmate</Button>
                <Button variant="text" sx={{ fontWeight: 700, color: '#223a5f' }} disabled>Settings</Button>
              </Box>
              {trip && trip.budget && (
                <Typography sx={{ color: '#2563eb', fontWeight: 600, fontSize: 16 }}>Budget: ₹{trip.budget.toFixed(2)}</Typography>
              )}
            </Paper>
          </Box>
          {/* Expenses List Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Expenses</Typography>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Sort</InputLabel>
              <Select
                value={expenseSort}
                label="Sort"
                onChange={e => setExpenseSort(e.target.value)}
              >
                <MenuItem value="date_desc">Date (newest first)</MenuItem>
                <MenuItem value="date_asc">Date (oldest first)</MenuItem>
                <MenuItem value="amount_desc">Amount (high to low)</MenuItem>
                <MenuItem value="amount_asc">Amount (low to high)</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {/* Expenses List */}
          {budgetLoading ? (
            <Typography>Loading expenses...</Typography>
          ) : sortedExpenses.length === 0 ? (
            <Typography>No expenses yet. Add your first expense!</Typography>
          ) : (
            <List>
              {sortedExpenses.map(exp => (
                <ListItem key={exp.id} sx={{ bgcolor: '#fff', borderRadius: 3, mb: 2, boxShadow: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>₹{exp.amount.toFixed(2)} - {exp.category}</Typography>
                    <Typography sx={{ color: '#888' }}>{exp.description}</Typography>
                    <Typography sx={{ color: '#bbb', fontSize: 13 }}>{dayjs(exp.date).format('MMM D, YYYY')}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => setEditExpense(exp)} sx={{ textTransform: 'none' }}>Edit</Button>
                    <IconButton color="error" onClick={() => handleDeleteExpense(exp.id)} title="Delete Expense">
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          )}
          {/* Set Budget Modal */}
          <Dialog open={showSetBudget} onClose={() => setShowSetBudget(false)} maxWidth="xs" fullWidth>
            <DialogTitle>Set Trip Budget</DialogTitle>
            <DialogContent>
              <TextField
                label="Budget Amount"
                type="number"
                value={budgetInput}
                onChange={e => setBudgetInput(e.target.value)}
                fullWidth
                InputProps={{ startAdornment: <span style={{marginRight:6,fontSize:16,fontWeight:600,color:'#555'}}>₹</span> }}
                sx={{ mt: 2 }}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setShowSetBudget(false)}>Cancel</Button>
              <Button variant="contained" onClick={handleSetBudget} disabled={budgetSaving}>
                {budgetSaving ? 'Saving...' : 'Save'}
              </Button>
            </DialogActions>
          </Dialog>
          <BudgetModal
            open={budgetModalOpen || !!editExpense}
            onClose={() => { setBudgetModalOpen(false); setEditExpense(null); }}
            tripId={tripId}
            expense={editExpense}
            onSave={() => setEditExpense(null)}
          />
        </Box>
      ) : tab === 2 ? (
        <Box sx={{ display: 'flex', height: '100vh', minHeight: '100vh', bgcolor: '#eaf6fb', borderRadius: 0, boxShadow: 0, overflow: 'hidden' }}>
          <TeamMembersSidebar members={members} currentUserEmail={auth.currentUser?.email} />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minHeight: '100vh' }}>
            {/* Optional: Chat header can go here */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 0.5, bgcolor: '#f7f9fb' }}>
              {chatMessages.length === 0 ? (
                <Typography sx={{ color: '#bbb', fontSize: 13, textAlign: 'center', mt: 8 }}>No messages yet. Start the conversation!</Typography>
              ) : (
                chatMessages.map((msg, idx) => (
                  <ChatMessage key={msg.id || idx} msg={msg} currentUserEmail={auth.currentUser?.email} />
                ))
              )}
            </Box>
            <Box sx={{ p: 2, borderTop: '1.5px solid #e0e0e0', bgcolor: '#fff', display: 'flex', gap: 1, alignItems: 'center', boxShadow: '0 -2px 8px rgba(71,181,255,0.04)', borderRadius: 0 }}>
              <TextField
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="Type a message..."
                fullWidth
                size="small"
                onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                inputProps={{ style: { fontSize: 15, borderRadius: 16 } }}
                sx={{ bgcolor: '#f7f9fb', borderRadius: 999 }}
              />
              <Button variant="contained" onClick={handleSendChat} disabled={!chatInput.trim()} sx={{ fontSize: 15, minWidth: 60, borderRadius: 999, boxShadow: 0 }}>Send</Button>
            </Box>
          </Box>
        </Box>
      ) : (
        <>
          {/* Day Navigation */}
          <Box sx={{ width: '100%', bgcolor: '#f7f9fb', borderBottom: '1.5px solid #e6eaf0', px: 3, py: 2, display: 'flex', gap: 2 }}>
            {days.map((day, i) => (
              <Button
                key={i}
                variant={i === selectedDay ? 'contained' : 'outlined'}
                sx={{ borderRadius: 999, minWidth: 100, fontWeight: 700 }}
                onClick={() => { setSelectedDay(i); setShowDocuments(false); }}
              >
                {`Day ${i + 1}`}<br />{day.format('MMM D')}
              </Button>
            ))}
          </Box>
          {/* Main Content */}
          <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: 0, width: '100%' }}>
            {/* Left Sidebar Navigation */}
            <Box sx={{ width: 220, minWidth: 180, bgcolor: '#f7f9fb', borderRight: '1.5px solid #e6eaf0', height: '100vh', position: 'sticky', top: 0, display: { xs: 'none', sm: 'block' } }}>
              <Box sx={{ p: 3, pt: 4 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#223a5f' }}>Menu</Typography>
                <List>
                  <ListItem button selected={sidebarSelected === 'overview'} sx={{ borderRadius: 2, mb: 1, fontWeight: 500, bgcolor: sidebarSelected === 'overview' ? '#eaf6fb' : undefined }} onClick={() => setSidebarSelected('overview')}>
                    <ListItemText primary="Overview" />
                  </ListItem>
                  {!isAdmin && (
                    <ListItem button selected={sidebarSelected === 'remarks'} sx={{ borderRadius: 2, mb: 1, fontWeight: 500, bgcolor: sidebarSelected === 'remarks' ? '#eaf6fb' : undefined }} onClick={() => setSidebarSelected('remarks')}>
                      <ListItemText primary="Remarks" />
                    </ListItem>
                  )}
                  <ListItem button selected={sidebarSelected === 'places'} sx={{ borderRadius: 2, mb: 1, fontWeight: 500, bgcolor: sidebarSelected === 'places' ? '#eaf6fb' : undefined }} onClick={() => setSidebarSelected('places')}>
                    <ListItemText primary="Places to visit" />
                  </ListItem>
                  <ListItem button selected={sidebarSelected === 'documents'} sx={{ borderRadius: 2, mb: 1, fontWeight: 500, bgcolor: sidebarSelected === 'documents' ? '#eaf6fb' : undefined }} onClick={() => setSidebarSelected('documents')}>
                    <ListItemText primary="View Documents" />
                  </ListItem>
                  <ListItem button selected={sidebarSelected === 'itinerary'} sx={{ borderRadius: 2, mb: 1, fontWeight: 500, bgcolor: sidebarSelected === 'itinerary' ? '#eaf6fb' : undefined }} onClick={() => setSidebarSelected('itinerary')}>
                    <ListItemText primary={`Itinerary for ${days[selectedDay]?.format('dddd, MMMM D') || ''}`} />
                  </ListItem>
                </List>
              </Box>
            </Box>
            {/* Center: Itinerary Days as Cards or Documents */}
            <Box sx={{ flex: 1, px: { xs: 1, sm: 3 }, py: 3, maxWidth: 700, mx: 'auto' }}>
              {sidebarSelected === 'overview' ? (
                <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 2, bgcolor: '#fff' }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#2563eb' }}>Itinerary Overview</Typography>
                  {overviewPlaces.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#223a5f', mb: 1 }}>Places to Visit</Typography>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        {overviewPlaces.map(place => (
                          <Box key={place.id} sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f7f9fb', borderRadius: 3, boxShadow: 1, p: 1.5, border: '1.5px solid #e6eaf0', mb: 1 }}>
                            <img
                              src={place.photoUrl || 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg'}
                              alt={place.name}
                              style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover', marginRight: 12 }}
                              onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/48x48?text=No+Image'; }}
                            />
                            <Box>
                              <Typography sx={{ fontWeight: 600 }}>{place.name}</Typography>
                              <Typography sx={{ color: '#888', fontSize: 13 }}>{place.address?.state || ''}{place.address?.state && place.address?.country ? ', ' : ''}{place.address?.country || ''}</Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  )}
                  {days.map((day, i) => {
                    const plan = allDayPlans.find(d => d.id === day.format('YYYY-MM-DD'));
                    return (
                      <Box key={i} sx={{ mb: 3 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#223a5f', mb: 1 }}>{day.format('dddd, MMMM D')}</Typography>
                        {plan && plan.activities && plan.activities.length > 0 ? (
                          <List>
                            {plan.activities.map((act, idx) => (
                              <ListItem key={act.id || idx} sx={{ bgcolor: '#f5faff', borderRadius: 2, mb: 1, boxShadow: 1, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{act.name} {act.time && <span>({act.time})</span>}</Typography>
                                <Typography variant="body2" sx={{ color: '#888' }}>{act.type} {act.location && `| ${act.location}`}</Typography>
                                <Typography variant="body2">{act.notes || act.description}</Typography>
                              </ListItem>
                            ))}
                          </List>
                        ) : (
                          <Typography sx={{ color: '#bbb', fontSize: 15, mb: 1 }}>No activities planned.</Typography>
                        )}
                      </Box>
                    );
                  })}
                  {overviewDocuments.length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, color: '#223a5f', mb: 1 }}>Documents</Typography>
                      <List>
                        {overviewDocuments.map((doc, idx) => (
                          <ListItem key={idx} sx={{ bgcolor: '#f5faff', borderRadius: 2, mb: 1, boxShadow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <IconButton onClick={() => setPreviewUrl(doc.url)} title="Preview"><VisibilityIcon /></IconButton>
                            <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#223a5f', fontWeight: 600, flex: 1 }}>
                              {doc.name}
                            </a>
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Paper>
              ) : sidebarSelected === 'places' ? (
                <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 2, bgcolor: '#fff' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Places to visit</Typography>
                    <IconButton size="small"><MoreVertIcon /></IconButton>
                  </Box>
                  {/* Add a place input */}
                  <Autocomplete
                    freeSolo
                    options={placeOptions}
                    loading={placeSearchLoading}
                    getOptionLabel={option => option.display_name || ''}
                    filterOptions={x => x}
                    value={null}
                    onChange={(_, value) => value && handleAddPlace(value)}
                    inputValue={placeSearch}
                    onInputChange={(_, value) => setPlaceSearch(value)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Add a place" variant="outlined" size="small" InputProps={{ ...params.InputProps, startAdornment: <span style={{ color: '#bbb', marginRight: 8 }}>📍</span> }} />
                    )}
                    renderOption={(props, option) => (
                      <li {...props} key={option.place_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8 }}>
                        <Box>
                          <span style={{ fontWeight: 600 }}>{option.display_name.split(',')[0]}</span>
                          <span style={{ color: '#888', fontSize: 13, marginLeft: 8 }}>{option.address?.state || ''}{option.address?.state && option.address?.country ? ', ' : ''}{option.address?.country || ''}</span>
                        </Box>
                        <IconButton size="small" onClick={e => { e.stopPropagation(); handleAddPlace(option); }} sx={{ ml: 1 }}>
                          <AddIcon fontSize="small" />
                        </IconButton>
                      </li>
                    )}
                    sx={{ mb: 2, maxWidth: 480 }}
                  />
                  {/* Recommended places */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#888', mb: 1, fontWeight: 700 }}><KeyboardArrowDownIcon sx={{ fontSize: 18, mr: 1 }} />Recommended places</Typography>
                    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 1 }}>
                      {recommendedPlaces.map((place, idx) => (
                        <Box key={idx} sx={{ minWidth: 200, maxWidth: 220, bgcolor: '#f7f9fb', borderRadius: 3, boxShadow: 1, display: 'flex', alignItems: 'center', p: 1, pr: 2, border: '1.5px solid #e6eaf0', mr: 2 }}>
                          <img
                            src={place.photo}
                            alt={place.name}
                            style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', marginRight: 12 }}
                            onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/56x56?text=No+Image'; }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{place.name}</Typography>
                          </Box>
                          <IconButton onClick={() => handleAddPlace(place)} sx={{ bgcolor: '#eaf6fb', ml: 1 }}><AddIcon /></IconButton>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  {/* Saved places to visit */}
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" sx={{ color: '#888', mb: 1, fontWeight: 700 }}>Your places to visit</Typography>
                  {placesLoading ? (
                    <Typography sx={{ color: '#bbb', fontSize: 15, mt: 1 }}>Loading...</Typography>
                  ) : placesToVisit.length === 0 ? (
                    <Typography sx={{ color: '#bbb', fontSize: 15, mt: 1 }}>No places added yet.</Typography>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {placesToVisit.map(place => (
                        <Box key={place.id} sx={{ display: 'flex', alignItems: 'center', bgcolor: '#f7f9fb', borderRadius: 3, boxShadow: 1, p: 1.5, border: '1.5px solid #e6eaf0' }}>
                          <img
                            src={place.photoUrl || 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg'}
                            alt={place.name}
                            style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', marginRight: 12 }}
                            onError={e => { e.target.onerror = null; e.target.src = 'https://via.placeholder.com/56x56?text=No+Image'; }}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>{place.name}</Typography>
                            <Typography sx={{ color: '#888', fontSize: 13 }}>{place.address?.state || ''}{place.address?.state && place.address?.country ? ', ' : ''}{place.address?.country || ''}</Typography>
                          </Box>
                          <IconButton onClick={() => handleRemovePlace(place.id)} sx={{ bgcolor: '#fff', ml: 1 }}><DeleteIcon /></IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Paper>
              ) : sidebarSelected === 'documents' ? (
                <Paper sx={{ p: 3, borderRadius: 4, boxShadow: 2, bgcolor: '#fff' }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Documents</Typography>
                  <Box sx={{ mb: 2 }}>
                    <Button variant="outlined" component="label" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
                      Upload Document
                      <input type="file" hidden onChange={handleDocUpload} />
                    </Button>
                  </Box>
                  <List>
                    {documents.length === 0 ? (
                      <Typography sx={{ color: '#bbb', fontSize: 15, mt: 1 }}>No documents uploaded yet.</Typography>
                    ) : (
                      documents.map((doc, idx) => (
                        <ListItem key={idx} sx={{ bgcolor: '#f5faff', borderRadius: 2, mb: 1, boxShadow: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                          {doc.url ? (
                            <>
                              <IconButton onClick={() => setPreviewUrl(doc.url)} title="Preview"><VisibilityIcon /></IconButton>
                              <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#223a5f', fontWeight: 600, flex: 1 }}>
                                {doc.name}
                              </a>
                              <IconButton onClick={() => handleDeleteDocument(doc)} title="Delete"><DeleteIcon color="error" /></IconButton>
                            </>
                          ) : (
                            <>{doc.name || doc}</>
                          )}
                        </ListItem>
                      ))
                    )}
                  </List>
                </Paper>
              ) : sidebarSelected === 'remarks' ? (
                <Paper sx={{ width: '100%', maxWidth: 700, borderRadius: 4, boxShadow: 2, bgcolor: '#f7f9fb', p: 3, mx: 'auto' }}>
                  <Typography variant="h5" sx={{ color: '#2563eb', fontWeight: 700, mb: 2 }}>Special Remarks</Typography>
                  {/* Places to Visit Remark */}
                  <Paper sx={{ p: 2.5, mb: 2, borderRadius: 3, boxShadow: 1, bgcolor: '#f7f9fb' }}>
                    <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>Places to Visit</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TextField
                        placeholder="Write your remark about places to visit..."
                        value={remarkInputs['places'] || ''}
                        onChange={e => setRemarkInputs(prev => ({ ...prev, ['places']: e.target.value }))}
                        size="small"
                        fullWidth
                        multiline
                        rows={2}
                        sx={{ bgcolor: '#fff' }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleAddRemark('places')}
                        disabled={!remarkInputs['places']?.trim()}
                        sx={{ borderRadius: 2, minWidth: 100 }}
                      >
                        Add
                      </Button>
                    </Box>
                  </Paper>
                  {/* Day Remarks */}
                  {days.map((day, i) => (
                    <Paper key={i} sx={{ p: 2.5, mb: 2, borderRadius: 3, boxShadow: 1, bgcolor: '#f7f9fb' }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>Day {i + 1} - {day.format('dddd, MMMM D')}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <TextField
                          placeholder={`Write your remark for Day ${i + 1}...`}
                          value={remarkInputs[day.format('YYYY-MM-DD')] || ''}
                          onChange={e => setRemarkInputs(prev => ({ ...prev, [day.format('YYYY-MM-DD')]: e.target.value }))}
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          sx={{ bgcolor: '#fff' }}
                        />
                        <Button
                          variant="contained"
                          onClick={() => handleAddRemark(day.format('YYYY-MM-DD'))}
                          disabled={!remarkInputs[day.format('YYYY-MM-DD')]?.trim()}
                          sx={{ borderRadius: 2, minWidth: 100 }}
                        >
                          Add
                        </Button>
                      </Box>
                    </Paper>
                  ))}
                  {/* Display existing remarks */}
                  {Object.keys(groupedRemarks).length > 0 && (
                    <Box sx={{ mt: 4 }}>
                      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Previous Remarks</Typography>
                      {Object.entries(groupedRemarks).map(([section, remarksArr]) => (
                        <Paper key={section} sx={{ p: 2.5, mb: 2, borderRadius: 3, boxShadow: 1, bgcolor: '#f7f9fb' }}>
                          <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>
                            {section === 'places' ? 'Places to Visit' :
                              section.match(/^\d{4}-\d{2}-\d{2}$/) ? `Day ${days.findIndex(d => d.format('YYYY-MM-DD') === section) + 1} - ${dayjs(section).format('dddd, MMMM D')}` : section}
                          </Typography>
                          {remarksArr.map((r, idx) => (
                            <Box key={r.id || idx} sx={{ mb: 1.5, pl: 1, borderLeft: '3px solid #47b5ff', wordBreak: 'break-word' }}>
                              <Typography sx={{ fontSize: 15, color: '#223a5f', fontWeight: 600 }}>{r.text}</Typography>
                              <Typography sx={{ fontSize: 13, color: '#888' }}>by {r.createdBy} {r.createdAt?.seconds ? `on ${dayjs(r.createdAt.seconds * 1000).format('MMM D, YYYY h:mm A')}` : ''}</Typography>
                            </Box>
                          ))}
                        </Paper>
                      ))}
                    </Box>
                  )}
                </Paper>
              ) : (
                <DayPlanCard
                  tripId={tripId}
                  day={days[selectedDay]}
                  userId={auth.currentUser?.uid}
                />
              )}
            </Box>
            {/* Right Sidebar: Map (make larger) */}
            {trip && trip.place && trip.place.lat && trip.place.lon && (
              <Paper sx={{ minWidth: 420, maxWidth: 520, minHeight: 420, borderRadius: 4, boxShadow: 3, p: 2, position: { md: 'sticky' }, top: 100, display: { xs: 'none', md: 'block' } }}>
                <Typography variant="h6" sx={{ color: '#2563eb', mb: 1 }}>Trip Location</Typography>
                <MapContainer
                  center={[parseFloat(trip.place.lat), parseFloat(trip.place.lon)]}
                  zoom={10}
                  style={{ height: 380, width: '100%', borderRadius: 16, boxShadow: '0 4px 24px rgba(71,181,255,0.10)' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[parseFloat(trip.place.lat), parseFloat(trip.place.lon)]} icon={bigMarkerIcon}>
                    <Popup>{trip.place.display_name || 'Trip Location'}</Popup>
                  </Marker>
                </MapContainer>
              </Paper>
            )}
          </Box>
        </>
      )}

      <AddActivityModal
        open={isAddActivityModalOpen || !!editActivity}
        onClose={() => { setIsAddActivityModalOpen(false); setEditActivity(null); }}
        tripId={tripId}
        selectedDay={days[selectedDay]}
        activity={editActivity}
        onSave={() => setEditActivity(null)}
      />
      {/* Add PDF preview modal */}
      <Dialog open={!!previewUrl} onClose={() => setPreviewUrl(null)} maxWidth="md" fullWidth>
        <DialogTitle>PDF Preview</DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {previewUrl && (
            <iframe src={previewUrl} title="PDF Preview" style={{ width: '100%', height: '80vh', border: 'none' }} />
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Dates Dialog */}
      <Dialog open={editDateOpen} onClose={() => setEditDateOpen(false)}>
        <DialogTitle>Edit Trip Dates</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={editStartDate}
              onChange={e => setEditStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={editEndDate}
              onChange={e => setEditEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={savingDates}
            onClick={async () => {
              setSavingDates(true);
              try {
                await updateDoc(doc(db, 'trips', tripId), {
                  startDate: editStartDate,
                  endDate: editEndDate,
                });
                setEditDateOpen(false);
              } catch (err) {
                alert('Error updating dates: ' + err.message);
              } finally {
                setSavingDates(false);
              }
            }}
          >
            {savingDates ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      {tab === 0 && !isAdmin && (
        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3 }}>
          {/* Removed old Special Remarks section */}
        </Box>
      )}
      {sidebarSelected === 'remarks' && !isAdmin && (
        <></> // Already rendered in main content area, so render nothing here
      )}
    </Box>
  );
}

function MyTripsPage() {
  const [createdTrips, setCreatedTrips] = useState([]);
  const [joinedTrips, setJoinedTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  const fallbackImg = 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg';
  const [showTripModal, setShowTripModal] = useState(false);
  const [inviteTripId, setInviteTripId] = useState(null); // for invite modal
  const [inviteTab, setInviteTab] = useState(0);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(u => setUser(u));
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    setError('');
    setLoading(true);
    (async () => {
      try {
        // 1. Get the user's tripIds array
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const tripIds = userDoc.exists() ? userDoc.data().tripIds || [] : [];
        if (!tripIds.length) {
          setCreatedTrips([]);
          setJoinedTrips([]);
          setLoading(false);
          return;
        }
        // 2. Query only those trips
        // Firestore 'in' queries are limited to 10 items per query
        const chunkSize = 10;
        let allTrips = [];
        for (let i = 0; i < tripIds.length; i += chunkSize) {
          const chunk = tripIds.slice(i, i + chunkSize);
          const tripsQ = query(collection(db, 'trips'), where('__name__', 'in', chunk));
          const tripsSnap = await getDocs(tripsQ);
          allTrips = allTrips.concat(tripsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }
        // Separate created and joined trips
        const created = [];
        const joined = [];
        allTrips.forEach(trip => {
          if (trip.createdBy === user.uid) {
            created.push(trip);
          } else {
            joined.push(trip);
          }
        });
        setCreatedTrips(created);
        setJoinedTrips(joined);
        setLoading(false);
      } catch (err) {
        setError('Error loading trips: ' + err.message);
        setLoading(false);
      }
    })();
  }, [user]);

  const handleDelete = async (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'trips', tripId));
    } catch (err) {
      alert('Error deleting trip: ' + err.message);
    }
  };

  // Join trip by code
  const handleJoinTrip = async (e) => {
    e.preventDefault();
    setJoinError('');
    setJoinSuccess('');
    setJoinLoading(true);
    try {
      if (!user || !user.email) {
        setJoinError('Please log in to join a trip.');
        setJoinLoading(false);
        return;
      }
      // Find invite by code
      const q = query(collection(db, 'tripInvites'), where('code', '==', joinCode));
      const snap = await getDocs(q);
      if (snap.empty) {
        setJoinError('Invalid invite code.');
        setJoinLoading(false);
        return;
      }
      const inviteDoc = snap.docs[0];
      const invite = inviteDoc.data();
      if (invite.used) {
        setJoinError('This invite code has already been used.');
        setJoinLoading(false);
        return;
      }
      const tripId = invite.tripId;
      // Add user to trip members (KEYED BY UID, ONLY update members field)
      const tripRef = doc(db, 'trips', tripId);
      await updateDoc(tripRef, {
        [`members.${user.uid}`]: { role: 'contributor', email: user.email, joinedViaCode: joinCode }
      });
      // AUTOMATION: Add tripId to user's tripIds array
      await updateDoc(doc(db, 'users', user.uid), {
        tripIds: arrayUnion(tripId)
      });
      // Mark invite as used
      await updateDoc(inviteDoc.ref, { used: true, usedBy: user.email, usedAt: new Date() });
      setJoinSuccess('Successfully joined the trip! Redirecting...');
      setTimeout(() => {
        navigate(`/trips/${tripId}`);
      }, 1500);
    } catch (err) {
      setJoinError('Error joining trip: ' + err.message);
    } finally {
      setJoinLoading(false);
    }
  };

  // Invite member handler (by email)
  const handleInvite = async () => {
    setInviteError('');
    if (!inviteEmail) {
      setInviteError('Please enter an email.');
      return;
    }
    setInviteLoading(true);
    try {
      // Generate unique code
      const code = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      // Add to trip members as before
      const tripRef = doc(db, 'trips', inviteTripId);
      await updateDoc(tripRef, {
        [`members.${inviteEmail.replace(/\./g, '_').toLowerCase()}`]: { role: 'contributor', email: inviteEmail, inviteCode: code }
      });
      setInviteTripId(null);
      setInviteEmail('');
      setGeneratedCode(code);
      // Copy to clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText(code);
      }
    } catch (err) {
      setInviteError('Error inviting member: ' + err.message);
    } finally {
      setInviteLoading(false);
    }
  };

  // Generate and store a one-time code in Firestore
  const handleGenerateCode = async () => {
    setInviteError('');
    setCodeLoading(true);
    try {
      const code = Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      await addDoc(collection(db, 'tripInvites'), {
        code,
        tripId: inviteTripId,
        email: null, // open code
        used: false,
        createdAt: new Date(),
      });
      setGeneratedCode(code);
      if (navigator.clipboard) navigator.clipboard.writeText(code);
    } catch (err) {
      setInviteError('Error generating code: ' + err.message);
    } finally {
      setCodeLoading(false);
    }
  };

  // In MyTripsPage, add a leave trip handler
  const handleLeaveTrip = async (tripId) => {
    if (!window.confirm('Are you sure you want to leave this trip?')) return;
    try {
      // Remove user from trip's members
      const tripRef = doc(db, 'trips', tripId);
      const tripSnap = await getDoc(tripRef);
      if (tripSnap.exists()) {
        const tripData = tripSnap.data();
        const updatedMembers = { ...tripData.members };
        delete updatedMembers[user.uid];
        await updateDoc(tripRef, { members: updatedMembers });
      }
      // Remove tripId from user's tripIds array
      await updateDoc(doc(db, 'users', user.uid), {
        tripIds: arrayRemove(tripId)
      });
      // Optionally, refresh trips
      setJoinedTrips(joinedTrips.filter(t => t.id !== tripId));
    } catch (err) {
      alert('Error leaving trip: ' + err.message);
    }
  };

  if (!user) return <Box sx={{ p: 8, textAlign: 'center' }}><Typography variant="h6">Please log in to view your trips.</Typography></Box>;
  if (loading) return <Box sx={{ p: 8, textAlign: 'center' }}><Typography>Loading trips...</Typography></Box>;
  if (error) return <Box sx={{ p: 8, textAlign: 'center' }}><Typography color="error">{error}</Typography></Box>;

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 6, p: 3, bgcolor: '#f7f9fb', borderRadius: 4, boxShadow: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#223a5f' }}>Your trips</Typography>
        <Button
          variant="contained"
          sx={{ bgcolor: '#f5f6fa', color: '#222', borderRadius: 999, fontWeight: 700, boxShadow: 0, px: 3, py: 1.2, textTransform: 'none', fontSize: 16, '&:hover': { bgcolor: '#e0e0e0' } }}
          onClick={() => setShowTripModal(true)}
        >
          + Plan new trip
        </Button>
      </Box>
      {/* Created Trips Section */}
      {createdTrips.length === 0 ? (
        <Typography>No trips found for your account. Make sure your trips have a <b>createdBy</b> field with your user ID.</Typography>
      ) : (
        <List sx={{ p: 0 }}>
          {createdTrips.map(trip => (
            <Box
              key={trip.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff', borderRadius: 3, mb: 2, boxShadow: 1, p: 2, position: 'relative', border: '1.5px solid #e6eaf0', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4, background: '#f5faff' } }}
              onClick={e => {
                // Only trigger if not clicking an action button
                if (e.target.closest('.trip-action-btn')) return;
                navigate(`/trips/${trip.id}`);
              }}
            >
              <CardMedia
                component="img"
                height="100"
                image={trip.image || 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg'}
                alt={trip.destination}
                sx={{
                  objectFit: 'cover',
                  borderRadius: 2.5,
                  position: 'relative',
                  maxWidth: 160,
                  minWidth: 120,
                  width: '100%',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))',
                  }
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{trip.name || 'Trip'}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7b8794', fontSize: 15, mt: 0.5 }}>
                  <span style={{ background: '#f5f6fa', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, marginRight: 6 }}>L</span>
                  {trip.startDate && trip.endDate ? (
                    <span>{dayjs(trip.startDate).format('MMM D')} – {dayjs(trip.endDate).format('MMM D')}{dayjs(trip.startDate).year() !== dayjs(trip.endDate).year() ? `, ${dayjs(trip.endDate).year()}` : ''}</span>
                  ) : (
                    <span>No dates</span>
                  )}
                  <span style={{ margin: '0 8px' }}>•</span>
                  <span>0 places</span>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <IconButton className="trip-action-btn" color="primary" onClick={e => { e.stopPropagation(); navigate(`/trip/${trip.id}`); }} title="View Details"><VisibilityIcon /></IconButton>
                <IconButton className="trip-action-btn" color="success" onClick={e => { e.stopPropagation(); setInviteTripId(trip.id); }} title="Share / Invite"><PersonAddIcon /></IconButton>
                <IconButton className="trip-action-btn" color="error" onClick={e => { e.stopPropagation(); handleDelete(trip.id); }} title="Delete Trip"><DeleteIcon /></IconButton>
              </Box>
            </Box>
          ))}
        </List>
      )}
      {/* Join Trip Card */}
      <Box sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: 1, p: 2.5, mb: 3, border: '1.5px solid #e6eaf0', mt: 4 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Join a Trip with Invite Code</Typography>
        <form onSubmit={handleJoinTrip} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 0 }}>
          <TextField
            label="Invite Code"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            required
            sx={{ minWidth: 180, borderRadius: 3, bgcolor: '#f7f9fb', boxShadow: '0 1px 4px rgba(71,181,255,0.07)', '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
            size="small"
            InputProps={{ style: { borderRadius: 16, background: '#f7f9fb' } }}
          />
          <Button type="submit" variant="contained" disabled={joinLoading} sx={{ borderRadius: 999, fontWeight: 700, px: 3, height: 44, minWidth: 110, fontSize: 16, boxShadow: '0 2px 8px rgba(71,181,255,0.10)', bgcolor: '#2563eb', '&:hover': { bgcolor: '#47b5ff' } }}>
            {joinLoading ? 'Joining...' : 'JOIN TRIP'}
          </Button>
        </form>
        {joinError && <Typography color="error" sx={{ mt: 1 }}>{joinError}</Typography>}
        {joinSuccess && <Typography color="success.main" sx={{ mt: 1 }}>{joinSuccess}</Typography>}
      </Box>
      {/* Joined Trips Section */}
      {joinedTrips.length > 0 && <Divider sx={{ my: 3 }} />}
      {joinedTrips.length > 0 && (
        <List sx={{ p: 0 }}>
          {joinedTrips.map(trip => (
            <Box
              key={trip.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#fff', borderRadius: 3, mb: 2, boxShadow: 1, p: 2, position: 'relative', border: '1.5px solid #e6eaf0', cursor: 'pointer', transition: 'box-shadow 0.2s', '&:hover': { boxShadow: 4, background: '#f5faff' } }}
              onClick={e => {
                // Only trigger if not clicking an action button
                if (e.target.closest('.trip-action-btn')) return;
                navigate(`/trips/${trip.id}`);
              }}
            >
              <CardMedia
                component="img"
                height="100"
                image={trip.image || 'https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg'}
                alt={trip.destination}
                sx={{
                  objectFit: 'cover',
                  borderRadius: 2.5,
                  position: 'relative',
                  maxWidth: 160,
                  minWidth: 120,
                  width: '100%',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))',
                  }
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{trip.name || 'Trip'}</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#7b8794', fontSize: 15, mt: 0.5 }}>
                  <span style={{ background: '#f5f6fa', borderRadius: '50%', width: 24, height: 24, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, marginRight: 6 }}>L</span>
                  {trip.startDate && trip.endDate ? (
                    <span>{dayjs(trip.startDate).format('MMM D')} – {dayjs(trip.endDate).format('MMM D')}{dayjs(trip.startDate).year() !== dayjs(trip.endDate).year() ? `, ${dayjs(trip.endDate).year()}` : ''}</span>
                  ) : (
                    <span>No dates</span>
                  )}
                  <span style={{ margin: '0 8px' }}>•</span>
                  <span>0 places</span>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <IconButton className="trip-action-btn" color="primary" onClick={e => { e.stopPropagation(); navigate(`/trip/${trip.id}`); }} title="View Details"><VisibilityIcon /></IconButton>
                <IconButton className="trip-action-btn" color="error" onClick={e => { e.stopPropagation(); handleLeaveTrip(trip.id); }} title="Leave Trip"><ExitToAppIcon /></IconButton>
              </Box>
            </Box>
          ))}
        </List>
      )}
      {/* Invite Member Modal (reuse your existing modal, pass tripId=inviteTripId) */}
      <Dialog open={!!inviteTripId} onClose={() => setInviteTripId(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Invite Member</DialogTitle>
        <IconButton onClick={() => setInviteTripId(null)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        <DialogContent>
          <Tabs value={inviteTab} onChange={(_, v) => setInviteTab(v)} sx={{ mb: 2 }}>
            <Tab label="By Email" />
            <Tab label="One-Time Code" />
          </Tabs>
          {inviteTab === 0 ? (
            <>
              <TextField
                label="Email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                fullWidth
                required
                sx={{ mt: 2 }}
              />
              {inviteError && <Typography color="error" sx={{ mt: 1 }}>{inviteError}</Typography>}
            </>
          ) : (
            <>
              <Button
                variant="contained"
                onClick={handleGenerateCode}
                disabled={codeLoading}
                sx={{ borderRadius: 999, mt: 2 }}
              >
                {codeLoading ? 'Generating...' : 'Generate One-Time Code'}
              </Button>
              {generatedCode && (
                <Box sx={{ mt: 3, bgcolor: '#f5f5f5', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{generatedCode}</Typography>
                  <IconButton size="small" onClick={() => navigator.clipboard.writeText(generatedCode)}><ContentCopyIcon fontSize="small" /></IconButton>
                </Box>
              )}
              {inviteError && <Typography color="error" sx={{ mt: 1 }}>{inviteError}</Typography>}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteTripId(null)}>Cancel</Button>
          {inviteTab === 0 && (
            <Button onClick={handleInvite} variant="contained" disabled={inviteLoading}>
              {inviteLoading ? 'Inviting...' : 'Invite'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      <TripCreateModal open={showTripModal} onClose={() => setShowTripModal(false)} />
    </Box>
  );
}

// TripDetailsPage Component
const TripDetailsPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editedTrip, setEditedTrip] = useState(null);
  const [newActivity, setNewActivity] = useState({ title: '', date: '', description: '' });
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const tripRef = doc(db, 'trips', id);
    const unsubscribe = onSnapshot(tripRef, (doc) => {
      if (doc.exists()) {
        setTrip(doc.data());
        setEditedTrip(doc.data());
        setActivities(doc.data().activities || []);
      } else {
        setError('Trip not found');
      }
      setLoading(false);
    }, (error) => {
      setError('Error loading trip: ' + error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, user, navigate]);

  const handleSaveTrip = async () => {
    try {
      const tripRef = doc(db, 'trips', id);
      await updateDoc(tripRef, editedTrip);
      setEditMode(false);
    } catch (error) {
      setError('Error updating trip: ' + error.message);
    }
  };

  const handleAddActivity = async () => {
    if (!newActivity.title || !newActivity.date) {
      setError('Title and date are required');
      return;
    }

    try {
      const tripRef = doc(db, 'trips', id);
      const updatedActivities = [...activities, { ...newActivity, id: Date.now().toString() }];
      await updateDoc(tripRef, { activities: updatedActivities });
      setActivities(updatedActivities);
      setNewActivity({ title: '', date: '', description: '' });
    } catch (error) {
      setError('Error adding activity: ' + error.message);
    }
  };

  const handleEditActivity = async (activityId, updatedActivity) => {
    try {
      const tripRef = doc(db, 'trips', id);
      const updatedActivities = activities.map(activity => 
        activity.id === activityId ? { ...activity, ...updatedActivity } : activity
      );
      await updateDoc(tripRef, { activities: updatedActivities });
      setActivities(updatedActivities);
    } catch (error) {
      setError('Error updating activity: ' + error.message);
    }
  };

  const handleDeleteActivity = async (activityId) => {
    try {
      const tripRef = doc(db, 'trips', id);
      const updatedActivities = activities.filter(activity => activity.id !== activityId);
      await updateDoc(tripRef, { activities: updatedActivities });
      setActivities(updatedActivities);
    } catch (error) {
      setError('Error deleting activity: ' + error.message);
    }
  };

  // Get coordinates from trip.place if available
  let coords = [20, 0]; // default world view
  let placeName = '';
  if (trip && trip.place && trip.place.lat && trip.place.lon) {
    coords = [parseFloat(trip.place.lat), parseFloat(trip.place.lon)];
    placeName = trip.place.display_name || '';
  }

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!trip) return <div>Trip not found</div>;

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card sx={{ p: 4, mb: 4 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 2, color: '#2563eb' }}>{trip.title}</Typography>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>Destination: <b>{trip.destination}</b></Typography>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Start Date: {dayjs(trip.startDate).format('MMMM D, YYYY')}</Typography>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>End Date: {dayjs(trip.endDate).format('MMMM D, YYYY')}</Typography>
            {editMode ? (
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                <TextField label="Title" value={editedTrip.title} onChange={e => setEditedTrip({ ...editedTrip, title: e.target.value })} sx={{ minWidth: 180 }} />
                <TextField label="Destination" value={editedTrip.destination} onChange={e => setEditedTrip({ ...editedTrip, destination: e.target.value })} sx={{ minWidth: 180 }} />
                <TextField label="Start Date" type="date" value={editedTrip.startDate} onChange={e => setEditedTrip({ ...editedTrip, startDate: e.target.value })} sx={{ minWidth: 180 }} InputLabelProps={{ shrink: true }} />
                <TextField label="End Date" type="date" value={editedTrip.endDate} onChange={e => setEditedTrip({ ...editedTrip, endDate: e.target.value })} sx={{ minWidth: 180 }} InputLabelProps={{ shrink: true }} />
                <Button onClick={handleSaveTrip} variant="contained" sx={{ mt: 1 }}>Save</Button>
                <Button onClick={() => setEditMode(false)} sx={{ mt: 1 }}>Cancel</Button>
              </Box>
            ) : (
              <Button onClick={() => setEditMode(true)} variant="outlined" sx={{ mb: 2 }}>Edit Trip</Button>
            )}
          </Card>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#2563eb', mb: 2 }}>Members</Typography>
            <List>
              {Object.entries(trip.members || {}).map(([key, member]) => (
                <ListItem key={key}>
                  <ListItemText primary={member.email} secondary={member.role} />
                </ListItem>
              ))}
            </List>
          </Paper>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#2563eb', mb: 2 }}>Add New Activity</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
              <TextField label="Title" value={newActivity.title} onChange={e => setNewActivity({ ...newActivity, title: e.target.value })} sx={{ minWidth: 120 }} />
              <TextField label="Date" type="date" value={newActivity.date} onChange={e => setNewActivity({ ...newActivity, date: e.target.value })} sx={{ minWidth: 120 }} InputLabelProps={{ shrink: true }} />
              <TextField label="Description" value={newActivity.description} onChange={e => setNewActivity({ ...newActivity, description: e.target.value })} sx={{ minWidth: 180 }} />
              <Button onClick={handleAddActivity} variant="contained">Add Activity</Button>
            </Box>
          </Paper>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ color: '#2563eb', mb: 2 }}>Activities</Typography>
            <List>
              {activities.map(activity => (
                <ListItem key={activity.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', mb: 2, bgcolor: '#f5faff', borderRadius: 2 }}>
                  <Box sx={{ width: '100%' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{activity.title}</Typography>
                    <Typography variant="body2" sx={{ color: '#888' }}>{dayjs(activity.date).format('MMMM D, YYYY')}</Typography>
                    <Typography variant="body2" sx={{ mb: 1 }}>{activity.description}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button size="small" variant="outlined" onClick={() => handleEditActivity(activity.id, { title: 'Updated Title' })}>Edit</Button>
                    <Button size="small" color="error" variant="outlined" onClick={() => handleDeleteActivity(activity.id)}>Delete</Button>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: '100%', minHeight: 400, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
            <Typography variant="h6" sx={{ color: '#2563eb', mb: 2 }}>Trip Location</Typography>
            <Box sx={{ flex: 1, minHeight: 340, borderRadius: 3, overflow: 'hidden', mt: 1 }}>
              <MapContainer center={coords} zoom={coords[0] === 20 && coords[1] === 0 ? 2 : 10} style={{ height: 340, width: '100%', borderRadius: 16, boxShadow: '0 4px 24px rgba(71,181,255,0.10)' }} scrollWheelZoom={true}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {coords[0] !== 20 && coords[1] !== 0 && (
                  <Marker position={coords} icon={bigMarkerIcon}>
                    <Popup>{placeName || 'Trip Location'}</Popup>
                  </Marker>
                )}
              </MapContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

// Add the DayPlanCard component after TripItineraryPage
function DayPlanCard({ tripId, day, userId }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activityForm, setActivityForm] = useState({
    name: '',
    time: '',
    type: '',
    location: '',
    duration: '',
    durationUnit: 'minutes',
    cost: '',
    participants: [],
    priority: '',
    status: '',
    confirmation: '',
    website: '',
    attachment: '',
    reminder: false,
    notes: '',
    id: ''
  });
  const [editIdx, setEditIdx] = useState(null);
  const [members, setMembers] = useState([]);
  const dayId = day.format('YYYY-MM-DD');

  useEffect(() => {
    setLoading(true);
    setError('');
    const unsub = onSnapshot(
      doc(collection(db, 'trips', tripId, 'days'), dayId),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setTitle(data.title || '');
          setNotes(data.notes || '');
          setActivities(data.activities || []);
        } else {
          setTitle('');
          setNotes('');
          setActivities([]);
        }
        setLoading(false);
      },
      (err) => {
        setError('Error loading day: ' + err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tripId, dayId]);

  // Fetch trip members for participants field
  useEffect(() => {
    const tripRef = doc(db, 'trips', tripId);
    const unsub = onSnapshot(tripRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.members) {
          setMembers(Object.values(data.members));
        }
      }
    });
    return () => unsub();
  }, [tripId]);

  const handleActivityChange = (field, value) => {
    setActivityForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAttachment = (e) => {
    if (e.target.files && e.target.files[0]) {
      setActivityForm((prev) => ({ ...prev, attachment: e.target.files[0].name }));
    }
  };

  const handleAddOrEditActivity = (e) => {
    e.preventDefault();
    if (!activityForm.name) return;
    if (editIdx !== null) {
      // Edit
      const updated = [...activities];
      updated[editIdx] = { ...activityForm };
      setActivities(updated);
      setEditIdx(null);
    } else {
      setActivities((prev) => [
        ...prev,
        { ...activityForm, id: Date.now().toString() },
      ]);
    }
    setActivityForm({
      name: '', time: '', type: '', location: '', duration: '', durationUnit: 'minutes', cost: '', participants: [], priority: '', status: '', confirmation: '', website: '', attachment: '', reminder: false, notes: '', id: ''
    });
  };

  const handleEdit = (idx) => {
    setEditIdx(idx);
    setActivityForm(activities[idx]);
  };

  const handleDelete = (idx) => {
    setActivities((prev) => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) {
      setEditIdx(null);
      setActivityForm({ name: '', time: '', type: '', location: '', duration: '', durationUnit: 'minutes', cost: '', participants: [], priority: '', status: '', confirmation: '', website: '', attachment: '', reminder: false, notes: '', id: '' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await setDoc(
        doc(collection(db, 'trips', tripId, 'days'), dayId),
        {
          title,
          notes,
          activities,
          userId,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    } catch (err) {
      setError('Error saving: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Paper sx={{ p: 3, borderRadius: 4, minHeight: 200 }}>Loading...</Paper>;

  return (
    <Paper sx={{ mb: 3, borderRadius: 4, boxShadow: 2, p: 3, bgcolor: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{day.format('dddd, MMMM D')}</Typography>
      </Box>
      <TextField
        variant="standard"
        placeholder="Add title"
        fullWidth
        sx={{ mb: 1, fontWeight: 600 }}
        value={title}
        onChange={e => setTitle(e.target.value)}
      />
      <TextField
        variant="outlined"
        placeholder="Write or paste notes here"
        fullWidth
        multiline
        minRows={2}
        sx={{ mb: 2 }}
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      {/* Activities List */}
      <List>
        {activities.length ? activities.map((act, idx) => (
          <ListItem key={act.id || idx} sx={{ bgcolor: '#f5faff', borderRadius: 2, mb: 1, boxShadow: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexDirection: 'column' }}>
            <Box sx={{ width: '100%' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{act.name} {act.time && <span>({act.time})</span>}</Typography>
              <Typography variant="body2" sx={{ color: '#888' }}>{act.type} {act.location && `| ${act.location}`}</Typography>
              <Typography variant="body2">{act.duration && `Duration: ${act.duration} ${act.durationUnit}`}{act.cost && ` | Cost: ₹${act.cost}`}</Typography>
              <Typography variant="body2">{act.status && `Status: ${act.status}`} {act.priority && `| Priority: ${act.priority}`}</Typography>
              <Typography variant="body2">{act.participants && act.participants.length > 0 && `Participants: ${act.participants.map(p => p.email || p).join(', ')}`}</Typography>
              <Typography variant="body2">{act.confirmation && `Confirmation: ${act.confirmation}`}</Typography>
              <Typography variant="body2">{act.website && <a href={act.website} target="_blank" rel="noopener noreferrer">Website</a>}</Typography>
              <Typography variant="body2">{act.attachment && `Attachment: ${act.attachment}`}</Typography>
              <Typography variant="body2">{act.reminder ? '🔔 Reminder set' : ''}</Typography>
              <Typography variant="body2" sx={{ color: '#555', mt: 0.5 }}>{act.notes}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
              <IconButton edge="end" color="primary" onClick={() => handleEdit(idx)}><EditIcon /></IconButton>
              <IconButton edge="end" color="error" onClick={() => handleDelete(idx)}><DeleteIcon /></IconButton>
            </Box>
          </ListItem>
        )) : <Typography sx={{ color: '#bbb', fontSize: 15, mt: 1 }}>No items for this day.</Typography>}
      </List>
      {/* Add/Edit Activity Form */}
      <Box component="form" onSubmit={handleAddOrEditActivity} sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField
          placeholder="Name"
          value={activityForm.name}
          onChange={e => handleActivityChange('name', e.target.value)}
          required
          size="small"
          sx={{ minWidth: 120 }}
        />
        <TextField
          placeholder="Time"
          type="time"
          value={activityForm.time}
          onChange={e => handleActivityChange('time', e.target.value)}
          size="small"
          sx={{ minWidth: 100 }}
          InputLabelProps={{ shrink: true }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select
            value={activityForm.type}
            label="Type"
            onChange={e => handleActivityChange('type', e.target.value)}
          >
            <MenuItem value="Sightseeing">Sightseeing</MenuItem>
            <MenuItem value="Food">Food</MenuItem>
            <MenuItem value="Hotel">Hotel</MenuItem>
            <MenuItem value="Transport">Transport</MenuItem>
            <MenuItem value="Shopping">Shopping</MenuItem>
            <MenuItem value="Adventure">Adventure</MenuItem>
            <MenuItem value="Relaxation">Relaxation</MenuItem>
            <MenuItem value="Meeting">Meeting</MenuItem>
            <MenuItem value="Event">Event</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </Select>
        </FormControl>
        <TextField
          placeholder="Location"
          value={activityForm.location}
          onChange={e => handleActivityChange('location', e.target.value)}
          size="small"
          sx={{ minWidth: 120 }}
        />
        <TextField
          placeholder="Duration"
          value={activityForm.duration}
          onChange={e => handleActivityChange('duration', e.target.value)}
          size="small"
          sx={{ minWidth: 80 }}
          type="number"
          inputProps={{ min: 0 }}
        />
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel>Unit</InputLabel>
          <Select
            value={activityForm.durationUnit}
            label="Unit"
            onChange={e => handleActivityChange('durationUnit', e.target.value)}
          >
            <MenuItem value="minutes">Minutes</MenuItem>
            <MenuItem value="hours">Hours</MenuItem>
          </Select>
        </FormControl>
        <TextField
          placeholder="Cost"
          value={activityForm.cost}
          onChange={e => handleActivityChange('cost', e.target.value)}
          size="small"
          sx={{ minWidth: 80 }}
          type="number"
          inputProps={{ min: 0 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Priority</InputLabel>
          <Select
            value={activityForm.priority}
            label="Priority"
            onChange={e => handleActivityChange('priority', e.target.value)}
          >
            <MenuItem value="High">High</MenuItem>
            <MenuItem value="Medium">Medium</MenuItem>
            <MenuItem value="Low">Low</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={activityForm.status}
            label="Status"
            onChange={e => handleActivityChange('status', e.target.value)}
          >
            <MenuItem value="Planned">Planned</MenuItem>
            <MenuItem value="Booked">Booked</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Participants</InputLabel>
          <Select
            multiple
            value={activityForm.participants}
            onChange={e => handleActivityChange('participants', e.target.value)}
            renderValue={selected => selected.map(p => p.email || p).join(', ')}
          >
            {members.map((m, i) => (
              <MenuItem key={i} value={m.email || m.id}>
                <Checkbox checked={activityForm.participants.indexOf(m.email || m.id) > -1} />
                <ListItemText primary={m.email || m.id} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          placeholder="Confirmation/Booking Info"
          value={activityForm.confirmation}
          onChange={e => handleActivityChange('confirmation', e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
        />
        <TextField
          placeholder="Website/Link"
          value={activityForm.website}
          onChange={e => handleActivityChange('website', e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
          type="url"
        />
        <Button
          variant="outlined"
          component="label"
          size="small"
          sx={{ minWidth: 120 }}
        >
          Upload Attachment
          <input type="file" hidden onChange={handleAttachment} />
        </Button>
        <FormControlLabel
          control={<Checkbox checked={activityForm.reminder} onChange={e => handleActivityChange('reminder', e.target.checked)} />}
          label="Set Reminder"
          sx={{ minWidth: 120 }}
        />
        <TextField
          placeholder="Notes"
          value={activityForm.notes}
          onChange={e => handleActivityChange('notes', e.target.value)}
          size="small"
          sx={{ minWidth: 140 }}
        />
        <Button type="submit" variant="contained" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>
          {editIdx !== null ? 'Update' : 'Add'}
        </Button>
      </Box>
      <Button
        variant="contained"
        color="primary"
        sx={{ borderRadius: 999, mt: 3, fontWeight: 700, px: 4, py: 1.2, fontSize: 16 }}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? 'Saving...' : 'Save Day Plan'}
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
    </Paper>
  );
}

// Add ChatMessage component above TripItineraryPage
function ChatMessage({ msg, currentUserEmail }) {
  const [name, setName] = React.useState(userNameCache[msg.sender] || '');
  React.useEffect(() => {
    if (!name) {
      getUserFirstName(msg.sender).then(setName);
    }
  }, [msg.sender, name]);
  const color = getUserColor(msg.sender);
  const isMe = msg.sender === currentUserEmail;
  const initials = (name ? name[0] : (msg.sender?.split('@')[0][0] || 'U')).toUpperCase();
  return (
    <Box sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 1.5, mb: 0.5 }}>
      <Avatar sx={{ bgcolor: color, width: 32, height: 32, fontWeight: 700, fontSize: 15 }}>{initials}</Avatar>
      <Box sx={{ maxWidth: '70%', minWidth: 60, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
          <Typography sx={{ fontWeight: 700, color: color, fontSize: 13, textTransform: 'capitalize' }}>{name || msg.sender?.split('@')[0] || 'User'}</Typography>
          <Typography sx={{ color: '#888', fontSize: 11 }}>{msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Typography>
        </Box>
        <Box sx={{
          bgcolor: isMe ? '#2563eb' : '#fff',
          color: isMe ? '#fff' : '#222',
          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          p: 1.2,
          px: 2,
          fontSize: 15,
          boxShadow: isMe ? '0 2px 8px rgba(37,99,235,0.08)' : '0 2px 8px rgba(71,181,255,0.06)',
          mt: 0.2,
          wordBreak: 'break-word',
          minWidth: 40,
        }}>
          {msg.text}
        </Box>
      </Box>
    </Box>
  );
}

// Add TeamMembersSidebar above TripItineraryPage
function TeamMembersSidebar({ members, currentUserEmail }) {
  const [displayNames, setDisplayNames] = React.useState({});
  React.useEffect(() => {
    async function fetchNames() {
      const names = {};
      for (const m of members) {
        names[m.id] = await getDisplayName(m);
      }
      setDisplayNames(names);
    }
    fetchNames();
  }, [members]);
  return (
    <Box sx={{ width: 360, minWidth: 360, bgcolor: '#f7f9fb', borderRight: '1.5px solid #e6eaf0', height: '100vh', p: 0, display: 'flex', flexDirection: 'column' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 2, color: '#223a5f', letterSpacing: 0.5 }}>Team Members</Typography>
      {members.map((m, idx) => {
        const color = getUserColor(m);
        const initials = (displayNames[m.id] ? displayNames[m.id][0] : (m.email || m.id)[0] || '').toUpperCase();
        return (
          <Box key={m.id || idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, p: 1, borderRadius: 2, bgcolor: (m.email === currentUserEmail) ? '#e0f7fa' : 'transparent' }}>
            <Avatar sx={{ bgcolor: color, width: 36, height: 36, fontWeight: 700, fontSize: 18 }}>{initials}</Avatar>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#223a5f', textTransform: 'capitalize' }}>{displayNames[m.id] || m.email?.split('@')[0] || m.id}</Typography>
              <Typography sx={{ color: '#888', fontSize: 12 }}>{m.email}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Navbar />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/main" element={<MainPage />} />
          <Route path="/my-details" element={<MyDetailsPage />} />
          <Route path="/itinerary-builder" element={<ItineraryBuilderPage />} />
          <Route path="/trips/:tripId" element={<TripItineraryPage />} />
          <Route path="/my-trips" element={<MyTripsPage />} />
          <Route path="/trip/:id" element={<TripDetailsPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
