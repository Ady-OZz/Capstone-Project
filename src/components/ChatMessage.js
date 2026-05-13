import React, { useState, useEffect } from 'react';
import { Box, Typography, Avatar } from '@mui/material';
import { userNameCache, getUserFirstName, getUserColor } from '../utils';

export default function ChatMessage({ msg, currentUserEmail }) {
  const [name, setName] = useState(userNameCache[msg.sender] || '');
  
  useEffect(() => {
    if (!name) {
      getUserFirstName(msg.sender).then(setName);
    }
  }, [msg.sender, name]);

  const color = getUserColor(msg.sender);
  const isMe = msg.sender === currentUserEmail;
  const initials = (name ? name[0] : (msg.sender?.split('@')[0][0] || 'U')).toUpperCase();

  return (
    <Box sx={{ display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 1.5, mb: 0.5 }}>
      <Avatar sx={{ bgcolor: color, width: 32, height: 32, fontWeight: 700, fontSize: 15 }}>{initials}</Avatar>
      <Box sx={{ maxWidth: '70%', minWidth: 60, display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.2 }}>
          <Typography sx={{ fontWeight: 700, color: color, fontSize: 13, textTransform: 'capitalize' }}>{name || msg.sender?.split('@')[0] || 'User'}</Typography>
          <Typography sx={{ color: '#888', fontSize: 11 }}>{msg.createdAt?.seconds ? new Date(msg.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</Typography>
        </Box>
        <Box sx={{
          bgcolor: isMe ? '#2563eb' : '#fff',
          color: isMe ? '#fff' : '#222',
          borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          p: 1.2,
          px: 2,
          fontSize: 15,
          boxShadow: isMe ? '0 2px 8px rgba(37,99,235,0.08)' : '0 2px 8px rgba(71,181,255,0.06)',
          mt: 0.2,
          wordBreak: 'break-word',
          minWidth: 40,
        }}>
          {msg.text}
        </Box>
      </Box>
    </Box>
  );
}
