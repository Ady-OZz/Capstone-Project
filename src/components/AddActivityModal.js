import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, TextField, FormControl, InputLabel, Select, MenuItem, DialogActions, Button, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { db } from '../firebase';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';

export default function AddActivityModal({ open, onClose, tripId, selectedDay, activity, onSave }) {
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
