import React, { useState } from 'react';

const NetworkDiagnostic = ({ serverUrl, connected, clientId }) => {
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  const [testResults, setTestResults] = useState(null);

  const runTests = async () => {
    const results = {
      serverReachable: false,
      websocketConnected: connected,
      clientId: clientId || 'Not assigned',
      timestamp: new Date().toLocaleString()
    };

    try {
      // Test basic HTTP connectivity to server
      const serverHost = serverUrl.replace(/^(https?:\/\/)/, '').split(':')[0];
      const response = await fetch(`http://${serverHost}:5000/api/clients`, { 
        mode: 'cors',
        timeout: 3000 
      });
      
      if (response.ok) {
        results.serverReachable = true;
        results.serverResponse = await response.json();
      }
    } catch (error) {
      console.error('Diagnostic test failed:', error);
      results.error = error.message;
    }

    setTestResults(results);
  };

  return (
    <div className="mt-3">
      <button 
        className="btn btn-sm btn-secondary" 
        onClick={() => {
          setShowDiagnostic(!showDiagnostic);
          if (!showDiagnostic) runTests();
        }}
      >
        {showDiagnostic ? 'Hide Diagnostics' : 'Run Network Diagnostics'}
      </button>

      {showDiagnostic && testResults && (
        <div className="card mt-2">
          <div className="card-header bg-secondary text-white">
            <h6 className="mb-0">Network Diagnostic Results</h6>
          </div>
          <div className="card-body">
            <dl className="row mb-0">
              <dt className="col-sm-5">Server Connectivity:</dt>
              <dd className="col-sm-7">
                {testResults.serverReachable ? 
                  <span className="text-success">✓ Reachable</span> : 
                  <span className="text-danger">✗ Not Reachable</span>}
              </dd>

              <dt className="col-sm-5">WebSocket Connection:</dt>
              <dd className="col-sm-7">
                {testResults.websocketConnected ? 
                  <span className="text-success">✓ Connected</span> : 
                  <span className="text-danger">✗ Disconnected</span>}
              </dd>

              <dt className="col-sm-5">Client ID:</dt>
              <dd className="col-sm-7">{testResults.clientId}</dd>

              <dt className="col-sm-5">Time:</dt>
              <dd className="col-sm-7">{testResults.timestamp}</dd>
            </dl>

            {testResults.error && (
              <div className="alert alert-danger mt-2 mb-0">
                <small>Error: {testResults.error}</small>
              </div>
            )}

            <div className="alert alert-info mt-2 mb-0">
              <small>
                <strong>Quick Fix:</strong> If you see connection issues, try updating the SERVER_URL in App.js 
                to match your server's actual IP address. Current server URL: <code>{serverUrl}</code>
              </small>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkDiagnostic; 