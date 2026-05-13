import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, doc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

async function claimEmailInvites(user) {
  if (!user || !user.email) return;
  const tripsSnap = await getDocs(collection(db, 'trips'));
  const userEmail = user.email.toLowerCase();
  for (const tripDoc of tripsSnap.docs) {
    const trip = tripDoc.data();
    if (trip.members) {
      for (const [key, member] of Object.entries(trip.members)) {
        if (member.email && member.email.toLowerCase() === userEmail) {
          // Add UID to members
          await updateDoc(doc(db, 'trips', tripDoc.id), {
            [`members.${user.uid}`]: {
              ...member,
              email: user.email
            }
          });
          // Add tripId to user's tripIds
          await updateDoc(doc(db, 'users', user.uid), {
            tripIds: arrayUnion(tripDoc.id)
          });
        }
      }
    }
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        // Ensure user doc exists
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            email: user.email,
            firstName: user.displayName ? user.displayName.split(' ')[0] : '',
            lastName: user.displayName ? user.displayName.split(' ').slice(1).join(' ') : '',
            tripIds: [],
            createdAt: new Date(),
          });
        }
        await claimEmailInvites(user);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}; 