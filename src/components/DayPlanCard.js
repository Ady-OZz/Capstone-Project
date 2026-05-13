import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, List, ListItem, ListItemText, IconButton, Button, FormControl, InputLabel, Select, MenuItem, Paper, Checkbox, FormControlLabel } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { db } from '../firebase';
import { doc, collection, onSnapshot, setDoc } from 'firebase/firestore';

export default function DayPlanCard({ tripId, day, userId }) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activityForm, setActivityForm] = useState({
    name: '', time: '', type: '', location: '', duration: '', durationUnit: 'minutes',
    cost: '', participants: [], priority: '', status: '', confirmation: '', website: '',
    attachment: '', reminder: false, notes: '', id: ''
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
          setTitle(''); setNotes(''); setActivities([]);
        }
        setLoading(false);
      },
      (err) => { setError('Error loading day: ' + err.message); setLoading(false); }
    );
    return () => unsub();
  }, [tripId, dayId]);

  useEffect(() => {
    const tripRef = doc(db, 'trips', tripId);
    const unsub = onSnapshot(tripRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.members) setMembers(Object.values(data.members));
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
      const updated = [...activities];
      updated[editIdx] = { ...activityForm };
      setActivities(updated);
      setEditIdx(null);
    } else {
      setActivities((prev) => [...prev, { ...activityForm, id: Date.now().toString() }]);
    }
    setActivityForm({ name: '', time: '', type: '', location: '', duration: '', durationUnit: 'minutes', cost: '', participants: [], priority: '', status: '', confirmation: '', website: '', attachment: '', reminder: false, notes: '', id: '' });
  };

  const handleEdit = (idx) => { setEditIdx(idx); setActivityForm(activities[idx]); };

  const handleDelete = (idx) => {
    setActivities((prev) => prev.filter((_, i) => i !== idx));
    if (editIdx === idx) {
      setEditIdx(null);
      setActivityForm({ name: '', time: '', type: '', location: '', duration: '', durationUnit: 'minutes', cost: '', participants: [], priority: '', status: '', confirmation: '', website: '', attachment: '', reminder: false, notes: '', id: '' });
    }
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      await setDoc(doc(collection(db, 'trips', tripId, 'days'), dayId), { title, notes, activities, userId, updatedAt: new Date() }, { merge: true });
    } catch (err) { setError('Error saving: ' + err.message); } finally { setSaving(false); }
  };

  if (loading) return <Paper sx={{ p: 3, borderRadius: 4, minHeight: 200 }}>Loading...</Paper>;

  return (
    <Paper sx={{ mb: 3, borderRadius: 4, boxShadow: 2, p: 3, bgcolor: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{day.format('dddd, MMMM D')}</Typography>
      </Box>
      <TextField variant="standard" placeholder="Add title" fullWidth sx={{ mb: 1, fontWeight: 600 }} value={title} onChange={e => setTitle(e.target.value)} />
      <TextField variant="outlined" placeholder="Write or paste notes here" fullWidth multiline minRows={2} sx={{ mb: 2 }} value={notes} onChange={e => setNotes(e.target.value)} />
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
      <Box component="form" onSubmit={handleAddOrEditActivity} sx={{ display: 'flex', gap: 2, mt: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <TextField placeholder="Name" value={activityForm.name} onChange={e => handleActivityChange('name', e.target.value)} required size="small" sx={{ minWidth: 120 }} />
        <TextField placeholder="Time" type="time" value={activityForm.time} onChange={e => handleActivityChange('time', e.target.value)} size="small" sx={{ minWidth: 100 }} InputLabelProps={{ shrink: true }} />
        <FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>Type</InputLabel><Select value={activityForm.type} label="Type" onChange={e => handleActivityChange('type', e.target.value)}>
          <MenuItem value="Sightseeing">Sightseeing</MenuItem><MenuItem value="Food">Food</MenuItem><MenuItem value="Hotel">Hotel</MenuItem><MenuItem value="Transport">Transport</MenuItem><MenuItem value="Shopping">Shopping</MenuItem><MenuItem value="Adventure">Adventure</MenuItem><MenuItem value="Relaxation">Relaxation</MenuItem><MenuItem value="Meeting">Meeting</MenuItem><MenuItem value="Event">Event</MenuItem><MenuItem value="Other">Other</MenuItem>
        </Select></FormControl>
        <TextField placeholder="Location" value={activityForm.location} onChange={e => handleActivityChange('location', e.target.value)} size="small" sx={{ minWidth: 120 }} />
        <TextField placeholder="Duration" value={activityForm.duration} onChange={e => handleActivityChange('duration', e.target.value)} size="small" sx={{ minWidth: 80 }} type="number" inputProps={{ min: 0 }} />
        <FormControl size="small" sx={{ minWidth: 80 }}><InputLabel>Unit</InputLabel><Select value={activityForm.durationUnit} label="Unit" onChange={e => handleActivityChange('durationUnit', e.target.value)}><MenuItem value="minutes">Minutes</MenuItem><MenuItem value="hours">Hours</MenuItem></Select></FormControl>
        <TextField placeholder="Cost" value={activityForm.cost} onChange={e => handleActivityChange('cost', e.target.value)} size="small" sx={{ minWidth: 80 }} type="number" inputProps={{ min: 0 }} />
        <FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>Priority</InputLabel><Select value={activityForm.priority} label="Priority" onChange={e => handleActivityChange('priority', e.target.value)}><MenuItem value="High">High</MenuItem><MenuItem value="Medium">Medium</MenuItem><MenuItem value="Low">Low</MenuItem></Select></FormControl>
        <FormControl size="small" sx={{ minWidth: 120 }}><InputLabel>Status</InputLabel><Select value={activityForm.status} label="Status" onChange={e => handleActivityChange('status', e.target.value)}><MenuItem value="Planned">Planned</MenuItem><MenuItem value="Booked">Booked</MenuItem><MenuItem value="Completed">Completed</MenuItem><MenuItem value="Cancelled">Cancelled</MenuItem></Select></FormControl>
        <FormControl size="small" sx={{ minWidth: 160 }}><InputLabel>Participants</InputLabel><Select multiple value={activityForm.participants} onChange={e => handleActivityChange('participants', e.target.value)} renderValue={selected => selected.map(p => p.email || p).join(', ')}>
          {members.map((m, i) => (<MenuItem key={i} value={m.email || m.id}><Checkbox checked={activityForm.participants.indexOf(m.email || m.id) > -1} /><ListItemText primary={m.email || m.id} /></MenuItem>))}
        </Select></FormControl>
        <TextField placeholder="Confirmation/Booking Info" value={activityForm.confirmation} onChange={e => handleActivityChange('confirmation', e.target.value)} size="small" sx={{ minWidth: 140 }} />
        <TextField placeholder="Website/Link" value={activityForm.website} onChange={e => handleActivityChange('website', e.target.value)} size="small" sx={{ minWidth: 140 }} type="url" />
        <Button variant="outlined" component="label" size="small" sx={{ minWidth: 120 }}>Upload Attachment<input type="file" hidden onChange={handleAttachment} /></Button>
        <FormControlLabel control={<Checkbox checked={activityForm.reminder} onChange={e => handleActivityChange('reminder', e.target.checked)} />} label="Set Reminder" sx={{ minWidth: 120 }} />
        <TextField placeholder="Notes" value={activityForm.notes} onChange={e => handleActivityChange('notes', e.target.value)} size="small" sx={{ minWidth: 140 }} />
        <Button type="submit" variant="contained" sx={{ borderRadius: 999, fontWeight: 700, px: 3 }}>{editIdx !== null ? 'Update' : 'Add'}</Button>
      </Box>
      <Button variant="contained" color="primary" sx={{ borderRadius: 999, mt: 3, fontWeight: 700, px: 4, py: 1.2, fontSize: 16 }} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving...' : 'Save Day Plan'}
      </Button>
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}
    </Paper>
  );
}
