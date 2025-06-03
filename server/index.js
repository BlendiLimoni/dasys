const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");
const os = require("os");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Store for drawing elements and connected clients
const drawings = [];
const users = {};
let drawingsBackup = []; // Backup for recovery

function clearBackup() {
  drawingsBackup.length = 0;
  console.log("Backup cleared");
}

// Backup drawings every 60 seconds
setInterval(() => {
  if (drawings.length > 0) {
    drawingsBackup = [...drawings];
    console.log(`Backed up ${drawings.length} drawing elements`);
  }
}, 60000);

// Handle socket connections
io.on("connection", (socket) => {
  const clientId = socket.id;
  const query = socket.handshake.query;

  // Extract username from query if available
  const userName = query.userName || `User-${clientId.substr(0, 4)}`;

  // Default user information
  users[clientId] = {
    id: clientId,
    userName,
    color: getRandomColor(),
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  };

  console.log(`Client connected: ${clientId} (${userName})`);

  // Broadcast updated users list
  io.emit("users-update", users);

  // Send current drawing state to new client
  socket.emit("init-drawings", drawings);

  // Handle request for initial state (drawings + users)
  socket.on("request-initial-state", () => {
    console.log(`Client ${clientId} requested initial state`);
    socket.emit("init-drawings", drawings);
    socket.emit("users-update", users);
  });

  // Handle drawing settings changes
  socket.on("drawing-settings-change", (data) => {
    console.log(`Received drawing settings change from ${clientId}`);

    // Update user's last active timestamp
    if (users[clientId]) {
      users[clientId].lastActive = new Date().toISOString();
    }

    // Broadcast to all OTHER clients
    socket.broadcast.emit("drawing-settings-change", data);
  });

  // Handle user information updates
  socket.on("user-info", (userInfo) => {
    if (users[clientId]) {
      users[clientId] = {
        ...users[clientId],
        ...userInfo,
        lastActive: new Date().toISOString(),
      };

      // Broadcast updated users list to all clients
      io.emit("users-update", users);
      console.log(
        `Updated user info for ${clientId}, broadcasting to all clients`
      );
    }
  });

  // Handle ping for diagnostics
  socket.on("ping", (data, callback) => {
    if (typeof callback === "function") {
      callback();
    }
  });

  // Handle cursor position updates
  socket.on("cursor-move", (data) => {
    if (users[clientId]) {
      users[clientId].lastActive = new Date().toISOString();
    }

    // Broadcast cursor position to all other clients
    socket.broadcast.emit("cursor-move", {
      clientId,
      x: data.x,
      y: data.y,
      userName: users[clientId]?.userName || data.userName || "User",
      color: users[clientId]?.color || getRandomColor(),
    });
  });

  // Handle new drawing element
  socket.on("draw-element", (element) => {
    console.log(`Received drawing from ${clientId}`, element.type);

    // Update user's last active timestamp
    if (users[clientId]) {
      users[clientId].lastActive = new Date().toISOString();
    }

    const drawingElement = {
      id: uuidv4(),
      ...element,
      createdBy: clientId,
      timestamp: new Date().toISOString(),
    };

    // Store drawing element
    drawings.push(drawingElement);

    // Broadcast to ALL clients including sender to ensure consistency
    io.emit("draw-element", drawingElement);
    console.log(
      `Broadcasting drawing element #${drawingElement.id} to all clients`
    );

    // If we have too many elements, consider cleaning up
    if (drawings.length > 10000) {
      // Remove oldest elements to keep memory footprint manageable
      // Only remove freehand drawing points which can be numerous
      const excessElements = drawings.length - 10000;
      if (excessElements > 0) {
        let removed = 0;
        const newDrawings = drawings.filter((d) => {
          if (removed >= excessElements) return true;
          if (d.type === "pencil" && d.points && d.points.length > 0) {
            removed++;
            return false;
          }
          return true;
        });

        if (newDrawings.length < drawings.length) {
          console.log(
            `Cleaned up ${
              drawings.length - newDrawings.length
            } old drawing elements`
          );
          drawings.length = 0;
          drawings.push(...newDrawings);
        }
      }
    }
  });

  // Handle clear canvas event
  socket.on("clear-canvas", () => {
    console.log(`Canvas cleared by ${clientId}`);

    // Backup before clearing
    // drawingsBackup = [...drawings];

    // Clear all drawings
    drawings.length = 0;
    clearBackup();

    // Update user's last active timestamp
    if (users[clientId]) {
      users[clientId].lastActive = new Date().toISOString();
    }

    // Broadcast to all OTHER clients
    socket.broadcast.emit("clear-canvas");
  });

  // Handle undo last action
  socket.on("undo", () => {
    if (drawings.length > 0) {
      // Find last element drawn by this user
      for (let i = drawings.length - 1; i >= 0; i--) {
        if (drawings[i].createdBy === clientId) {
          // Remove it
          const removed = drawings.splice(i, 1)[0];
          console.log(`User ${clientId} undid element ${removed.id}`);

          // Notify all clients to redraw
          io.emit("undo", { elementId: removed.id });
          break;
        }
      }
    }
  });

  // Handle client disconnection
  socket.on("disconnect", () => {
    console.log(
      `Client disconnected: ${clientId} (${
        users[clientId]?.userName || "Unknown"
      })`
    );

    // Remove from users list
    delete users[clientId];

    // Notify other clients about disconnection
    io.emit("client-disconnected", clientId);

    // Broadcast updated users list
    io.emit("users-update", users);
  });
});

// Helper to generate a random color
function getRandomColor() {
  const colors = [
    "#3498db",
    "#e74c3c",
    "#2ecc71",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#d35400",
    "#34495e",
    "#c0392b",
    "#16a085",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Get local IP addresses
const getLocalIPs = () => {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const iface of Object.values(interfaces)) {
    for (const alias of iface) {
      if (alias.family === "IPv4" && !alias.internal) {
        addresses.push(alias.address);
      }
    }
  }

  return addresses;
};

// API endpoints
app.get("/api/drawings", (req, res) => {
  res.json(drawings);
});

app.get("/api/users", (req, res) => {
  res.json(users);
});

// Restore backup endpoint (protected with a simple key)
app.post("/api/restore-backup", (req, res) => {
  const { key } = req.body;

  if (key !== "restore-key-123") {
    return res.status(401).json({ error: "Invalid key" });
  }

  if (drawingsBackup.length > 0) {
    drawings.length = 0;
    drawings.push(...drawingsBackup);
    io.emit("init-drawings", drawings);
    res.json({ success: true, restored: drawingsBackup.length });
  } else {
    res.status(404).json({ error: "No backup available" });
  }
});

// Serve a simple landing page with connection info
app.get("/", (req, res) => {
  const ipAddresses = getLocalIPs();
  const port = process.env.PORT || 5000;

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Collaborative Whiteboard Server</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        line-height: 1.6;
        background-color: #f8f9fa;
      }
      h1, h2, h3 {
        color: #333;
      }
      h1 {
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
        margin-bottom: 20px;
      }
      .card {
        background: white;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
      }
      code {
        background: #e0e0e0;
        padding: 2px 5px;
        border-radius: 3px;
        font-family: monospace;
      }
      .info {
        color: #0066cc;
        font-weight: bold;
      }
      .stats {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }
      .stat-card {
        padding: 15px;
        border-radius: 8px;
        min-width: 150px;
        text-align: center;
        color: white;
        flex: 1;
      }
      .blue {
        background: linear-gradient(135deg, #3498db, #2980b9);
      }
      .green {
        background: linear-gradient(135deg, #2ecc71, #27ae60);
      }
      .purple {
        background: linear-gradient(135deg, #9b59b6, #8e44ad);
      }
      .value {
        font-size: 32px;
        font-weight: bold;
        margin: 5px 0;
      }
      .label {
        font-size: 14px;
        opacity: 0.9;
      }
    </style>
  </head>
  <body>
    <h1>Collaborative Whiteboard Server</h1>
    
    <div class="stats">
      <div class="stat-card blue">
        <div class="value">${Object.keys(users).length}</div>
        <div class="label">Connected Users</div>
      </div>
      <div class="stat-card green">
        <div class="value">${drawings.length}</div>
        <div class="label">Drawing Elements</div>
      </div>
      <div class="stat-card purple">
        <div class="value">${drawingsBackup.length}</div>
        <div class="label">Backup Elements</div>
      </div>
    </div>
    
    <div class="card">
      <h2>Server Status</h2>
      <p>✅ Server is running and ready to accept connections</p>
      <p>Server started: <span class="info">${new Date().toLocaleString()}</span></p>
    </div>
    
    <div class="card">
      <h2>Connection Information</h2>
      <p>To connect to this server from your whiteboard client:</p>
      <p>1. Open your client's configuration file (<code>client/src/App.js</code>)</p>
      <p>2. Update the <code>SERVER_URL</code> constant with one of these values:</p>
      <ul>
        <li>Local access: <code>const SERVER_URL = 'http://localhost:${port}';</code></li>
        ${ipAddresses
          .map(
            (ip) =>
              `<li>Network access: <code>const SERVER_URL = 'http://${ip}:${port}';</code></li>`
          )
          .join("")}
      </ul>
    </div>
    
    <div class="card">
      <h2>API Endpoints</h2>
      <ul>
        <li><a href="/api/drawings">/api/drawings</a> - View current drawings data</li>
        <li><a href="/api/users">/api/users</a> - View connected users</li>
      </ul>
    </div>
  </body>
  </html>
  `;

  res.send(html);
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);

  // Display access URLs
  const ipAddresses = getLocalIPs();
  console.log("\nAccess URLs:");
  console.log(`Local: http://localhost:${PORT}`);
  ipAddresses.forEach((ip) => {
    console.log(`Network: http://${ip}:${PORT}`);
  });
  console.log("\nFor clients, use these URLs in the client configuration.");
});

// Add unhandled rejection handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  // Application specific logging, throwing an error, or other logic here
});

// Add uncaught exception handler
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Attempt to gracefully shutdown
  process.exit(1);
});

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("Shutting down server...");

  try {
    // Close all socket connections
    if (io && io.sockets && io.sockets.sockets) {
      const sockets = io.sockets.sockets;
      if (typeof sockets.forEach === "function") {
        sockets.forEach((socket) => {
          if (socket && typeof socket.disconnect === "function") {
            console.log(`Forcefully closing socket: ${socket.id}`);
            socket.disconnect(true);
          }
        });
      } else if (sockets instanceof Map) {
        // Handle Socket.IO v4 which uses a Map
        sockets.forEach((socket, id) => {
          console.log(`Forcefully closing socket: ${id}`);
          socket.disconnect(true);
        });
      }
    }
  } catch (err) {
    console.error("Error during socket disconnection:", err);
  }

  // Set a timeout to force exit if graceful shutdown takes too long
  const forceExitTimeout = setTimeout(() => {
    console.log("Forcing server shutdown after timeout");
    process.exit(0);
  }, 3000);

  // Clear the timeout if server closes properly
  try {
    server.close(() => {
      clearTimeout(forceExitTimeout);
      console.log("Server shut down successfully");
      process.exit(0);
    });
  } catch (err) {
    console.error("Error closing server:", err);
    clearTimeout(forceExitTimeout);
    process.exit(1);
  }
});
