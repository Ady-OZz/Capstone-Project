import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './MyDetailsPage.css';

function MyDetailsPage() {
  const user = auth.currentUser;
  const [form, setForm] = useState({
    firstName: '', lastName: '', mobile: '', email: '',
    address1: '', address2: '', city: '', state: '', zip: '', country: '',
    gender: '', birthMonth: '', birthDay: '', birthYear: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function fetchData() {
      if (!user) { setLoading(false); return; }
      const ref = doc(db, 'users', user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) setForm(snap.data());
      setLoading(false);
    }
    fetchData();
  }, [user]);

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      if (!user) throw new Error('Not logged in');
      await setDoc(doc(db, 'users', user.uid), { ...form, email: user.email });
      setMessage('Details saved!');
    } catch (err) {
      setMessage('Error saving details.');
    }
    setSaving(false);
  };

  if (loading) return <div className="mydetails-loading">Loading...</div>;
  if (!user) return <div className="mydetails-error">Please log in to view your details.</div>;

  return (
    <div className="mydetails-bg">
      <form className="mydetails-form" onSubmit={handleSubmit}>
        <h2>Personal Data Sheet</h2>
        <p>Enter details on the form below</p>
        <div className="mydetails-row">
          <div>
            <label>Name</label>
            <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name" />
          </div>
          <div>
            <label>&nbsp;</label>
            <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" />
          </div>
        </div>
        <div className="mydetails-row">
          <div>
            <label>Mobile Number</label>
            <input name="mobile" value={form.mobile} onChange={handleChange} placeholder="(000) 000-0000" />
          </div>
          <div>
            <label>E-mail</label>
            <input name="email" value={form.email || user.email} onChange={handleChange} placeholder="ex: myname@example.com" disabled />
          </div>
        </div>
        <div className="mydetails-section"><label>Address</label></div>
        <input name="address1" value={form.address1} onChange={handleChange} placeholder="Street Address" />
        <input name="address2" value={form.address2} onChange={handleChange} placeholder="Street Address Line 2" />
        <div className="mydetails-row">
          <input name="city" value={form.city} onChange={handleChange} placeholder="City" />
          <input name="state" value={form.state} onChange={handleChange} placeholder="State / Province" />
        </div>
        <div className="mydetails-row">
          <input name="zip" value={form.zip} onChange={handleChange} placeholder="Postal / Zip Code" />
          <input name="country" value={form.country} onChange={handleChange} placeholder="Country" />
        </div>
        <div className="mydetails-row">
          <div>
            <label>Gender</label>
            <input name="gender" value={form.gender} onChange={handleChange} placeholder="Gender" />
          </div>
          <div>
            <label>Birth Date</label>
            <div className="mydetails-row">
              <select name="birthMonth" value={form.birthMonth} onChange={handleChange}><option>Please :</option>{[...Array(12)].map((_,i)=><option key={i+1}>{i+1}</option>)}</select>
              <select name="birthDay" value={form.birthDay} onChange={handleChange}><option>Please :</option>{[...Array(31)].map((_,i)=><option key={i+1}>{i+1}</option>)}</select>
              <select name="birthYear" value={form.birthYear} onChange={handleChange}><option>Please :</option>{[...Array(100)].map((_,i)=><option key={2024-i}>{2024-i}</option>)}</select>
            </div>
          </div>
        </div>
        <button className="mydetails-submit" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Submit'}</button>
        {message && <div className="mydetails-message">{message}</div>}
      </form>
    </div>
  );
}

export default MyDetailsPage; 