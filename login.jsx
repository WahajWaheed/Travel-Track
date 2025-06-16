import React, { useState } from 'react';
import './login.css';
import leftPic from '../assets/leftpic.jpeg';
import rightPic from '../assets/rightPic.jpeg';
import backgroundImage from '../assets/bg.jpg';
const Login = ({ onLoginSuccess }) => {  // Added prop for successful login
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
  
    // Client-side validation
    if (isSignUp && !formData.name.trim()) {
      setError('Username is required');
      setLoading(false);
      return;
    }
  
    if (!formData.email.trim()) {
      setError('Email is required');
      setLoading(false);
      return;
    }
  
    if (!formData.password) {
      setError('Password is required');
      setLoading(false);
      return;
    }
  
    if (isSignUp && formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
  
    try {
      const endpoint = isSignUp ? '/signup' : '/login';
      const body = isSignUp ? {
        accountName: formData.name.trim(),
        email: formData.email.trim(),
        age: formData.age ? parseInt(formData.age) : null,
        password: formData.password
      } : {
        email: formData.email.trim(),
        password: formData.password
      };
  
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
  
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 
          (isSignUp ? 'Registration failed' : 'Login failed'));
      }
  
      if (isSignUp) {
        alert('Registration successful! Please login.');
        setIsSignUp(false);
        // Keep email for convenience, clear other fields
        setFormData(prev => ({
          email: prev.email,
          password: '',
          name: '',
          age: ''
        }));
      } else {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      console.error('Form submission error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
    className="login-container"
    style={{ 
      backgroundImage: `url(${backgroundImage})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center'
    }}
  >
  

      {/* <div className="decoration-section left">
        <img src={leftPic} alt="Travel" className="decoration-image" />
      </div> */}

      <div className='form-container'>
        <form onSubmit={handleSubmit}>
          <div className="form-header">
            <h1>{isSignUp ? 'Create Account' : 'Welcome Back'}</h1>
            <div className="header-underline"></div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="form-content">
            {/* Keep existing form fields unchanged */}
            {isSignUp && (
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Username"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
                disabled={loading}
              />
            </div>

            {isSignUp && (
              <div className="form-group">
                <input
                  type="number"
                  placeholder="Age (Optional)"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                minLength="6"
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              className={`submit-btn ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner"></div>
              ) : isSignUp ? (
                'Sign Up'
              ) : (
                'Login'
              )}
            </button>

            <p className="toggle-text">
              {isSignUp ? 'Already have an account? ' : 'Need an account? '}
              <span onClick={() => setIsSignUp(!isSignUp)}>
                {isSignUp ? 'Login' : 'Sign Up'}
              </span>
            </p>
          </div>
        </form>
      </div>

     
    </div>
  );
};

export default Login;