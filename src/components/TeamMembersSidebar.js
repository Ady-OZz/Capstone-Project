import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { getUserColor, getDisplayName } from '../utils';

export default function TeamMembersSidebar({ members, currentUserEmail }) {
  const [displayNames, setDisplayNames] = useState({});
  useEffect(() => {
    async function fetchNames() {
      const names = {};
      for (const m of members) {
        names[m.id] = await getDisplayName(m);
      }
      setDisplayNames(names);
    }
    fetchNames();
  }, [members]);
  return (
    <Box sx={{ width: 360, minWidth: 360, bgcolor: '#f7f9fb', borderRight: '1.5px solid #e6eaf0', height: '100vh', p: 0, display: 'flex', flexDirection: 'column' }}>
      <Typography sx={{ fontWeight: 700, fontSize: 17, mb: 2, color: '#223a5f', letterSpacing: 0.5 }}>Team Members</Typography>
      {members.map((m, idx) => {
        const color = getUserColor(m);
        const initials = (displayNames[m.id] ? displayNames[m.id][0] : (m.email || m.id)[0] || '').toUpperCase();
        return (
          <Box key={m.id || idx} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1, p: 1, borderRadius: 2, bgcolor: (m.email === currentUserEmail) ? '#e0f7fa' : 'transparent' }}>
            <Avatar sx={{ bgcolor: color, width: 36, height: 36, fontWeight: 700, fontSize: 18 }}>{initials}</Avatar>
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: 15, color: '#223a5f', textTransform: 'capitalize' }}>{displayNames[m.id] || m.email?.split('@')[0] || m.id}</Typography>
              <Typography sx={{ color: '#888', fontSize: 12 }}>{m.email}</Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
