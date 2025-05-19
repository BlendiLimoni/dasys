import React, { useState } from 'react';

const UsersList = ({ users, currentUserId }) => {
  const [showList, setShowList] = useState(false);
  
  const handleShowList = () => {
    setShowList(!showList);
  };
  
  return (
    <div className="users-list">
      <button 
        className="btn btn-light btn-sm rounded-pill px-3 shadow-sm" 
        onClick={handleShowList}
      >
        <i className="bi bi-people-fill me-1"></i>
        {Object.keys(users).length} Users
      </button>
      
      {showList && (
        <div 
          className="card position-absolute mt-2 shadow" 
          style={{ 
            right: '15px', 
            width: '250px',
            zIndex: 1050
          }}
        >
          <div className="card-header py-2 bg-light">
            <h6 className="mb-0">Connected Users</h6>
          </div>
          <ul className="list-group list-group-flush">
            {Object.entries(users).length === 0 ? (
              <li className="list-group-item py-2 text-center text-muted">
                No other users connected
              </li>
            ) : (
              Object.entries(users).map(([id, user]) => (
                <li 
                  key={id} 
                  className={`list-group-item py-2 d-flex align-items-center ${id === currentUserId ? 'bg-light' : ''}`}
                >
                  <div 
                    className="me-2" 
                    style={{ 
                      width: '12px', 
                      height: '12px', 
                      borderRadius: '50%', 
                      backgroundColor: user.color || '#3498db' 
                    }}
                  ></div>
                  <div className="d-flex justify-content-between align-items-center w-100">
                    <span>{user.userName || 'Anonymous'}</span>
                    {id === currentUserId && (
                      <span className="badge bg-secondary">You</span>
                    )}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default UsersList; 