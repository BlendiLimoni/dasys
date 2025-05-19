import React, { useState } from 'react';

const ConnectionStatus = ({ connected, error, serverUrl, onServerUrlChange, onDiagnose }) => {
  const [showSettings, setShowSettings] = useState(false);
  const [tempServerUrl, setTempServerUrl] = useState(serverUrl);

  const handleServerChange = () => {
    if (tempServerUrl && tempServerUrl.trim() !== '') {
      onServerUrlChange(tempServerUrl.trim());
      setShowSettings(false);
    }
  };

  return (
    <div className="connection-status">
      <div className="offline-badge">
        {connected ? (
          <span className="badge bg-success">
            <i className="bi bi-wifi me-1"></i>
            Online
          </span>
        ) : (
          <span className="badge bg-danger">
            <i className="bi bi-wifi-off me-1"></i>
            Offline
          </span>
        )}
        <button 
          className="btn btn-sm btn-outline-secondary ms-2"
          onClick={() => setShowSettings(!showSettings)}
          title="Server settings"
        >
          <i className="bi bi-gear-fill"></i>
        </button>
        <button 
          className="btn btn-sm btn-outline-info ms-2"
          onClick={onDiagnose}
          title="Diagnose connection issues"
        >
          <i className="bi bi-arrow-repeat"></i>
        </button>
      </div>
      
      {showSettings && (
        <div className="server-settings card p-3 mt-2">
          <h6>Server Connection</h6>
          <div className="input-group mb-2">
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Server URL"
              value={tempServerUrl}
              onChange={(e) => setTempServerUrl(e.target.value)}
            />
            <button 
              className="btn btn-sm btn-primary" 
              onClick={handleServerChange}
            >
              Save
            </button>
          </div>
          <div className="small text-muted">
            Current: {serverUrl}
            {error && (
              <div className="text-danger mt-1">
                {error}
                <button 
                  className="btn btn-sm btn-link p-0 ms-2"
                  onClick={onDiagnose}
                >
                  Diagnose
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Set default props
ConnectionStatus.defaultProps = {
  connected: false,
  serverUrl: 'http://localhost:5000',
  onServerUrlChange: () => {},
  onDiagnose: () => {},
  error: null
};

export default ConnectionStatus; 