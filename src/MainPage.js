import React, { useEffect, useMemo, useState } from 'react';
import './MainPage.css';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

const tabs = [
  { label: 'Flights', icon: '✈️' },
  { label: 'Hotels', icon: '🏨' },
  { label: 'Trains', icon: '🚄' },
];

const AIRLINES = [
  { name: 'IndiGo', url: 'https://www.goindigo.in', logo: '🔵' },
  { name: 'Air India', url: 'https://www.airindia.com', logo: '🔴' },
  { name: 'SpiceJet', url: 'https://www.spicejet.com', logo: '🟠' },
  { name: 'Vistara', url: 'https://www.airvistara.com', logo: '🟣' },
];

function getHotelBookingUrl(city) {
  return `https://www.makemytrip.com/hotels/hotel-listing/#cityCode=${encodeURIComponent(city.toLowerCase())}`;
}

const INR_RATE = 84;

function usdToInrLabel(usd) {
  const inr = Math.round(usd * INR_RATE);
  return `₹${inr.toLocaleString('en-IN')}`;
}

function MainPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [userName, setUserName] = useState('');

  const [flightOrigin, setFlightOrigin] = useState('DEL');
  const [flightDestination, setFlightDestination] = useState('BOM');
  const [flightDate, setFlightDate] = useState('');
  const [flightResults, setFlightResults] = useState([]);
  const [flightLoading, setFlightLoading] = useState(false);
  const [flightError, setFlightError] = useState('');

  const [hotelCity, setHotelCity] = useState('Goa');
  const [hotelCheckIn, setHotelCheckIn] = useState('');
  const [hotelCheckOut, setHotelCheckOut] = useState('');
  const [hotelRooms, setHotelRooms] = useState(1);
  const [hotelGuests, setHotelGuests] = useState(2);
  const [hotelResults, setHotelResults] = useState([]);
  const [hotelLoading, setHotelLoading] = useState(false);
  const [hotelError, setHotelError] = useState('');

  const [trainStationName, setTrainStationName] = useState('New Delhi');
  const [trainResults, setTrainResults] = useState([]);
  const [trainLoading, setTrainLoading] = useState(false);
  const [trainError, setTrainError] = useState('');

  const minDate = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setUserName('');
        return;
      }
      const ref = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
        setUserName(fullName || u.displayName || u.email || '');
      } else {
        setUserName(u.displayName || u.email || '');
      }
    });
    return () => unsub();
  }, []);

  function fetchFlights(e) {
    e.preventDefault();
    setFlightError('');
    setFlightLoading(true);

    if (!flightOrigin || !flightDestination || !flightDate) {
      setFlightError('Please fill all flight search fields');
      setFlightLoading(false);
      return;
    }

    const prices = [5200, 6100, 4800, 7200];
    const times = ['06:10 - 08:25', '11:35 - 13:50', '16:00 - 18:20', '20:10 - 22:30'];
    setFlightResults(
      AIRLINES.map((airline, idx) => ({
        id: `${airline.name}-${idx}`,
        airline: airline.name,
        logo: airline.logo,
        flightNumber: `${['6E', 'AI', 'SG', 'UK'][idx]}-${200 + idx * 3}`,
        departure: flightOrigin,
        arrival: flightDestination,
        time: times[idx],
        price: `₹${prices[idx].toLocaleString('en-IN')}`,
        bookingUrl: airline.url,
      }))
    );
    setFlightLoading(false);
  }

  function fetchHotels(e) {
    e.preventDefault();
    setHotelError('');
    setHotelLoading(true);

    if (!hotelCity || !hotelCheckIn || !hotelCheckOut) {
      setHotelError('Please enter city and both dates');
      setHotelLoading(false);
      return;
    }

    const samplesUsd = [40, 89, 148];
    setHotelResults([
      {
        location_id: 'h1',
        name: `Grand Hotel, ${hotelCity}`,
        price: usdToInrLabel(samplesUsd[0]),
        rating: '4.2',
        photo: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg',
        web_url: getHotelBookingUrl(hotelCity),
      },
      {
        location_id: 'h2',
        name: `Palace Inn, ${hotelCity}`,
        price: usdToInrLabel(samplesUsd[1]),
        rating: '4.5',
        photo: 'https://images.pexels.com/photos/271624/pexels-photo-271624.jpeg',
        web_url: getHotelBookingUrl(hotelCity),
      },
      {
        location_id: 'h3',
        name: `City Suites, ${hotelCity}`,
        price: usdToInrLabel(samplesUsd[2]),
        rating: '4.8',
        photo: 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg',
        web_url: getHotelBookingUrl(hotelCity),
      },
    ]);

    setHotelLoading(false);
  }

  function fetchTrains(e) {
    e.preventDefault();
    setTrainError('');
    setTrainLoading(true);

    if (!trainStationName.trim()) {
      setTrainError('Please enter a station name');
      setTrainLoading(false);
      return;
    }

    setTrainResults([
      { train_number: '12952', train_name: 'Rajdhani Express', source: trainStationName, destination: 'Mumbai Central', scharr: '08:40', schdep: '08:50', platform: '3' },
      { train_number: '12260', train_name: 'Duronto Express', source: trainStationName, destination: 'Howrah', scharr: '14:20', schdep: '14:30', platform: '5' },
      { train_number: '12618', train_name: 'Mangala Lakshadweep', source: trainStationName, destination: 'Ernakulam', scharr: '21:15', schdep: '21:25', platform: '2' },
    ]);

    setTrainLoading(false);
  }

  return (
    <div className="main-bg">
      <div className="main-content">
        {userName && (
          <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '18px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '2rem', color: '#223a5f', letterSpacing: '0.5px' }}>Welcome, {userName}!</h2>
          </div>
        )}

        <div className="main-tabs">
          {tabs.map((tab, idx) => (
            <button key={tab.label} className={`main-tab${activeTab === idx ? ' active' : ''}`} onClick={() => setActiveTab(idx)}>
              <span className="main-tab-icon">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="main-search-card">
          {activeTab === 0 && (
            <>
              <form className="main-search-form" onSubmit={fetchFlights}>
                <div className="main-search-row">
                  <div className="main-search-field">
                    <label>From (IATA Code)</label>
                    <input type="text" value={flightOrigin} onChange={(e) => setFlightOrigin(e.target.value.toUpperCase())} placeholder="DEL" />
                  </div>
                  <div className="main-search-field">
                    <label>To (IATA Code)</label>
                    <input type="text" value={flightDestination} onChange={(e) => setFlightDestination(e.target.value.toUpperCase())} placeholder="BOM" />
                  </div>
                  <div className="main-search-field">
                    <label>Departure Date</label>
                    <input type="date" min={minDate} value={flightDate} onChange={(e) => setFlightDate(e.target.value)} />
                  </div>
                </div>
                <button className="main-search-btn" type="submit" disabled={flightLoading}>{flightLoading ? 'Searching...' : 'SEARCH FLIGHTS'}</button>
              </form>
              {flightError && <div style={{ color: '#ff715b', marginTop: 8 }}>{flightError}</div>}
              <div className="flight-results">
                {flightResults.map((flight) => (
                  <div className="flight-card" key={flight.id}>
                    <div className="flight-info">
                      <div className="flight-airline">{flight.logo} {flight.airline} ({flight.flightNumber})</div>
                      <div className="flight-route">{flight.departure} → {flight.arrival}</div>
                      <div className="flight-time">{flight.time}</div>
                      <div className="flight-price">{flight.price}</div>
                      <a href={flight.bookingUrl} target="_blank" rel="noopener noreferrer">
                        <button className="hotel-book-btn">Book Now</button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 1 && (
            <>
              <form className="main-search-form" onSubmit={fetchHotels}>
                <div className="main-search-row">
                  <div className="main-search-field">
                    <label>City, Property Name Or Location</label>
                    <input type="text" value={hotelCity} onChange={(e) => setHotelCity(e.target.value)} />
                  </div>
                  <div className="main-search-field">
                    <label>Check-In</label>
                    <input type="date" min={minDate} value={hotelCheckIn} onChange={(e) => setHotelCheckIn(e.target.value)} />
                  </div>
                  <div className="main-search-field">
                    <label>Check-Out</label>
                    <input type="date" min={minDate} value={hotelCheckOut} onChange={(e) => setHotelCheckOut(e.target.value)} />
                  </div>
                  <div className="main-search-field">
                    <label>Rooms</label>
                    <input type="number" min="1" value={hotelRooms} onChange={(e) => setHotelRooms(e.target.value)} />
                  </div>
                  <div className="main-search-field">
                    <label>Guests</label>
                    <input type="number" min="1" value={hotelGuests} onChange={(e) => setHotelGuests(e.target.value)} />
                  </div>
                </div>
                <button className="main-search-btn" type="submit" disabled={hotelLoading}>{hotelLoading ? 'Searching...' : 'SEARCH HOTELS'}</button>
              </form>
              {hotelError && <div style={{ color: '#ff715b', marginTop: 8 }}>{hotelError}</div>}
              <div className="hotel-results">
                {hotelResults.map((hotel) => (
                  <div className="hotel-card" key={hotel.location_id}>
                    <img src={hotel.photo} alt={hotel.name} className="hotel-img" />
                    <div className="hotel-info">
                      <div className="hotel-name">{hotel.name}</div>
                      <div className="hotel-price">{hotel.price}</div>
                      <div className="hotel-rating">Rating: {hotel.rating}</div>
                      <a href={hotel.web_url || getHotelBookingUrl(hotelCity)} target="_blank" rel="noopener noreferrer">
                        <button className="hotel-book-btn">Book Now</button>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 2 && (
            <>
              <form className="main-search-form" onSubmit={fetchTrains}>
                <div className="main-search-row">
                  <div className="main-search-field">
                    <label>Station Name</label>
                    <input type="text" value={trainStationName} onChange={(e) => setTrainStationName(e.target.value)} placeholder="New Delhi" />
                  </div>
                </div>
                <button className="main-search-btn" type="submit" disabled={trainLoading}>{trainLoading ? 'Searching...' : 'SEARCH TRAINS'}</button>
              </form>
              {trainError && <div style={{ color: '#ff715b', marginTop: 8 }}>{trainError}</div>}
              <div className="train-results">
                {trainResults.map((train) => (
                  <div className="train-card" key={train.train_number}>
                    <div className="train-name">{train.train_name} ({train.train_number})</div>
                    <div className="train-route">From: {train.source} To: {train.destination}</div>
                    <div className="train-time">Scheduled: {train.scharr} - {train.schdep}</div>
                    <div className="train-platform">Platform: {train.platform || 'N/A'}</div>
                    <a href="https://www.irctc.co.in/nget/train-search" target="_blank" rel="noopener noreferrer">
                      <button className="hotel-book-btn" style={{ marginTop: 8 }}>Book on IRCTC</button>
                    </a>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainPage;
