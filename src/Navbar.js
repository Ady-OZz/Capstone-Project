import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from './firebase';

function Navbar() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setUser(u));
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  return (
    <nav className="navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '0 2vw', minHeight: 72 }}>
      <Link to="/" className="logo" style={{ fontWeight: 800, fontSize: 32, color: '#222', textDecoration: 'none', letterSpacing: 1, marginRight: 24 }}>Jravel</Link>
      {user ? (
        <ul className="nav-links" style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap', margin: 0, padding: 0, listStyle: 'none' }}>
          <li><Link to="/main" className="nav-btn">Book</Link></li>
          <li><Link to="/itinerary-builder" className="nav-btn">Plan</Link></li>
          <li><Link to="/my-trips" className="nav-btn">My Trips</Link></li>
          <li><Link to="/my-details" className="nav-link">My Details</Link></li>
          <li><button onClick={handleLogout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#222', fontWeight: 500 }}>Logout</button></li>
          <li><span className="nav-link" style={{ fontWeight: 600, border: '1px solid #eee', borderRadius: 8, padding: '2px 12px', marginLeft: 4 }}>EN</span></li>
        </ul>
      ) : (
        <ul className="nav-links" style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', flexWrap: 'wrap', margin: 0, padding: 0, listStyle: 'none' }}>
          <li><Link to="/login" className="nav-btn">Login</Link></li>
          <li><Link to="/login" className="nav-btn" style={{ background: '#fff', color: '#2563eb', border: '2px solid #2563eb' }}>Sign Up</Link></li>
        </ul>
      )}
    </nav>
  );
}

export default Navbar; 