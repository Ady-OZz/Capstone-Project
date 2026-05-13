import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { addDoc, collection, updateDoc, doc, arrayUnion } from 'firebase/firestore';
import { TextField, IconButton, FormControl, Select, MenuItem, Autocomplete } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PeopleIcon from '@mui/icons-material/People';
import PublicIcon from '@mui/icons-material/Public';
import LockIcon from '@mui/icons-material/Lock';

export default function TripCreateModal({ open, onClose, onCreated }) {
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
