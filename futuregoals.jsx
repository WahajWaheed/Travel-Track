import React, { useEffect, useState } from 'react';
import './futuregoals.css';

const FutureGoals = ({ user, onBack }) => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_date: ''
  });

  useEffect(() => {
    fetchGoals();
  }, [user.id]);

  const fetchGoals = async () => {
    try {
      const response = await fetch(`http://localhost:3001/future-goals/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      setGoals(data.goals || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingGoalId 
        ? `http://localhost:3001/future-goals/${editingGoalId}`
        : 'http://localhost:3001/future-goals';
      const method = editingGoalId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userID: user.id,
          ...formData
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save goal');
      }

      fetchGoals();
      setShowForm(false);
      setEditingGoalId(null);
      setFormData({ title: '', description: '', target_date: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoalId(goal.future_goal_id);
    setFormData({
      title: goal.title,
      description: goal.description,
      target_date: goal.target_date.split('T')[0]
    });
    setShowForm(true);
  };

  const handleDelete = async (goalId) => {
    if (!window.confirm('Are you sure you want to delete this goal?')) return;
    
    try {
      const response = await fetch(`http://localhost:3001/future-goals/${goalId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Failed to delete goal');
      fetchGoals();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusClass = (targetDate) => {
    const today = new Date();
    const target = new Date(targetDate);
    
    if (target < today) return 'status-past';
    if (target.toDateString() === today.toDateString()) return 'status-active';
    return 'status-upcoming';
  };

  const getStatusText = (targetDate) => {
    const today = new Date();
    const target = new Date(targetDate);
    
    if (target < today) return 'Completed';
    if (target.toDateString() === today.toDateString()) return 'Today!';
    return 'Upcoming';
  };

  return (
    <div className="goals-container">
      <button onClick={onBack} className="back-button">
        &larr; Back to Dashboard
      </button>
      <h1>Your Future Travel Goals</h1>
      
      {error && <p className="error-message">{error}</p>}
      
      <button 
        onClick={() => {
          setEditingGoalId(null);
          setFormData({ title: '', description: '', target_date: '' });
          setShowForm(true);
        }} 
        className="add-goal-button"
      >
        + Add New Travel Goal
      </button>
      
      {loading ? (
        <div className="loading-spinner"></div>
      ) : goals.length === 0 ? (
        <p className="no-goals">No future goals found</p>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => (
            <div key={goal.future_goal_id} className="goal-card">
              <div className="goal-header">
                <h2 className="goal-title">
                  {goal.title}
                  <span className={`status-badge ${getStatusClass(goal.target_date)}`}>
                    {getStatusText(goal.target_date)}
                  </span>
                </h2>
                <div className="action-buttons">
                  <button 
                    className="edit-btn"
                    onClick={() => handleEdit(goal)}
                  >
                    <i className="fas fa-edit"></i> Edit
                  </button>
                  <button 
                    className="delete-btn"
                    onClick={() => handleDelete(goal.future_goal_id)}
                  >
                    <i className="fas fa-trash"></i> Delete
                  </button>
                </div>
              </div>
              
              <div className="goal-meta">
                <span className="meta-label">Target Date:</span>
                <span className="meta-value">{new Date(goal.target_date).toLocaleDateString()}</span>
              </div>
              
              <div className="goal-description">
                <h3>Description:</h3>
                <p>{goal.description || 'No description provided'}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {showForm && (
        <div className="goal-form-container">
          <h2>{editingGoalId ? 'Edit Goal' : 'Add New Goal'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Target Date *</label>
              <input
                type="date"
                name="target_date"
                value={formData.target_date}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="4"
              />
            </div>
            
            <div className="form-actions">
              <button type="submit" className="submit-btn">
                {editingGoalId ? 'Update Goal' : 'Add Goal'}
              </button>
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FutureGoals;