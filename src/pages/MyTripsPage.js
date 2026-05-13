import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { getDoc, doc, getDocs, deleteDoc, collection, query, where, updateDoc, arrayUnion, arrayRemove, addDoc } from 'firebase/firestore';
import { Box, Typography, Button, List, IconButton, CardMedia, Divider, Dialog, DialogTitle, DialogContent, Tabs, Tab, DialogActions, TextField } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteIcon from '@mui/icons-material/Delete';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import dayjs from 'dayjs';
import TripCreateModal from '../components/TripCreateModal';

export default function MyTripsPage() {
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
      {/* Invite Member Modal */}
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
