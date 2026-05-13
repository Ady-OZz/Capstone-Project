import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { Container, Grid, Card, Typography, Box, TextField, Button, Paper, List, ListItem, ListItemText } from '@mui/material';
import dayjs from 'dayjs';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { bigMarkerIcon } from '../utils';

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

export default TripDetailsPage;
