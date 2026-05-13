import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Tabs,
    Tab,
    Box,
    Card,
    CardContent,
    Button,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Divider,
    Chip,
    Avatar,
    Stack,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import dayjs from 'dayjs';

function currency(value) {
    if (value === null || value === undefined || value === '') return '₹0';
    const num = Number(String(value).replace(/[^\d.]/g, ''));
    if (Number.isNaN(num)) return `₹${value}`;
    return `₹${num.toFixed(0)}`;
}

function sanitizeMemberKey(email) {
    return String(email || '').trim().toLowerCase().replace(/[^a-z0-9_@.-]/g, '_');
}

export default function TripItineraryPage() {
    const { tripId } = useParams();
    const navigate = useNavigate();

    const [tab, setTab] = useState(0);
    const [loadingTrip, setLoadingTrip] = useState(true);
    const [trip, setTrip] = useState(null);
    const [activities, setActivities] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [messages, setMessages] = useState([]);

    const [messageText, setMessageText] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteStatus, setInviteStatus] = useState('');

    const [expenseOpen, setExpenseOpen] = useState(false);
    const [expenseTitle, setExpenseTitle] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');
    const [expenseCategory, setExpenseCategory] = useState('General');
    const [expenseDate, setExpenseDate] = useState(dayjs().format('YYYY-MM-DD'));

    const [editDatesOpen, setEditDatesOpen] = useState(false);
    const [editStartDate, setEditStartDate] = useState('');
    const [editEndDate, setEditEndDate] = useState('');

    useEffect(() => {
        if (!tripId) return;
        setLoadingTrip(true);
        const unsub = onSnapshot(doc(db, 'trips', tripId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setTrip({ id: snap.id, ...data });
                setEditStartDate(data.startDate || '');
                setEditEndDate(data.endDate || '');
            } else {
                setTrip(null);
            }
            setLoadingTrip(false);
        });
        return () => unsub();
    }, [tripId]);

    useEffect(() => {
        if (!tripId) return;
        const q = query(collection(db, 'itineraryItems'), where('tripId', '==', tripId), orderBy('date', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setActivities(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [tripId]);

    useEffect(() => {
        if (!tripId) return;
        const q = query(collection(db, 'tripExpenses'), where('tripId', '==', tripId), orderBy('date', 'desc'));
        const unsub = onSnapshot(q, (snap) => {
            setExpenses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [tripId]);

    useEffect(() => {
        if (!tripId) return;
        const q = query(collection(db, 'trips', tripId, 'chat'), orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, [tripId]);

    const members = useMemo(() => {
        return Object.entries(trip?.members || {}).map(([id, value]) => ({ id, ...value }));
    }, [trip]);

    const totalSpent = useMemo(() => {
        return expenses.reduce((sum, expense) => sum + (Number(String(expense.amount).replace(/[^\d.]/g, '')) || 0), 0);
    }, [expenses]);

    const groupedActivities = useMemo(() => {
        const groups = new Map();
        activities.forEach((item) => {
            const key = item.date ? dayjs(item.date).format('YYYY-MM-DD') : 'Unscheduled';
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(item);
        });
        return Array.from(groups.entries());
    }, [activities]);

    const handleSendMessage = async() => {
        if (!messageText.trim()) return;
        await addDoc(collection(db, 'trips', tripId, 'chat'), {
            text: messageText.trim(),
            sender: auth.currentUser?.email || 'Anonymous',
            createdAt: serverTimestamp(),
        });
        setMessageText('');
    };

    const handleAddExpense = async() => {
        if (!expenseTitle.trim() || !expenseAmount.trim()) return;
        await addDoc(collection(db, 'tripExpenses'), {
            tripId,
            title: expenseTitle.trim(),
            category: expenseCategory,
            amount: Number(expenseAmount),
            date: expenseDate,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser?.email || 'Anonymous',
        });
        setExpenseTitle('');
        setExpenseAmount('');
        setExpenseCategory('General');
        setExpenseDate(dayjs().format('YYYY-MM-DD'));
        setExpenseOpen(false);
    };

    const handleDeleteExpense = async(expenseId) => {
        await deleteDoc(doc(db, 'tripExpenses', expenseId));
    };

    const handleSaveDates = async() => {
        if (!tripId) return;
        await updateDoc(doc(db, 'trips', tripId), {
            startDate: editStartDate,
            endDate: editEndDate,
            updatedAt: serverTimestamp(),
        });
        setEditDatesOpen(false);
    };

    const handleInvite = async() => {
        if (!inviteEmail.trim()) return;
        const key = sanitizeMemberKey(inviteEmail);
        await updateDoc(doc(db, 'trips', tripId), {
            [`members.${key}`]: {
                role: 'contributor',
                email: inviteEmail.trim(),
            },
            updatedAt: serverTimestamp(),
        });
        setInviteStatus('Collaborator added.');
        setInviteEmail('');
        setTimeout(() => setInviteStatus(''), 3000);
    };

    const handleRemoveMember = async(memberKey) => {
        if (!window.confirm('Remove this collaborator from the trip?')) return;
        const nextMembers = {...(trip?.members || {}) };
        delete nextMembers[memberKey];
        await updateDoc(doc(db, 'trips', tripId), { members: nextMembers, updatedAt: serverTimestamp() });
    };

    const handleDeleteChatMessage = async(messageId) => {
        await deleteDoc(doc(db, 'trips', tripId, 'chat', messageId));
    };

    if (loadingTrip) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f7f9fb' }}>
                <Typography variant="h5" sx={{ fontWeight: 700, color: '#223a5f' }}> Loading trip... </Typography>
            </Box>
        );
    }

    if (!trip) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f7f9fb', p: 3 }}>
                <Card sx={{ maxWidth: 520, width: '100%', borderRadius: 4, boxShadow: 3 }}>
                    <CardContent>
                        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}> Trip not found </Typography>
                        <Typography sx={{ color: '#64748b', mb: 3 }}> The trip may have been deleted or the link is invalid. </Typography>
                        <Button variant="contained" onClick={() => navigate('/my-trips')}> Back to My Trips </Button>
                    </CardContent>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#eef6fb' }}>
            <AppBar position="sticky" elevation={0} sx={{ bgcolor: '#fff', color: '#223a5f', borderBottom: '1px solid #e5eef5' }}>
                <Toolbar sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ flex: 1, minWidth: 220 }}>
                        <Typography variant="h6" sx={{ fontWeight: 800 }}> {trip.name || 'Trip'} </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {trip.startDate ? dayjs(trip.startDate).format('MMM D, YYYY') : 'Start date not set'}– {trip.endDate ? dayjs(trip.endDate).format('MMM D, YYYY') : 'End date not set'}
                        </Typography>
                    </Box>
                    <Button variant="outlined" onClick={() => navigate('/my-trips')}> My Trips </Button>
                    <Button variant="contained" onClick={() => setEditDatesOpen(true)}> Edit Dates </Button>
                </Toolbar>
            </AppBar>

            <Box sx={{ px: { xs: 2, md: 4 }, py: 3, maxWidth: 1400, mx: 'auto' }}>
                <Card sx={{ borderRadius: 4, mb: 3, overflow: 'hidden' }}>
                    <CardContent>
                        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
                            <Avatar src={trip.photoUrl} sx={{ width: 84, height: 84, bgcolor: '#ff715b' }}> {trip.name?.[0] || 'T'} </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h4" sx={{ fontWeight: 800, color: '#223a5f' }}> {trip.name || 'Trip'} </Typography>
                                <Typography sx={{ color: '#64748b', mt: 0.5 }}> {trip.place?.display_name || 'Location not set'} </Typography>
                                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                    <Chip label={`${members.length} members`} />
                                    <Chip label={`${activities.length} itinerary items`} />
                                    <Chip label={`${expenses.length} expenses`} />
                                    {trip.privacy && <Chip label={trip.privacy} />}
                                </Stack>
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>

                <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 2 }} variant="scrollable" scrollButtons="auto">
                    <Tab label="Overview" />
                    <Tab label="Budget" />
                    <Tab label="Chat" />
                    <Tab label="Collaborators" />
                    <Tab label="Settings" />
                </Tabs>

                {tab === 0 && (
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#223a5f' }}> Itinerary Overview </Typography>
                            {groupedActivities.length === 0 ? (
                                <Typography sx={{ color: '#64748b' }}> No itinerary items yet. </Typography>
                            ) : (
                                groupedActivities.map(([dateKey, items]) => (
                                    <Box key={dateKey} sx={{ mb: 3 }}>
                                        <Typography sx={{ fontWeight: 700, color: '#2563eb', mb: 1 }}>
                                            {dateKey === 'Unscheduled' ? dateKey : dayjs(dateKey).format('dddd, MMMM D, YYYY')}
                                        </Typography>
                                        <List sx={{ bgcolor: '#f8fbff', borderRadius: 3 }}>
                                            {items.map((item) => (
                                                <React.Fragment key={item.id}>
                                                    <ListItem alignItems="flex-start">
                                                        <ListItemText
                                                            primary={<Typography sx={{ fontWeight: 700, color: '#223a5f' }}> {item.title || item.name || 'Activity'} </Typography>}
                                                            secondary={
                                                                <>
                                                                    <Typography component="span" variant="body2" sx={{ color: '#64748b' }}>
                                                                        {item.type || 'Activity'} {item.location ? ` | ${item.location}` : ''}
                                                                    </Typography>
                                                                    {item.cost ? (
                                                                        <Typography component="span" variant="body2" sx={{ display: 'block', color: '#64748b' }}>
                                                                            {currency(item.cost)}
                                                                        </Typography>
                                                                    ) : null}
                                                                </>
                                                            }
                                                        />
                                                    </ListItem>
                                                    <Divider />
                                                </React.Fragment>
                                            ))}
                                        </List>
                                    </Box>
                                ))
                            )}
                        </CardContent>
                    </Card>
                )}

                {tab === 1 && (
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                                <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#223a5f' }}> Budget </Typography>
                                    <Typography sx={{ color: '#64748b' }}> Track all trip expenses in ₹ </Typography>
                                </Box>
                                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setExpenseOpen(true)}> Add Expense </Button>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
                                <Card sx={{ minWidth: 220, flex: '1 1 220px', borderRadius: 3 }}>
                                    <CardContent>
                                        <Typography sx={{ color: '#64748b' }}> Total Spent </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#223a5f' }}> {currency(totalSpent)} </Typography>
                                    </CardContent>
                                </Card>
                                <Card sx={{ minWidth: 220, flex: '1 1 220px', borderRadius: 3 }}>
                                    <CardContent>
                                        <Typography sx={{ color: '#64748b' }}> Trip Budget </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 800, color: '#223a5f' }}> {trip.budget ? currency(trip.budget) : 'Not set'} </Typography>
                                    </CardContent>
                                </Card>
                            </Box>

                            <List sx={{ bgcolor: '#f8fbff', borderRadius: 3 }}>
                                {expenses.length === 0 ? (
                                    <ListItem>
                                        <ListItemText primary="No expenses yet." secondary="Add your first expense to start tracking." />
                                    </ListItem>
                                ) : (
                                    expenses.map((expense) => (
                                        <React.Fragment key={expense.id}>
                                            <ListItem secondaryAction={
                                                <IconButton edge="end" color="error" onClick={() => handleDeleteExpense(expense.id)}>
                                                    <DeleteIcon />
                                                </IconButton>
                                            }>
                                                <ListItemText
                                                    primary={`${currency(expense.amount)} - ${expense.title || expense.category || 'Expense'}`}
                                                    secondary={`${expense.category || 'General'}${expense.date ? ` • ${dayjs(expense.date).format('MMM D, YYYY')}` : ''}`}
                                                />
                                            </ListItem>
                                            <Divider />
                                        </React.Fragment>
                                    ))
                                )}
                            </List>
                        </CardContent>
                    </Card>
                )}

                {tab === 2 && (
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#223a5f', mb: 2 }}>Chat</Typography>
                            <Box sx={{ display: 'grid', gap: 1.5, mb: 2, maxHeight: 420, overflowY: 'auto', pr: 1 }}>
                                {messages.length === 0 ? (
                                    <Typography sx={{ color: '#64748b' }}>No messages yet. Start the conversation!</Typography>
                                ) : (
                                    messages.map((msg) => (
                                        <Card key={msg.id} sx={{ borderRadius: 3 }}>
                                            <CardContent>
                                                <Typography sx={{ fontWeight: 700, color: '#223a5f' }}>{msg.sender || 'Anonymous'}</Typography>
                                                <Typography sx={{ color: '#334155' }}>{msg.text}</Typography>
                                                <Typography sx={{ color: '#94a3b8', fontSize: 12, mt: 1 }}>
                                                    {msg.createdAt?.seconds ? dayjs(msg.createdAt.seconds * 1000).format('MMM D, YYYY h:mm A') : ''}
                                                </Typography>
                                                {msg.sender === auth.currentUser?.email && (
                                                    <Button size="small" color="error" onClick={() => handleDeleteChatMessage(msg.id)} sx={{ mt: 1 }}>Delete</Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </Box>

                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <TextField
                                    fullWidth
                                    label="Write a message"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    multiline
                                    minRows={2}
                                />
                                <Button variant="contained" onClick={handleSendMessage}>Send</Button>
                            </Box>
                        </CardContent>
                    </Card>
                )}

                {tab === 3 && (
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#223a5f', mb: 2 }}>Collaborators</Typography>
                            <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3 }}>
                                <TextField fullWidth label="Invite collaborator by email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                                <Button variant="contained" onClick={handleInvite} sx={{ minWidth: 140 }}>Add Member</Button>
                            </Stack>
                            {inviteStatus && <Typography sx={{ color: '#16a34a', mb: 2, fontWeight: 600 }}>{inviteStatus}</Typography>}

                            <List sx={{ bgcolor: '#f8fbff', borderRadius: 3 }}>
                                {members.length === 0 ? (
                                    <ListItem><ListItemText primary="No collaborators yet." /></ListItem>
                                ) : (
                                    members.map((member) => (
                                        <React.Fragment key={member.id}>
                                            <ListItem secondaryAction={
                                                member.id !== auth.currentUser?.uid && (
                                                    <Button color="error" onClick={() => handleRemoveMember(member.id)}>Remove</Button>
                                                )
                                            }>
                                                <Avatar sx={{ mr: 2, bgcolor: '#47b5ff' }}>{(member.email || member.id || 'U')[0].toUpperCase()}</Avatar>
                                                <ListItemText primary={member.email || member.id} secondary={member.role || 'member'} />
                                            </ListItem>
                                            <Divider />
                                        </React.Fragment>
                                    ))
                                )}
                            </List>
                        </CardContent>
                    </Card>
                )}

                {tab === 4 && (
                    <Card sx={{ borderRadius: 4 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#223a5f', mb: 2 }}>Settings</Typography>
                            <Box sx={{ display: 'grid', gap: 2, maxWidth: 560 }}>
                                <TextField label="Trip name" value={trip.name || ''} disabled />
                                <TextField label="Start date" value={trip.startDate || ''} disabled />
                                <TextField label="End date" value={trip.endDate || ''} disabled />
                                <TextField label="Location" value={trip.place?.display_name || ''} disabled />
                                <Button variant="contained" onClick={() => setEditDatesOpen(true)}>Edit dates</Button>
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </Box>

            <Dialog open={expenseOpen} onClose={() => setExpenseOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Add Expense</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
                    <TextField label="Title" value={expenseTitle} onChange={(e) => setExpenseTitle(e.target.value)} fullWidth />
                    <TextField label="Amount (₹)" type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} fullWidth />
                    <TextField label="Category" value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} fullWidth />
                    <TextField label="Date" type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExpenseOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleAddExpense}>Save</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={editDatesOpen} onClose={() => setEditDatesOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle>Edit Trip Dates</DialogTitle>
                <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
                    <TextField label="Start date" type="date" value={editStartDate} onChange={(e) => setEditStartDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                    <TextField label="End date" type="date" value={editEndDate} onChange={(e) => setEditEndDate(e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditDatesOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSaveDates}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
