import React, { useState, useEffect } from 'react';
import NetworkDiagnostic from './NetworkDiagnostic';

const NetworkInfo = ({ serverId = null, connected = false, clientId = null }) => {
  const [showInfo, setShowInfo] = useState(false);
  const [clientIP, setClientIP] = useState('');
  const [localIPs, setLocalIPs] = useState([]);
  const clientPort = 1234; // Default Parcel port

  // Add serverUrl below localIPs const
  const serverUrl = '172.20.10.2:5000';

  useEffect(() => {
    // Try to get client IP addresses
    const getIPs = async () => {
      try {
        // Get public IP
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        setClientIP(data.ip);
        
        // Try to get local IPs using WebRTC
        getLocalIPAddresses();
      } catch (error) {
        console.error('Failed to get IP address:', error);
        setClientIP('Could not determine IP address');
      }
    };

    // Function to get local IPs using WebRTC
    const getLocalIPAddresses = () => {
      const ips = [];
      
      // Create dummy RTCPeerConnection
      const pc = new RTCPeerConnection({
        iceServers: []
      });
      
      // Listen for candidate events
      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        
        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const match = ipRegex.exec(event.candidate.candidate);
        
        if (match && match[1] && !ips.includes(match[1])) {
          ips.push(match[1]);
          setLocalIPs([...ips]);
        }
      };
      
      // Create data channel and create offer to generate candidates
      pc.createDataChannel('');
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .catch(err => console.error('WebRTC error:', err));
    };

    if (showInfo) {
      getIPs();
    }
  }, [showInfo]);

  return (
    <div className="network-info">
      <button 
        className="btn btn-sm btn-info position-fixed"
        style={{ top: '10px', left: '10px', zIndex: 1000 }}
        onClick={() => setShowInfo(!showInfo)}
      >
        {showInfo ? 'Hide Network Info' : 'Show Network Info'}
      </button>

      {showInfo && (
        <div 
          className="card position-fixed"
          style={{ 
            top: '50px', 
            left: '10px', 
            width: '350px', 
            zIndex: 1000,
            boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div className="card-header bg-info text-white">
            <h5 className="card-title mb-0">Network Information</h5>
          </div>
          <div className="card-body">
            <p><strong>For others to connect:</strong></p>
            
            {localIPs.length > 0 && (
              <>
                <p>Share one of these URLs with others on your network:</p>
                {localIPs.map((ip, index) => (
                  <code key={index} className="d-block bg-light p-2 mb-2">
                    http://{ip}:{clientPort}
                  </code>
                ))}
              </>
            )}
            
            <p>External IP (for internet connections):</p>
            <code className="d-block bg-light p-2 mb-3">
              http://{clientIP}:{clientPort}
            </code>
            
            <div className="alert alert-secondary mt-3">
              <small>
                <strong>Debugging Info:</strong><br/>
                Server URL in App.js: <code>172.20.10.2:5000</code><br/>
                Try updating this URL if the whiteboard isn't syncing.
              </small>
            </div>

            <NetworkDiagnostic 
              serverUrl={serverUrl}
              connected={connected}
              clientId={clientId}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkInfo;
