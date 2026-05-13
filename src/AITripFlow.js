import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Grid,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const TRENDING_TRIPS = [
    { id: 1, destination: 'Goa', emoji: '🏖️', tag: 'BEACH VIBES', duration: '5 Days', estimated_cost: '₹18,000', vibe: 'Beach', budget: '₹15k-₹40k' },
    { id: 2, destination: 'Manali', emoji: '🏔️', tag: 'MOUNTAIN ESCAPE', duration: '6 Days', estimated_cost: '₹22,000', vibe: 'Mountain', budget: '₹15k-₹40k' },
    { id: 3, destination: 'Jaipur', emoji: '🏯', tag: 'CULTURAL TRAIL', duration: '4 Days', estimated_cost: '₹12,000', vibe: 'Cultural', budget: '₹5k-₹15k' },
    { id: 4, destination: 'Coorg', emoji: '🌿', tag: 'HIDDEN GEM', duration: '3 Days', estimated_cost: '₹9,000', vibe: 'Adventure', budget: '₹5k-₹15k' },
    { id: 5, destination: 'Udaipur', emoji: '🌅', tag: 'ROMANTIC ESCAPE', duration: '4 Days', estimated_cost: '₹20,000', vibe: 'Romantic', budget: '₹15k-₹40k' },
    { id: 6, destination: 'Kerala Backwaters', emoji: '🚤', tag: 'SERENE GETAWAY', duration: '7 Days', estimated_cost: '₹35,000', vibe: 'Luxury', budget: '₹15k-₹40k' },
];

const FALLBACK_TRIPS = {
    Beach: [
        { dest: 'Goa', cost: '₹18,500', desc: 'Beaches, nightlife, seafood paradise' },
        { dest: 'Pondicherry', cost: '₹14,000', desc: 'French quarters and serene beaches' },
        { dest: 'Andaman Islands', cost: '₹45,000', desc: 'Crystal clear waters and coral reefs' },
        { dest: 'Varkala', cost: '₹12,000', desc: 'Cliff beaches with stunning sunset views' },
    ],
    Mountain: [
        { dest: 'Manali', cost: '₹21,000', desc: 'Snow peaks, river rafting and Rohtang Pass' },
        { dest: 'Darjeeling', cost: '₹16,000', desc: 'Tea gardens and Himalayan sunrise' },
        { dest: 'Munnar', cost: '₹14,500', desc: 'Rolling tea estates and misty hills' },
        { dest: 'Spiti Valley', cost: '₹28,000', desc: 'Remote high-altitude desert valleys' },
    ],
    Cultural: [
        { dest: 'Jaipur', cost: '₹11,000', desc: 'Pink City palaces and Rajasthani cuisine' },
        { dest: 'Varanasi', cost: '₹9,500', desc: 'Ancient ghats and spiritual ceremonies' },
        { dest: 'Hampi', cost: '₹10,000', desc: 'Ruins of Vijayanagara empire' },
        { dest: 'Mysore', cost: '₹8,500', desc: 'Heritage palaces and silk weaving' },
    ],
    Adventure: [
        { dest: 'Rishikesh', cost: '₹8,000', desc: 'Rafting, bungee jumping and yoga' },
        { dest: 'Coorg', cost: '₹9,000', desc: 'Trekking through coffee plantations' },
        { dest: 'Ladakh', cost: '₹38,000', desc: "Bike rides on world's highest passes" },
        { dest: 'Meghalaya', cost: '₹22,000', desc: 'Living root bridges and cave exploration' },
    ],
    Romantic: [
        { dest: 'Udaipur', cost: '₹19,500', desc: 'City of lakes and royal palaces' },
        { dest: 'Ooty', cost: '₹13,000', desc: 'Toy train rides and rose gardens' },
        { dest: 'Alleppey', cost: '₹16,000', desc: 'Houseboat cruise on backwaters' },
        { dest: 'Shimla', cost: '₹14,000', desc: 'Colonial hill station with snow walks' },
    ],
    Budget: [
        { dest: 'Pushkar', cost: '₹6,000', desc: 'Camel fair town with sacred lake' },
        { dest: 'Hampi', cost: '₹7,500', desc: 'Backpacker paradise with ruins' },
        { dest: 'McLeod Ganj', cost: '₹8,500', desc: 'Tibetan culture and mountain hikes' },
        { dest: 'Pondicherry', cost: '₹9,000', desc: 'Budget beach town with French vibe' },
    ],
    Luxury: [
        { dest: 'Kerala Backwaters', cost: '₹55,000', desc: 'Private houseboat and Ayurveda spa' },
        { dest: 'Ranthambore', cost: '₹48,000', desc: 'Tiger safari in luxury tented camps' },
        { dest: 'Goa (North)', cost: '₹42,000', desc: '5-star beachfront resorts and spas' },
        { dest: 'Jim Corbett', cost: '₹38,000', desc: 'Luxury wildlife lodges and safaris' },
    ],
};

const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY;
const GEMINI_URL = GEMINI_API_KEY ?
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}` :
    null;

async function callGemini(prompt) {
    if (!GEMINI_URL) return null;
    try {
        const res = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
            }),
        });
        if (!res.ok) {
            console.warn('Gemini API HTTP error:', res.status, res.statusText);
            return null;
        }
        const data = await res.json();
        const candidate = data?.candidates?.[0];
        if (!candidate || candidate.finishReason === 'SAFETY') return null;
        const text = candidate?.content?.parts?.[0]?.text || '';
        if (!text) return null;
        const jsonMatch = text.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (!jsonMatch) return null;
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        console.warn('Gemini API failed, using fallback:', e.message);
        return null;
    }
}

function buildSuggestionPrompt(vibe, duration, fromCity, budget) {
    return `You are a travel planning AI for Indian travelers. 
User wants: ${vibe} trip, ${duration} days, departing from ${fromCity}, budget ${budget}.

Return ONLY valid JSON (no markdown, no preamble) - an array of exactly 4 trip objects:
[
  {
    "destination": "City Name, State",
    "emoji": "relevant emoji",
    "estimated_cost": "₹XX,XXX",
    "duration": "${duration} Days",
    "highlight": "One catchy line",
    "description": "2-3 sentences about why this is perfect for the user's vibe and budget",
    "best_time": "Month range",
    "top_activities": ["activity1", "activity2", "activity3"]
  }
]

Rules:
- All costs in ₹ (Indian Rupees), never use $ or USD
- Destinations must be in India
- Costs must fit within the budget range: ${budget}
- Make each destination distinct and genuinely exciting`;
}

function buildItineraryPrompt(trip, vibe, fromCity) {
    return `You are a detailed travel itinerary planner for Indian travelers.
Create a day-by-day itinerary for: ${trip.destination}, ${trip.duration}, from ${fromCity}, ${vibe} vibe.

Return ONLY valid JSON (no markdown, no preamble):
{
  "destination": "${trip.destination}",
  "duration": "${trip.duration}",
  "estimated_cost": "${trip.estimated_cost}",
  "days": [
    {
      "day": 1,
      "title": "Arrival & First Impressions",
      "morning": "Activity description",
      "afternoon": "Activity description", 
      "evening": "Activity description",
      "food_tip": "Local dish or restaurant tip",
    "cost_estimate": "₹X,XXX"
    }
  ],
  "packing_tips": ["tip1", "tip2", "tip3"],
  "local_tips": ["tip1", "tip2"],
  "total_cost_breakdown": {
    "transport": "₹X,XXX",
    "accommodation": "₹X,XXX",
    "food": "₹X,XXX",
    "activities": "₹X,XXX"
  }
}

Rules:
- All prices in ₹ only, never $ or USD
- Day count must match: ${trip.duration}
- Include genuine, specific local tips
- Morning/afternoon/evening must be distinct activities`;
}

function getBookingUrls(destination) {
    const city = destination.split(',')[0].trim().toLowerCase().replace(/\s+/g, '-');
    return {
        flights: 'https://www.makemytrip.com/flights/',
        hotels: `https://www.makemytrip.com/hotels/hotel-listing/#cityCode=${encodeURIComponent(city)}`,
        trains: 'https://www.irctc.co.in/nget/train-search',
    };
}

function getDurationDays(durationLabel) {
    const parsed = parseInt(String(durationLabel).match(/\d+/)?.[0] || '5', 10);
    return Number.isFinite(parsed) ? parsed : 5;
}

async function handleSaveTrip(itinerary, user, navigate) {
    if (!user) {
        alert('Please log in to save your trip');
        return;
    }

    let parsedBudget = 0;
    try {
        const costStr = String(itinerary.estimated_cost || '').toLowerCase().replace(/,/g, '');
        const matches = [...costStr.matchAll(/(\d+)(k?)/g)];
        if (matches.length > 0) {
            const lastMatch = matches[matches.length - 1];
            parsedBudget = parseFloat(lastMatch[1]) * (lastMatch[2] === 'k' ? 1000 : 1);
        }
    } catch (e) {
        parsedBudget = 0;
    }

    const tripRef = await addDoc(collection(db, 'trips'), {
        name: itinerary.destination,
        destination: itinerary.destination,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + ((itinerary.days && itinerary.days.length ? itinerary.days.length - 1 : 2) * 86400000)).toISOString().split('T')[0],
        photoUrl: `https://source.unsplash.com/800x400/?${encodeURIComponent(itinerary.destination)},travel`,
        createdAt: serverTimestamp(),
        members: {
            [user.uid]: { role: 'admin', email: user.email }
        },
        budget: parsedBudget,
        aiGenerated: true,
    });

    const tripStart = new Date();
    for (const day of itinerary.days || []) {
        const dayDate = new Date(tripStart);
        dayDate.setDate(tripStart.getDate() + (day.day - 1));
        const dateStr = dayDate.getFullYear() + '-' +
            String(dayDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(dayDate.getDate()).padStart(2, '0');

        const slots = [
            { title: day.morning || 'Morning activity', time: '09:00', type: 'Sightseeing', label: 'Morning' },
            { title: day.afternoon || 'Afternoon activity', time: '13:00', type: 'Sightseeing', label: 'Afternoon' },
            { title: day.evening || 'Evening activity', time: '18:00', type: 'Sightseeing', label: 'Evening' },
        ];
        if (day.food_tip) {
            slots.push({ title: day.food_tip, time: '12:30', type: 'Restaurant', label: 'Food Tip' });
        }

        for (const slot of slots) {
            await addDoc(collection(db, 'itineraryItems'), {
                tripId: tripRef.id,
                title: slot.label + ': ' + slot.title,
                type: slot.type,
                date: dateStr + 'T' + slot.time,
                notes: 'Day ' + day.day + ': ' + day.title,
                day: day.day,
            });
        }

        await setDoc(
            doc(db, 'trips', tripRef.id, 'days', dateStr),
            {
                title: 'Day ' + day.day,
                notes: day.food_tip ? 'Food tip: ' + day.food_tip : '',
                activities: [
                    {
                        name: day.title || 'Morning Activity',
                        time: '09:00',
                        type: 'Sightseeing',
                        location: itinerary.destination || '',
                        duration: '60',
                        durationUnit: 'minutes',
                        cost: day.cost_estimate || '',
                        participants: [user.email],
                        priority: 'High',
                        status: 'Planned',
                        confirmation: '',
                        website: '',
                        attachment: '',
                        reminder: false,
                        notes: 'Morning: ' + (day.morning || ''),
                        id: String(Date.now()) + '-morning-' + day.day
                    },
                    {
                        name: 'Afternoon Exploration',
                        time: '13:00',
                        type: 'Sightseeing',
                        location: itinerary.destination || '',
                        duration: '120',
                        durationUnit: 'minutes',
                        cost: '',
                        participants: [user.email],
                        priority: 'Medium',
                        status: 'Planned',
                        confirmation: '',
                        website: '',
                        attachment: '',
                        reminder: false,
                        notes: 'Afternoon: ' + (day.afternoon || ''),
                        id: String(Date.now()) + '-afternoon-' + day.day
                    },
                    {
                        name: 'Evening Plans',
                        time: '18:00',
                        type: 'Sightseeing',
                        location: itinerary.destination || '',
                        duration: '120',
                        durationUnit: 'minutes',
                        cost: '',
                        participants: [user.email],
                        priority: 'Medium',
                        status: 'Planned',
                        confirmation: '',
                        website: '',
                        attachment: '',
                        reminder: false,
                        notes: 'Evening: ' + (day.evening || ''),
                        id: String(Date.now()) + '-evening-' + day.day
                    }
                ],
                userId: user.uid,
                updatedAt: new Date(),
            }
        );
    }

    await updateDoc(doc(db, 'users', user.uid), {
        tripIds: arrayUnion(tripRef.id),
    });

    navigate(`/trips/${tripRef.id}`);
}

const vibeButtons = [
    { label: 'Beach', emoji: '🏖️' },
    { label: 'Mountain', emoji: '🏔️' },
    { label: 'Cultural', emoji: '🏯' },
    { label: 'Adventure', emoji: '🧗' },
    { label: 'Romantic', emoji: '💑' },
    { label: 'Budget', emoji: '💰' },
    { label: 'Luxury', emoji: '👑' },
];

const budgetOptions = ['₹5k-₹15k', '₹15k-₹40k', '₹40k-₹1L', '₹1L+'];

function AITripFlow({ open, onClose, prefillTrip = null }) {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [vibe, setVibe] = useState('Beach');
    const [duration, setDuration] = useState(5);
    const [fromCity, setFromCity] = useState('Delhi');
    const [budget, setBudget] = useState('₹15k-₹40k');

    const [suggestions, setSuggestions] = useState([]);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [itinerary, setItinerary] = useState(null);

    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const [loadingItinerary, setLoadingItinerary] = useState(false);
    const [savingTrip, setSavingTrip] = useState(false);

    useEffect(() => {
        if (!open) return;
        setStep(1);
        setSuggestions([]);
        setSelectedTrip(null);
        setItinerary(null);
        setLoadingSuggestions(false);
        setLoadingItinerary(false);
        setSavingTrip(false);

        if (prefillTrip) {
            setVibe(prefillTrip.vibe || 'Beach');
            setDuration(getDurationDays(prefillTrip.duration || '5 Days'));
            setBudget(prefillTrip.budget || '₹15k-₹40k');
        }
    }, [open, prefillTrip]);

    const bookingUrls = useMemo(() => {
        if (!itinerary?.destination) return null;
        return getBookingUrls(itinerary.destination);
    }, [itinerary]);

    const handleFindTrips = async() => {
        setLoadingSuggestions(true);
        const prompt = buildSuggestionPrompt(vibe, duration, fromCity, budget);
        const aiResult = await callGemini(prompt);

        let nextSuggestions = [];
        if (Array.isArray(aiResult) && aiResult.length) {
            nextSuggestions = aiResult.slice(0, 4).map((trip, index) => ({
                destination: trip.destination || 'Unknown destination',
                emoji: trip.emoji || '🧳',
                estimated_cost: trip.estimated_cost || '₹15,000',
                duration: trip.duration || `${duration} Days`,
                description: trip.description || trip.highlight || 'A great destination for your preferences.',
                highlight: trip.highlight || 'Perfect match',
                best_time: trip.best_time || 'Year round',
                top_activities: Array.isArray(trip.top_activities) ? trip.top_activities : [],
                id: `ai-${index + 1}`,
            }));
        } else {
            nextSuggestions = (FALLBACK_TRIPS[vibe] || FALLBACK_TRIPS.Beach).map((trip, index) => ({
                destination: trip.dest,
                emoji: TRENDING_TRIPS.find((t) => t.destination.toLowerCase().includes(trip.dest.toLowerCase().split(' ')[0]))?.emoji || '🧳',
                estimated_cost: trip.cost,
                duration: `${duration} Days`,
                description: trip.desc,
                highlight: 'Curated fallback recommendation',
                best_time: 'Oct-Mar',
                top_activities: [],
                id: `fallback-${index + 1}`,
            }));
        }

        setSuggestions(nextSuggestions);
        setStep(2);
        setLoadingSuggestions(false);
    };

    const handleGenerateItinerary = async() => {
        if (!selectedTrip) return;
        setLoadingItinerary(true);

        const prompt = buildItineraryPrompt(selectedTrip, vibe, fromCity);
        const aiResult = await callGemini(prompt);

        let nextItinerary = null;
        if (aiResult && typeof aiResult === 'object' && Array.isArray(aiResult.days)) {
            nextItinerary = aiResult;
        } else {
            const dayCount = getDurationDays(selectedTrip.duration);
            const days = Array.from({ length: dayCount }).map((_, idx) => ({
                day: idx + 1,
                title: idx === 0 ? 'Arrival & Local Walk' : idx === dayCount - 1 ? 'Wrap-up & Departure' : `Explore Day ${idx + 1}`,
                morning: 'Visit a signature local attraction and capture the best photo spots.',
                afternoon: 'Enjoy local cuisine and continue with nearby sightseeing.',
                evening: 'Relax with a sunset view and explore the local market.',
                food_tip: 'Try a popular local thali and one regional dessert.',
                cost_estimate: '₹2,500',
            }));

            nextItinerary = {
                destination: selectedTrip.destination,
                duration: selectedTrip.duration,
                estimated_cost: selectedTrip.estimated_cost,
                days,
                packing_tips: ['Carry light cotton layers', 'Keep digital copies of IDs', 'Comfortable walking shoes are essential'],
                local_tips: ['Start early to avoid crowds', 'Use verified local transport options'],
                total_cost_breakdown: {
                    transport: '₹8,000',
                    accommodation: '₹12,000',
                    food: '₹6,000',
                    activities: '₹5,000',
                },
            };
        }

        setItinerary(nextItinerary);
        setStep(3);
        setLoadingItinerary(false);
    };

    const onSave = async() => {
        setSavingTrip(true);
        try {
            await handleSaveTrip(itinerary, auth.currentUser, navigate);
            onClose();
        } finally {
            setSavingTrip(false);
        }
    };

    return ( <
        Dialog open = { open }
        onClose = { onClose }
        fullWidth maxWidth = "md" >
        <
        DialogTitle sx = {
            { display: 'flex', alignItems: 'center', gap: 1 }
        } > {
            step > 1 && ( <
                Button size = "small"
                onClick = {
                    () => setStep(step - 1)
                }
                startIcon = { < ArrowBackIcon / > } >
                Back <
                /Button>
            )
        } <
        Typography variant = "h6"
        sx = {
            { fontWeight: 700 }
        } > AI Trip Planner < /Typography> < /
        DialogTitle > <
        DialogContent sx = {
            { pb: 3 }
        } > {
            step === 1 && ( <
                Box > {!process.env.REACT_APP_GEMINI_API_KEY && ( <
                        div style = {
                            {
                                background: '#fff3cd',
                                border: '1px solid #ffc107',
                                borderRadius: 8,
                                padding: '10px 16px',
                                marginBottom: 16,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                fontSize: 13,
                                color: '#856404',
                            }
                        } >
                        <
                        span > ⚡ < /span> <
                        span > < strong > Demo Mode < /strong> - AI features are running with curated fallback data. Add a Gemini API key to enable live AI suggestions.</span >
                        <
                        /div>
                    )
                }

                <
                Typography sx = {
                    { fontWeight: 700, mb: 1 }
                } > Choose vibe < /Typography> <
                Stack direction = "row"
                useFlexGap flexWrap = "wrap"
                gap = { 1 }
                sx = {
                    { mb: 2 }
                } > {
                    vibeButtons.map((item) => ( <
                        Button key = { item.label }
                        onClick = {
                            () => setVibe(item.label)
                        }
                        variant = "outlined"
                        sx = {
                            {
                                borderColor: vibe === item.label ? '#ff715b' : '#d1d5db',
                                color: '#223a5f',
                                borderWidth: vibe === item.label ? '2px' : '1px',
                                borderRadius: 999,
                                textTransform: 'none',
                            }
                        } > { item.emoji } { item.label } <
                        /Button>
                    ))
                } <
                /Stack>

                <
                Typography sx = {
                    { fontWeight: 700, mb: 1 }
                } > Duration < /Typography> <
                Stack direction = "row"
                gap = { 1 }
                sx = {
                    { mb: 2 }
                } > {
                    [3, 5, 7, 10].map((d) => ( <
                        Button key = { d }
                        onClick = {
                            () => setDuration(d)
                        }
                        sx = {
                            {
                                borderRadius: 999,
                                border: duration === d ? '2px solid #ff715b' : '1px solid #d1d5db',
                                color: '#223a5f',
                                px: 2,
                            }
                        } > { d }
                        days <
                        /Button>
                    ))
                } <
                /Stack>

                <
                Grid container spacing = { 2 }
                sx = {
                    { mb: 2 }
                } >
                <
                Grid item xs = { 12 }
                md = { 6 } >
                <
                TextField label = "Departure city"
                value = { fromCity }
                onChange = {
                    (e) => setFromCity(e.target.value)
                }
                fullWidth /
                >
                <
                /Grid> <
                Grid item xs = { 12 }
                md = { 6 } >
                <
                Select fullWidth value = { budget }
                onChange = {
                    (e) => setBudget(e.target.value)
                } > {
                    budgetOptions.map((opt) => ( <
                        MenuItem key = { opt }
                        value = { opt } > { opt } < /MenuItem>
                    ))
                } <
                /Select> < /
                Grid > <
                /Grid>

                <
                Button onClick = { handleFindTrips }
                disabled = { loadingSuggestions || !fromCity.trim() }
                sx = {
                    {
                        width: '100%',
                        color: '#fff',
                        py: 1.3,
                        borderRadius: 999,
                        background: 'linear-gradient(90deg,#ff715b,#ff9472)',
                        textTransform: 'none',
                        fontWeight: 700,
                    }
                } > ✨Find My Perfect Trip <
                /Button>

                {
                    loadingSuggestions && ( <
                        Box sx = {
                            { mt: 2, display: 'flex', alignItems: 'center', gap: 1 }
                        } >
                        <
                        CircularProgress size = { 18 }
                        /> <
                        Typography variant = "body2" > AI is searching best destinations... < /Typography> < /
                        Box >
                    )
                } <
                /Box>
            )
        }

        {
            step === 2 && ( <
                    Box >
                    <
                    Grid container spacing = { 2 } > {
                        suggestions.map((trip) => ( <
                                Grid item xs = { 12 }
                                md = { 6 }
                                key = { trip.id } >
                                <
                                Paper onClick = {
                                    () => setSelectedTrip(trip)
                                }
                                sx = {
                                    {
                                        p: 2,
                                        borderRadius: 2,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        transform: 'translateY(0)',
                                        border: selectedTrip?.id === trip.id ? '2px solid #ff715b' : '1px solid #e5e7eb',
                                        '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 },
                                    }
                                } >
                                <
                                Typography sx = {
                                    { fontSize: 30 }
                                } > { trip.emoji } < /Typography> <
                                Typography sx = {
                                    { fontWeight: 700 }
                                } > { trip.destination } < /Typography> <
                                Typography variant = "body2"
                                sx = {
                                    { color: '#64748b' }
                                } > { trip.estimated_cost }· { trip.duration } < /Typography> <
                                Typography variant = "body2"
                                sx = {
                                    { mt: 1 }
                                } > { trip.description } < /Typography> {
                                selectedTrip?.id === trip.id && ( <
                                    Typography sx = {
                                        { mt: 1, color: '#ff715b', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }
                                    } >
                                    <
                                    CheckCircleIcon fontSize = "small" / > Selected <
                                    /Typography>
                                )
                            } <
                            /Paper> < /
                            Grid >
                        ))
                } <
                /Grid>

            {
                selectedTrip && ( <
                    Button onClick = { handleGenerateItinerary }
                    disabled = { loadingItinerary }
                    sx = {
                        {
                            mt: 2,
                            width: '100%',
                            color: '#fff',
                            py: 1.2,
                            borderRadius: 999,
                            background: 'linear-gradient(90deg,#ff715b,#ff9472)',
                            textTransform: 'none',
                            fontWeight: 700,
                        }
                    } >
                    Plan This Trip→ <
                    /Button>
                )
            }

            {
                loadingItinerary && ( <
                    Box sx = {
                        { mt: 2, display: 'flex', alignItems: 'center', gap: 1 }
                    } >
                    <
                    CircularProgress size = { 18 }
                    /> <
                    Typography variant = "body2" > 🤖AI is crafting your personalized itinerary... < /Typography> < /
                    Box >
                )
            } <
            /Box>
        )
    }

    {
        step === 3 && itinerary && ( <
            Box >
            <
            Stack direction = "row"
            spacing = { 1 }
            sx = {
                { mb: 2, flexWrap: 'wrap' }
            } >
            <
            Typography variant = "h6"
            sx = {
                { fontWeight: 700, mr: 1 }
            } > { itinerary.destination } < /Typography> <
            Chip label = { itinerary.estimated_cost }
            color = "warning"
            size = "small" / >
            <
            Chip label = { itinerary.duration }
            size = "small" / >
            <
            /Stack>

            <
            Stack spacing = { 1.5 }
            sx = {
                { mb: 2 }
            } > {
                (itinerary.days || []).map((day) => ( <
                    Paper key = { day.day }
                    sx = {
                        { p: 2, borderRadius: 2 }
                    } >
                    <
                    Typography sx = {
                        { fontWeight: 700 }
                    } > Day { day.day }: { day.title } < /Typography> <
                    Typography variant = "body2"
                    sx = {
                        { mt: 0.5 }
                    } > < strong > Morning: < /strong> {day.morning}</Typography >
                    <
                    Typography variant = "body2" > < strong > Afternoon: < /strong> {day.afternoon}</Typography >
                    <
                    Typography variant = "body2" > < strong > Evening: < /strong> {day.evening}</Typography >
                    <
                    Typography variant = "body2"
                    sx = {
                        { color: '#64748b' }
                    } > < strong > Food tip: < /strong> {day.food_tip}</Typography >
                    <
                    /Paper>
                ))
            } <
            /Stack>

            {
                itinerary.total_cost_breakdown && ( <
                    Paper sx = {
                        { p: 2, mb: 2 }
                    } >
                    <
                    Typography sx = {
                        { fontWeight: 700, mb: 1 }
                    } > Cost Breakdown < /Typography> <
                    Typography variant = "body2" > Transport: { itinerary.total_cost_breakdown.transport } < /Typography> <
                    Typography variant = "body2" > Accommodation: { itinerary.total_cost_breakdown.accommodation } < /Typography> <
                    Typography variant = "body2" > Food: { itinerary.total_cost_breakdown.food } < /Typography> <
                    Typography variant = "body2" > Activities: { itinerary.total_cost_breakdown.activities } < /Typography> < /
                    Paper >
                )
            }

            <
            Stack direction = "row"
            spacing = { 1 }
            useFlexGap flexWrap = "wrap"
            sx = {
                { mb: 2 }
            } > {
                (itinerary.packing_tips || []).map((tip, idx) => ( <
                    Chip key = { `${tip}-${idx}` }
                    label = { tip }
                    />
                ))
            } <
            /Stack>

            {
                bookingUrls && ( <
                    Stack spacing = { 1 }
                    sx = {
                        { mb: 2 }
                    } >
                    <
                    Button variant = "outlined"
                    onClick = {
                        () => window.open(bookingUrls.flights, '_blank', 'noopener,noreferrer')
                    } > ✈️Book Flights on MakeMyTrip < /Button> <
                    Button variant = "outlined"
                    onClick = {
                        () => window.open(bookingUrls.hotels, '_blank', 'noopener,noreferrer')
                    } > 🏨Book Hotels on MakeMyTrip < /Button> <
                    Button variant = "outlined"
                    onClick = {
                        () => window.open(bookingUrls.trains, '_blank', 'noopener,noreferrer')
                    } > 🚂Book Trains on IRCTC < /Button> < /
                    Stack >
                )
            }

            <
            Button onClick = { onSave }
            disabled = { savingTrip }
            sx = {
                {
                    width: '100%',
                    color: '#fff',
                    py: 1.2,
                    borderRadius: 999,
                    background: 'linear-gradient(90deg,#ff715b,#ff9472)',
                    textTransform: 'none',
                    fontWeight: 700,
                    mb: 1,
                }
            } > 💾Save & Open Trip <
            /Button>

            <
            Button variant = "text"
            onClick = {
                () => {
                    setStep(2);
                    setItinerary(null);
                }
            }
            sx = {
                { textTransform: 'none' }
            } > ←Try Another Destination <
            /Button> < /
            Box >
        )
    }

    {
        !GEMINI_API_KEY && step === 3 && ( <
            Alert severity = "info"
            sx = {
                { mt: 2 }
            } >
            You are seeing curated fallback content because no Gemini API key is configured. <
            /Alert>
        )
    } <
    /DialogContent> < /
    Dialog >
);
}

export default AITripFlow;