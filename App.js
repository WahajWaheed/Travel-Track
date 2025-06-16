import { useState } from 'react';
import './App.css';
import Login from './Components/Login/login';
import Dashboard from './Components/Dashboard/dashboard';
import FutureGoals from './Components/FutureGoals/futuregoals';
import History from './Components/travelHistory/history';
import FriendsJourney from './Components/FriendsJourney/FriendsJourney';

function App() {
  // Restore user from localStorage (if any)
  const [currentUser, setCurrentUser] = useState(() => {
    const storedUser = localStorage.getItem('currentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  });

  // Restore currentView from localStorage (default to 'dashboard')
  const [currentView, setCurrentView] = useState(() => {
    return localStorage.getItem('currentView') || 'dashboard';
  });

  const handleLoginSuccess = (userData) => {
    const user = {
      id: userData.userID,
      name: userData.accountName,
      email: userData.email,
      lastTrip: userData.lastTrip, // Ensure these are included
      citiesVisited: userData.citiesVisited,
      foreignCities: userData.foreignCities
    };
    localStorage.setItem('currentUser', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleNavigation = (view) => {
    setCurrentView(view);
    localStorage.setItem('currentView', view);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentView');
    setCurrentUser(null);
    setCurrentView('dashboard');
  };
  console.log("🔍 Current view:", currentView);

  return (
    <div className="App">
      {!currentUser ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <>
          
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>

          {currentView === 'dashboard' && (
            <Dashboard
              user={currentUser}
              onNavigate={handleNavigation}
            />
          )}

          {currentView === 'history' && (
            <History
              user={currentUser}
              onBack={() => handleNavigation('dashboard')}
            />
          )}

          {currentView === 'goals' && (
            <FutureGoals 
              user={currentUser}
              onBack={() => handleNavigation('dashboard')}
            />
          )}

          {currentView === 'friendsjourney' && (
            <>
              
              <FriendsJourney
                onBack={() => handleNavigation('dashboard')}
                currentUserID={currentUser.id} 
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default App;