import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, Box, TextField, FormControl, InputLabel, Select, MenuItem, DialogActions, Button, Typography } from '@mui/material';
import dayjs from 'dayjs';
import { db } from '../firebase';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';

export default function BudgetModal({ open, onClose, tripId, expense, onSave }) {
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
            InputProps={{ startAdornment: <span style={{marginRight:6,fontSize:16,fontWeight:600,color:"#555"}}>₹</span> }}
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
