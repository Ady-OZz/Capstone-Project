import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import AITripFlow, { TRENDING_TRIPS } from '../AITripFlow';

function LandingPage() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [prefillTrip, setPrefillTrip] = useState(null);
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeMsg, setSubscribeMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
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
              href="https://youtu.be/D_Yaajod-og"
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
          <div className="destination-card" onClick={() => { setPrefillTrip(TRENDING_TRIPS[0]); setShowAIModal(true); }} style={{cursor:'pointer'}}>
            <img src="https://images.pexels.com/photos/1051075/pexels-photo-1051075.jpeg" alt="Goa" />
            <div className="dest-info">
              <h4>Goa, India</h4>
              <p>₹15,000</p>
              <span>7 Days Trip</span>
            </div>
          </div>
          <div className="destination-card" onClick={() => { setPrefillTrip(TRENDING_TRIPS[2]); setShowAIModal(true); }} style={{cursor:'pointer'}}>
            <img src="https://images.pexels.com/photos/674010/pexels-photo-674010.jpeg" alt="Jaipur" />
            <div className="dest-info">
              <h4>Jaipur, Rajasthan</h4>
              <p>₹12,000</p>
              <span>5 Days Trip</span>
            </div>
          </div>
          <div className="destination-card" onClick={() => { setPrefillTrip(TRENDING_TRIPS[5]); setShowAIModal(true); }} style={{cursor:'pointer'}}>
            <img src="https://images.pexels.com/photos/417173/pexels-photo-417173.jpeg" alt="Kerala" />
            <div className="dest-info">
              <h4>Kerala, India</h4>
              <p>₹18,000</p>
              <span>8 Days Trip</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3-Step Booking + Vapi AI Assistant ─────────────────────────────── */}
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
      <section className="testimonials-section">
        <h5 className="section-tag">TESTIMONIALS</h5>
        <h2 className="section-title">What people say about Us.</h2>
        <div className="testimonials-carousel">
          <div className="testimonial-card">
            <p>"Jravel made planning my family trip so easy! The itinerary builder and group chat features are a game changer. Highly recommended for anyone who loves to travel hassle-free."</p>
            <h4>Mohd Sajjad Zakir</h4>
          </div>
          <div className="testimonial-card">
            <p>"I found the best destinations and managed my travel budget all in one place. The platform is super intuitive and the support team is very responsive. Will use again!"</p>
            <h4>Akshat Singh Parmar</h4>
          </div>
        </div>
      </section>

      {/* Trending AI Trip Picks */}
      <section style={{ padding: '60px 5vw', background: '#f8faff' }}>
        <h5 style={{ color: '#ff715b', fontWeight: 700, letterSpacing: 2, marginBottom: 8, fontSize: '0.85rem' }}>AI PICKS</h5>
        <h2 style={{ fontWeight: 800, fontSize: '2rem', color: '#223a5f', marginBottom: 8 }}>Trending Trips Right Now</h2>
        <p style={{ color: '#64748b', marginBottom: 32, maxWidth: 500 }}>Curated destinations our AI recommends — click any card to generate a personalised itinerary instantly.</p>
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
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.13)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}
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
          <span>All rights reserved ©2026 Jravel.co</span>
        </div>
      </footer>

      <AITripFlow open={showAIModal} onClose={() => { setShowAIModal(false); setPrefillTrip(null); }} prefillTrip={prefillTrip} />
    </>
  );
}

export default LandingPage;
