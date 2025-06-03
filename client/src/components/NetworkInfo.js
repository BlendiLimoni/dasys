import React, { useState, useEffect } from "react";
import NetworkDiagnostic from "./NetworkDiagnostic";

const NetworkInfo = ({
  serverId = null,
  connected = false,
  clientId = null,
  serverUrl = "172.20.10.2:5000", // Vlera default nëse nuk kalon si prop
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const [publicIP, setPublicIP] = useState("");
  const [localIPs, setLocalIPs] = useState([]);
  const clientPort = 1234;

  useEffect(() => {
    const getIPs = async () => {
      try {
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setPublicIP(data.ip);
        getLocalIPAddresses();
      } catch (error) {
        console.error("Failed to get IPs:", error);
        setPublicIP("Could not determine public IP");
      }
    };

    const getLocalIPAddresses = () => {
      const pc = new RTCPeerConnection({ iceServers: [] });
      const ips = [];

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;

        const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
        const match = ipRegex.exec(event.candidate.candidate);

        if (match && match[1]) {
          const ip = match[1];
          if (ip.startsWith("192.168.") || ip.startsWith("10.")) {
            if (!ips.includes(ip)) {
              ips.push(ip);
              setLocalIPs([...ips]);
            }
          }
        }
      };

      pc.createDataChannel("");
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch((err) => console.error("WebRTC error:", err));
    };

    if (showInfo) getIPs();
  }, [showInfo]);

  const filteredLocalIPs = localIPs.filter((ip) => {
    const parts = ip.split(".").map(Number);
    return !(
      parts[0] !== 10 &&
      !(parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) &&
      !(parts[0] === 192 && parts[1] === 168)
    );
  });

  return (
    <div className="network-info">
      <button
        className="btn btn-sm btn-info position-fixed"
        style={{ top: "10px", left: "10px", zIndex: 1000 }}
        onClick={() => setShowInfo(!showInfo)}
      >
        {showInfo ? "Hide Network Info" : "Show Network Info"}
      </button>

      {showInfo && (
        <div
          className="card position-fixed"
          style={{
            top: "50px",
            left: "10px",
            width: "350px",
            zIndex: 1000,
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          }}
        >
          <div className="card-header bg-info text-white">
            <h5 className="card-title mb-0">Network Information</h5>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <p>
                <strong>For local network connections:</strong>
              </p>
              {filteredLocalIPs.length > 0 ? (
                filteredLocalIPs.map((ip, index) => (
                  <code key={index} className="d-block bg-light p-2 mb-2">
                    http://{ip}:{clientPort}
                  </code>
                ))
              ) : (
                <div className="alert alert-warning p-2">
                  <small>
                    <code>
                      <code>
                        {serverUrl.split("5000")[0]}
                        {clientPort}
                      </code>
                    </code>
                  </small>
                </div>
              )}
            </div>

            <div className="mb-3">
              <p>
                <strong>For internet connections:</strong>
              </p>
              {publicIP ? (
                <code className="d-block bg-light p-2 mb-2">
                  http://{publicIP}:{clientPort}
                </code>
              ) : (
                <div className="alert alert-warning p-2">
                  <small>Could not determine public IP</small>
                </div>
              )}
            </div>

            <div className="alert alert-secondary mt-3">
              <small>
                <strong>Debugging Info:</strong>
                <br />
                Server URL: <code>{serverUrl}</code>{" "}
                {/* Përdorim prop direkt */}
                <br />
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
