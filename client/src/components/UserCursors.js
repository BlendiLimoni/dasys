import React from 'react';

const UserCursors = ({ cursors }) => {
  return (
    <>
      {Object.entries(cursors).map(([clientId, cursor]) => (
        <div 
          key={clientId}
          className="user-cursor"
          style={{
            left: cursor.x,
            top: cursor.y,
            transform: 'translate(-3px, -3px)'
          }}
        >
          <div 
            style={{ 
              width: '15px', 
              height: '15px', 
              borderRadius: '50%', 
              backgroundColor: cursor.color || '#3498db',
              border: '2px solid white',
              boxShadow: '0 0 2px rgba(0,0,0,0.5)',
              position: 'relative'
            }} 
          />
          <div 
            style={{
              position: 'absolute',
              top: '18px',
              left: '0',
              backgroundColor: cursor.color || '#3498db',
              color: 'white',
              padding: '2px 4px',
              borderRadius: '3px',
              fontSize: '10px',
              whiteSpace: 'nowrap',
              boxShadow: '0 0 3px rgba(0,0,0,0.2)'
            }}
          >
            {cursor.userName || 'User'}
          </div>
        </div>
      ))}
    </>
  );
};

export default UserCursors; 