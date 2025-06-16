import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './FriendsJourney.css';

const Journey = ({ onBack, currentUserID }) => {
  const [travelHistory, setTravelHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState(''); // Remove setError as it's unused
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [likedHistories, setLikedHistories] = useState(new Set());
  // Removed newComment and setNewComment as they are unused
  const [commentInputs, setCommentInputs] = useState({});
  const [comments, setComments] = useState({});
 

    useEffect(() => {
      // Load travel history
      axios.get('http://localhost:3001/travel-history')
        .then(response => {
          if (response.data.success) {
            // Group travels by history_id and collect media URLs
            const travelsMap = response.data.travels.reduce((acc, travel) => {
              const key = travel.history_id;
              if (!acc[key]) {
                acc[key] = {
                  ...travel,
                  media: []
                };
                if (travel.media_url) {
                  acc[key].media.push(`http://localhost:3001/uploads/${travel.media_url}`);
                }
              } else {
                if (travel.media_url) {
                  acc[key].media.push(`http://localhost:3001/uploads/${travel.media_url}`);
                }
              }
              return acc;
            }, {});
    
            const groupedTravels = Object.values(travelsMap);
            setTravelHistory(groupedTravels);
          }
        })
        .catch(err => {
          console.error('Error loading travel history:', err);
          setTravelHistory([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }, []);
  useEffect(() => {
    // Load comments for each history item
    axios.get('http://localhost:3001/travel-history')
      .then(response => {
        if (response.data.success) {
          response.data.travels.forEach(item => {
            axios.get(`http://localhost:3001/comments/${item.history_id}`)
              .then(commentsResponse => {
                if (commentsResponse.data.success) {
                  setComments(prev => ({
                    ...prev,
                    [item.history_id]: commentsResponse.data.comments || []
                  }));
                } else {
                  setComments(prev => ({
                    ...prev,
                    [item.history_id]: []
                  }));
                }
              })
              .catch(err => {
                console.error('Comments load error:', err);
                setComments(prev => ({
                  ...prev,
                  [item.history_id]: []
                }));
              });
          });
        }
      })
      .catch(err => {
        console.error('Error loading travel history:', err);
        setTravelHistory([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setIsSearching(false);
      setSearchMessage('');
      return;
    }

    try {
      setLoading(true);
      setIsSearching(true);
      const response = await axios.get(`http://localhost:3001/travel-history-by-country?area_name=${searchTerm}`);
      if (response.data.success && response.data.travels.length > 0) {
        setFilteredHistory(response.data.travels);
        setSearchMessage('');
      } else {
        setFilteredHistory([]);
        setSearchMessage('No results found.');
      }
    } catch (err) {
      console.error('❌ Error during search:', err);
      setSearchMessage('Failed to fetch search results');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (history_id) => {
    try {
      console.log(' Sending like for:', { userID: currentUserID, history_id });
      const response = await axios.post(
        'http://localhost:3001/likes',
        { userID: currentUserID, history_id },
        { headers: { 'Content-Type': 'application/json' } }
      );
  
      if (response.data.success) {
        setLikedHistories(prev => new Set(prev).add(history_id));  // ✅ Mark this history as liked
        alert('✅ Liked successfully!');
      } else {
        console.log('❌ Backend response:', response.data);
        alert('❌ Failed to like');
      }
    } catch (err) {
      console.error('❌ Error sending like:', err.response?.data || err.message || err);
      alert('An error occurred while liking this post.');
    }
  };

  const handleAddComment = async (history_id) => {
    if (!commentInputs[history_id]?.trim()) {
      alert('Please enter a comment');
      return;
    }
  
    try {
      const response = await axios.post(
        'http://localhost:3001/comments',
        {
          userID: currentUserID,
          history_id,
          comment_text: commentInputs[history_id]
        }
      );
  
      if (response.data.success) {
        const commentsResponse = await axios.get(
          `http://localhost:3001/comments/${history_id}`
        );
        
        setComments(prev => ({
          ...prev,
          [history_id]: commentsResponse.data
        }));
        
        setCommentInputs(prev => ({
          ...prev,
          [history_id]: ''
        }));
      }
    } catch (err) {
      console.error('Error adding comment:', err);
      alert('Failed to add comment. Please try again.');
    }
  };
  const resultsToDisplay = isSearching ? filteredHistory : travelHistory;

  return (
    <div className="journey-container" style={{ color: 'white' }}>
      <button onClick={onBack} className="back-button">← Back to Dashboard</button>
      <h2>My Friends' Travel History</h2>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by area..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button onClick={handleSearch} className="search-button">Search</button>
      </div>

      {loading && <p>Loading travel history...</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && resultsToDisplay.length === 0 && (
        <p>{searchMessage || "No travel history found."}</p>
      )}

      {!loading && !error && resultsToDisplay.length > 0 && (
        <ul className="travel-list">
         {resultsToDisplay.map((item, index) => (
    <li key={index} className="travel-item">
      <h3>{item.title}</h3>
      <p><strong>Posted by:</strong> {item.accountName}</p>
      <p><strong>Location:</strong> {item.area_name}</p>
      {/* Inside the map function rendering each travel item */}
        {item.media?.map((url, index) => (
          <img
            key={index}
            src={url}
            alt={`Travel memory from ${item.area_name}`}
            onError={(e) => {
              e.target.src = '/alt.jpg';
              e.target.alt = 'Image unavailable';
            }}
          />
        ))}
      <p><strong>Other Details:</strong> {item.descriptionOfArea || 'N/A'}</p>
      <p><strong>Experience:</strong> {item.experiences}</p>
      <p><strong>From:</strong> {item.startDate ? new Date(item.startDate).toLocaleDateString() : 'N/A'}</p>
      <p><strong>To:</strong> {item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A'}</p>
      <p><strong>Location URL:</strong> <a href={item.location_name} target="_blank" rel="noopener noreferrer">{item.location_name}</a></p>
      <p><strong>Posted On:</strong> {item.created_at ? new Date(item.created_at).toLocaleString() : 'N/A'}</p>
      <p><strong>Last Updated:</strong> {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'N/A'}</p>
      <button
  onClick={() => handleLike(item.history_id)}
  className="like-button"
  disabled={likedHistories.has(item.history_id)}
>
  {likedHistories.has(item.history_id) ? '✅ Liked' : '👍 Like'}
</button>
<div className="comment-section">
      <h4>Comments:</h4>
      {comments[item.history_id]?.map((comment, i) => (
        <div key={i} className="comment">
          <strong>{comment.accountName}:</strong> {comment.comment_text}
        </div>
      ))}
      
      <div className="add-comment">
        <input
          type="text"
          placeholder="Write a comment..."
          value={commentInputs[item.history_id] || ''}
          onChange={(e) => setCommentInputs(prev => ({
            ...prev,
            [item.history_id]: e.target.value
          }))}
        />
        <button onClick={() => handleAddComment(item.history_id)}>
          Post Comment
        </button>
      </div>
    </div>

    </li>
    
  ))}
        </ul>
      )}
    </div>
    
  );
};

export default Journey;
