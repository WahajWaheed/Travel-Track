import React from 'react';
import './dashboard.css';

const Dashboard = ({ user, onNavigate }) => {
  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Welcome, {user.name}</h2>

      <div className="dashboard-options">
        <div 
          className="dashboard-card history-card"
          onClick={() => onNavigate('history')}
        >
          <h3>Travel History</h3>
          <p>View your past travel experiences</p>
        </div>

        <div 
          className="dashboard-card goals-card"
          onClick={() => onNavigate('goals')}
        >
          <h3>Future Goals</h3>
          <p>Manage your travel bucket list</p>
        </div>

        <div 
          className="dashboard-card friends-card"
          onClick={() => {
            console.log("Navigating to friendsjourney");
            onNavigate('friendsjourney'); // ✅ Correct string
          }}
        >
          <h3>Friends' Journeys</h3>
          <p>See travel experiences from all users</p>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;
