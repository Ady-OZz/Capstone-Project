import React, { useState } from 'react';
import './LoginPage.css';
import { auth } from './firebase';
import { GoogleAuthProvider, GithubAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGoogle = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGithub = async () => {
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-bg">
      <div className="login-container">
        <div className="login-left">
          <img className="login-image" src="https://images.pexels.com/photos/3601425/pexels-photo-3601425.jpeg" alt="Travel" />
          <div className="login-quote">TRAVEL IS THE ONLY THING YOU BUY THAT MAKES YOU RICHER</div>
        </div>
        <div className="login-right">
          <div className="login-title">TRAVEL BLOGGER</div>
          <div className="login-toggle">
            <button className={!isSignup ? 'active' : ''} onClick={() => setIsSignup(false)}>Login</button>
            <button className={isSignup ? 'active' : ''} onClick={() => setIsSignup(true)}>Sign Up</button>
          </div>
          <div className="login-socials">
            <button className="login-social-icon" onClick={handleGoogle}>G</button>
            <button className="login-social-icon" onClick={handleGithub}>GH</button>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
            <div className="login-links">
              {!isSignup && <a href="#">Forgot your password?</a>}
            </div>
            <button type="submit" className="login-submit">{isSignup ? 'Sign Up' : 'Login'}</button>
            {error && <div className="login-error">{error}</div>}
          </form>
        </div>
      </div>
    </div>
  );
}

export default LoginPage; 