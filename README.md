# Collaborative Whiteboard

A real-time collaborative whiteboard built as a distributed system. This application demonstrates key distributed system concepts including:

- Real-time synchronization of drawing actions across multiple clients
- Fault tolerance with node failure handling
- Distributed state management
- Network partition handling

## Features

- Draw in real-time with multiple users simultaneously
- Choose different colors and line thicknesses
- See changes from other users instantly
- Offline detection and reconnection handling
- System continues to work when some nodes disconnect
- Works on desktop and mobile devices

## Architecture

The system consists of:

1. **Coordination Server**: A Node.js server using Express and Socket.IO for real-time communication
2. **Client Nodes**: React applications with HTML5 Canvas that maintain local state and sync with the server
3. **State Management**: Distributed across server and client nodes with replication

## Technical Implementation

- **Server**: Node.js with Express and Socket.IO
- **Client**: React with HTML5 Canvas and Socket.IO client
- **Real-time Updates**: WebSockets with event-driven architecture
- **Fault Tolerance**: Local state caching and reconnection mechanisms

## Getting Started

### Prerequisites

- Node.js (v14+ recommended)
- npm or yarn

### Installation

1. Clone the repository

```
git clone <repository-url>
cd collaborative-whiteboard
```

2. Install server dependencies

```
cd server
npm install
```

3. Install client dependencies

```
cd ../client
npm install
```

### Running the Application

1. Start the server

```
cd server
npm start
```

The server will show available IP addresses to access from other devices on your network

2. Update the client configuration to use your server's IP address
   Open `client/src/App.js` and update the `SERVER_URL` constant with your server's IP address:

```javascript
const SERVER_URL = "http://YOUR_SERVER_IP:5000";
```

3. Start the client

```
cd client
npm start
```

4. Access the whiteboard:
   - On the same computer: Open your browser to http://localhost:1234
   - From other devices on the same network: Open a browser to http://YOUR_DEVICE_IP:1234
     (where YOUR_DEVICE_IP is the IP address of the computer running the client)

## Network Access

### For the host computer (running both server and client)

1. Start the server first - it will display your IP addresses
2. Use one of these IP addresses in the client configuration
3. Start the client
4. Share the client's URL with others on your network

### For other devices on the network

1. Open a browser and navigate to the client URL (e.g., http://192.168.1.5:1234)
2. Start drawing in real-time with other connected users

## Testing Distributed Features

### Fault Tolerance

1. Connect multiple browsers to the application
2. Draw something on the canvas
3. Close one of the browser tabs
4. The system continues to function for remaining clients
5. When the closed tab reconnects, it will sync with the current drawing state

### Offline Mode

1. Start the application
2. Stop the server (Ctrl+C in the server terminal)
3. Notice the "Offline" indicator in the client
4. When the server restarts, clients automatically reconnect

## License

MIT
