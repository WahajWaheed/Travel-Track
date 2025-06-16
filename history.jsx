import React, { useState, useEffect } from 'react';
import { 
  FiArrowLeft, FiPlus, FiX, FiChevronDown, FiChevronUp, 
  FiUploadCloud, FiMapPin, FiCalendar, FiSearch, FiImage 
} from 'react-icons/fi';
import './history.css';

const History = ({ user, onBack }) => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTrip, setExpandedTrip] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState({
    title: '',
    area_name: '',
    startDate: '',
    endDate: '',
    description: '',
    experiences: ''
  });

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => fetchTrips(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const fetchTrips = async (area = '') => {
    try {
      setLoading(true);
      const url = area 
        ? `http://localhost:3001/travel-history-by-area?area_name=${encodeURIComponent(area)}`
        : `http://localhost:3001/travel-history/${user.id}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load trips');
      
      const { travels } = await res.json();
      setTrips(travels.map(trip => ({
        ...trip,
        media: trip.media?.map(mediaUrl => ({
          media_url: `http://localhost:3001${mediaUrl}`
        }))
      })));
      
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files).slice(0, 5);
    setFiles(newFiles);
  };

  const validateDates = () => {
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return start < end;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateDates()) {
      setError('End date must be after start date');
      return;
    }

    try {
      const formPayload = new FormData();
      formPayload.append('userID', user.id);
      Object.entries(formData).forEach(([key, value]) => {
        formPayload.append(key, value);
      });
      files.forEach(file => formPayload.append('images', file));

      const res = await fetch('http://localhost:3001/travel-history', {
        method: 'POST',
        body: formPayload
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Submission failed');
      }

      setShowForm(false);
      await fetchTrips();
      setFormData({
        title: '',
        area_name: '',
        startDate: '',
        endDate: '',
        description: '',
        experiences: ''
      });
      setFiles([]);

    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="history-container">
      <header className="history-header">
        <button onClick={onBack} className="back-btn">
          <FiArrowLeft /> Back to Dashboard
        </button>
        <div className="header-content">
          <h1 className="journal-title">{user.accountName}'s Travel Journal</h1>
          <div className="controls-container">
            <div className="search-wrapper">
              <FiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search destinations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search travel entries"
              />
            </div>
            <button 
              className="primary-btn new-entry-btn"
              onClick={() => setShowForm(true)}
              aria-label="Add new travel entry"
            >
              <FiPlus /> New Entry
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-toast">
          <FiX className="error-icon" />
          <span>{error}</span>
          <button 
            onClick={() => setError('')}
            className="dismiss-btn"
            aria-label="Dismiss error"
          >
            &times;
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="loading-text">Loading your travel memories...</p>
        </div>
      ) : (
        <div className="trips-masonry">
          {trips.length === 0 ? (
            <div className="empty-state">
              <FiImage className="empty-icon" />
              <h3>No Travel Entries Found</h3>
              <p>Start documenting your adventures by creating a new entry</p>
            </div>
          ) : (
            trips.map(trip => (
              <article 
                key={trip.history_id}
                className={`trip-card ${expandedTrip === trip.history_id ? 'expanded' : ''}`}
                aria-expanded={expandedTrip === trip.history_id}
              >
                <header 
                  className="card-header"
                  onClick={() => setExpandedTrip(prev => 
                    prev === trip.history_id ? null : trip.history_id
                  )}
                >
                  <div className="trip-meta">
                    <h2 className="trip-title">{trip.title}</h2>
                    <div className="trip-location">
                      <FiMapPin aria-hidden="true" />
                      <span>{trip.area_name}, {trip.country || 'Pakistan'}</span>
                    </div>
                  </div>
                  <div className="date-range">
                    <FiCalendar aria-hidden="true" />
                    <time dateTime={trip.startDate}>{formatDate(trip.startDate)}</time>
                    {' - '}
                    <time dateTime={trip.end_date}>{formatDate(trip.end_date)}</time>
                  </div>
                  <div className="toggle-icon" aria-hidden="true">
                    {expandedTrip === trip.history_id ? 
                      <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </header>

                {expandedTrip === trip.history_id && (
                  <div className="card-content">
                    {trip.media?.length > 0 ? (
                      <div className="image-carousel">
                        {trip.media.map((media, index) => (
                          <figure key={index} className="image-item">
                            <img
                              src={media.media_url}
                              alt={`Travel memory from ${trip.area_name}`}
                              loading="lazy"
                              onError={(e) => {
                                e.target.src = '/placeholder.jpg';
                                e.target.alt = 'Image unavailable';
                              }}
                            />
                          </figure>
                        ))}
                      </div>
                    ) : (
                      <div className="media-placeholder">
                        <FiImage className="placeholder-icon" />
                        <p>No photos available for this trip</p>
                      </div>
                    )}

                    <div className="trip-details">
                      {trip.descriptionOfArea && (
                        <section className="detail-section">
                          <h4 className="detail-heading">About {trip.area_name}</h4>
                          <p className="detail-content">{trip.descriptionOfArea}</p>
                        </section>
                      )}

                      {trip.experiences && (
                        <section className="detail-section">
                          <h4 className="detail-heading">Travel Experiences</h4>
                          <p className="detail-content">{trip.experiences}</p>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content" role="dialog" aria-labelledby="modalTitle">
            <div className="modal-header">
              <h2 id="modalTitle">New Travel Entry</h2>
              <button 
                className="icon-btn close-btn"
                onClick={() => {
                  setShowForm(false);
                  setFiles([]);
                }}
                aria-label="Close modal"
              >
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="entry-form">
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="title">Title *</label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    required
                    maxLength="100"
                  />
                  <span className="char-count">{formData.title.length}/100</span>
                </div>

                <div className="form-group">
                  <label htmlFor="area_name">Destination *</label>
                  <input
                    id="area_name"
                    type="text"
                    value={formData.area_name}
                    onChange={(e) => setFormData({...formData, area_name: e.target.value})}
                    required
                    maxLength="150"
                  />
                </div>

                <div className="form-group date-group">
                  <label htmlFor="startDate">Start Date *</label>
                  <input
                    id="startDate"
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group date-group">
                  <label htmlFor="endDate">End Date *</label>
                  <input
                    id="endDate"
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    required
                    min={formData.startDate}
                  />
                </div>

                <div className="form-group full-width">
                  <label>Photos (Max 5)</label>
                  <div className="file-uploader">
                    <label className="upload-label">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        accept="image/*"
                        disabled={files.length >= 5}
                      />
                      <div className="upload-ui">
                        <FiUploadCloud className="upload-icon" />
                        <div className="upload-text">
                          <p>Drag & drop images here</p>
                          <small>or click to browse (JPEG/PNG, max 5MB each)</small>
                        </div>
                      </div>
                    </label>
                    {files.length > 0 && (
                      <div className="file-previews">
                        {files.map((file, index) => (
                          <div key={index} className="file-preview">
                            <img
                              src={URL.createObjectURL(file)}
                              alt={`Preview ${index + 1}`}
                              className="preview-image"
                            />
                            <span className="file-name">{file.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="description">Location Description</label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows="3"
                    maxLength="500"
                  />
                  <span className="char-count">{formData.description.length}/500</span>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="experiences">Personal Experiences</label>
                  <textarea
                    id="experiences"
                    value={formData.experiences}
                    onChange={(e) => setFormData({...formData, experiences: e.target.value})}
                    rows="3"
                    maxLength="500"
                  />
                  <span className="char-count">{formData.experiences.length}/500</span>
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="secondary-btn"
                  onClick={() => {
                    setShowForm(false);
                    setFiles([]);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="primary-btn"
                  disabled={loading}
                >
                  {loading ? 'Saving...' : 'Save Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;