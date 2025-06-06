import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import ConnectionStatus from "./components/ConnectionStatus";
import WhiteboardToolbar from "./components/WhiteboardToolbar";
import NetworkInfo from "./components/NetworkInfo";
import UserCursors from "./components/UserCursors";
import UsersList from "./components/UsersList";

// Get SERVER_URL from localStorage or use default
const DEFAULT_SERVER_URL = "http://10.201.165.213:5000";
const SERVER_URL =
  localStorage.getItem("whiteboardServerUrl") || DEFAULT_SERVER_URL;

const GLOBAL_CLEAR_COMMAND_TYPE = "global-full-clear-command"; // New type for global clear
console.log(
  "[App.js] GLOBAL_CLEAR_COMMAND_TYPE initialized to:",
  GLOBAL_CLEAR_COMMAND_TYPE
); // Verify on load

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [clientId, setClientId] = useState("");
  const [connectionError, setConnectionError] = useState(null);
  const [userName, setUserName] = useState(() => {
    const savedName = localStorage.getItem("whiteboardUserName");
    return savedName || `User-${Math.floor(Math.random() * 1000)}`;
  });
  const [serverUrl, setServerUrl] = useState(SERVER_URL);
  const [connectedUsers, setConnectedUsers] = useState({});
  const [cursors, setCursors] = useState({});
  const [drawingSettings, setDrawingSettings] = useState({
    color: "#000000",
    lineWidth: 4,
    tool: "pencil",
  });

  // Element states
  const [selectedElement, setSelectedElement] = useState(null);
  const [action, setAction] = useState("none"); // none, drawing, moving, resizing
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const elementsRef = useRef([]);

  console.log(
    "[App.js Function Scope] GLOBAL_CLEAR_COMMAND_TYPE is:",
    GLOBAL_CLEAR_COMMAND_TYPE
  ); // Verify in function scope

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size to match container
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Setup canvas context
    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = drawingSettings.color;
    ctx.lineWidth = drawingSettings.lineWidth;
    contextRef.current = ctx;

    // Handle window resize
    const handleResize = debounce(() => {
      const currentDrawings = canvas.toDataURL();
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;

      // Restore context settings after resize
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = drawingSettings.color;
      ctx.lineWidth = drawingSettings.lineWidth;

      // Restore drawings
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = currentDrawings;
    }, 200);

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [drawingSettings.color, drawingSettings.lineWidth]);

  // Connect to the socket server
  useEffect(() => {
    console.log(`Attempting to connect to server at ${serverUrl}`);
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 10;

    const newSocket = io(serverUrl, {
      reconnectionAttempts: maxReconnectAttempts,
      reconnectionDelay: 1000,
      timeout: 10000,
      query: { userName },
    });

    // Better connection management
    newSocket.on("connect", () => {
      console.log(`Connected to server with ID: ${newSocket.id}`);
      setConnected(true);
      setClientId(newSocket.id);
      reconnectAttempts = 0;

      // Identify user to server
      newSocket.emit("user-info", {
        userName,
        color: getRandomColor(),
      });

      // Request current drawings and users immediately after connection
      newSocket.emit("request-initial-state");
    });

    newSocket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      setConnected(false);
      setConnectionError(`Connection error: ${error.message}`);
      reconnectAttempts++;

      if (reconnectAttempts >= maxReconnectAttempts) {
        console.error("Maximum reconnection attempts reached");
        setConnectionError(
          `Failed to connect after ${maxReconnectAttempts} attempts. Check server URL and try again.`
        );

        // Save any unsaved work to local storage
        if (elementsRef.current.length > 0 && canvasRef.current) {
          try {
            const dataUrl = canvasRef.current.toDataURL();
            localStorage.setItem("whiteboard_backup", dataUrl);
            localStorage.setItem(
              "whiteboard_backup_time",
              new Date().toISOString()
            );
            console.log("Whiteboard state saved to local storage");
          } catch (err) {
            console.error("Failed to save whiteboard state:", err);
          }
        }
      }
    });

    // After connect_error handler and before the undo handler
    newSocket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnected(false);
      setConnectionError(
        "Disconnected from server. Attempting to reconnect..."
      );

      // If we have unsent changes, save them locally
      if (elementsRef.current.length > 0) {
        try {
          localStorage.setItem(
            "whiteboard_elements",
            JSON.stringify(elementsRef.current)
          );
          console.log("Saved elements to local storage during disconnect");
        } catch (err) {
          console.error("Error saving elements to local storage:", err);
        }
      }
    });

    // Handle receiving undo events
    newSocket.on("undo", ({ elementId }) => {
      console.log("Received undo for element:", elementId);
      elementsRef.current = elementsRef.current.filter(
        (el) => el.id !== elementId
      );
      redrawCanvas();
    });

    // Add error handling for events
    ["error", "connect_failed", "reconnect_failed"].forEach((event) => {
      newSocket.on(event, (error) => {
        console.error(`Socket ${event}:`, error);
      });
    });

    // Add debug event to log all emitted events
    const originalEmit = newSocket.emit;
    newSocket.emit = function (event, ...args) {
      console.log(`DEBUG: Emitting '${event}' with data:`, args);
      return originalEmit.apply(this, [event, ...args]);
    };

    // Optimize object construction
    const throttledEmitCursor = throttle((x, y) => {
      if (newSocket.connected) {
        newSocket.emit("cursor-move", { x, y, userName });
      }
    }, 50);

    // Improved canvas resizing for better quality
    const handleResize = debounce(() => {
      if (!canvasRef.current || !contextRef.current) return;

      const canvas = canvasRef.current;
      const ctx = contextRef.current;

      // Save current canvas as image
      const currentDrawings = canvas.toDataURL();

      // Get current dimensions and new dimensions
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;
      const newWidth = canvas.offsetWidth;
      const newHeight = canvas.offsetHeight;

      // Calculate scaling factor
      const scaleX = newWidth / oldWidth;
      const scaleY = newHeight / oldHeight;

      // Resize canvas
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Restore context settings
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = drawingSettings.color;
      ctx.lineWidth = drawingSettings.lineWidth;

      // Restore drawings
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, newWidth, newHeight);

        // Scale all elements
        elementsRef.current = elementsRef.current.map((el) => {
          const scaledEl = { ...el };
          // Scale element properties based on type
          switch (el.type) {
            case "line":
              scaledEl.startX *= scaleX;
              scaledEl.startY *= scaleY;
              scaledEl.endX *= scaleX;
              scaledEl.endY *= scaleY;
              break;
            case "rectangle":
              scaledEl.startX *= scaleX;
              scaledEl.startY *= scaleY;
              scaledEl.width *= scaleX;
              scaledEl.height *= scaleY;
              break;
            case "circle":
              scaledEl.centerX *= scaleX;
              scaledEl.centerY *= scaleY;
              scaledEl.radius *= Math.min(scaleX, scaleY);
              break;
            case "text":
              scaledEl.x *= scaleX;
              scaledEl.y *= scaleY;
              // Adjust font size
              const fontSize = parseInt(el.font);
              if (!isNaN(fontSize)) {
                const newFontSize = fontSize * Math.min(scaleX, scaleY);
                scaledEl.font = el.font.replace(
                  /\d+px/,
                  `${Math.round(newFontSize)}px`
                );
              }
              break;
            case "pencil":
              if (el.points) {
                scaledEl.points = el.points.map((point) => ({
                  x: point.x * scaleX,
                  y: point.y * scaleY,
                }));
              }
              break;
          }
          return scaledEl;
        });
      };
      img.src = currentDrawings;
    }, 250);

    newSocket.on("init-drawings", (drawings) => {
      console.log(`Received ${drawings.length} initial drawings`);
      if (!contextRef.current) {
        console.warn("Canvas context not ready yet");
        return;
      }

      // Save elements for potential manipulation
      elementsRef.current = drawings;

      // Redraw all saved elements
      redrawCanvas();
    });

    newSocket.on("users-update", (users) => {
      console.log("Received users update:", users);
      // Make sure users is an object and not null
      if (users && typeof users === "object") {
        setConnectedUsers(users);
      } else {
        console.error("Received invalid users data:", users);
      }
    });

    newSocket.on("cursor-move", (data) => {
      if (data.clientId !== newSocket.id) {
        setCursors((prev) => ({
          ...prev,
          [data.clientId]: {
            x: data.x,
            y: data.y,
            userName: data.userName,
            color: data.color,
          },
        }));
      }
    });

    newSocket.on("draw-element", (element) => {
      console.log(
        "[draw-element handler] Received element. Type:",
        element && element.type,
        "ID:",
        element && element.id,
        "GLOBAL_TYPE_CHECK:",
        GLOBAL_CLEAR_COMMAND_TYPE
      );

      if (!element || !element.type) {
        console.warn(
          "Received malformed element or element without type:",
          element
        );
        return;
      }

      // DEBUG: Log every element received
      // console.log('Socket event: draw-element, received:', JSON.parse(JSON.stringify(element)));

      // PRIORITY 1: Handle Global Clear Command
      if (element.type === GLOBAL_CLEAR_COMMAND_TYPE) {
        console.log(
          `Processing ${GLOBAL_CLEAR_COMMAND_TYPE} command from user: ${element.userName} (ID: ${element.createdBy})`
        );
        if (contextRef.current && canvasRef.current) {
          console.log(
            "Clearing canvas context and elementsRef due to global clear command."
          );
          contextRef.current.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
          elementsRef.current = []; // Clear all stored drawing elements
        } else {
          console.error(
            "Cannot execute global clear: canvas or context not ready."
          );
        }
        return; // IMPORTANT: Stop further processing for this special command
      }

      // Remove or comment out old clear logic:
      // if (element.type === 'delete-user-elements') { ... }
      // if (element.type === SPECIAL_CLEAR_TYPE) { ... } // SPECIAL_CLEAR_TYPE should also be removed/undefined
      // if (element.isClearCommand) { ... } // For rectangle-based clear

      // Standard drawing element processing:
      const elementExists = elementsRef.current.some(
        (el) => el.id === element.id
      );

      if (elementExists) {
        // This usually means it's an element created by this client, echoed back by the server.
        // Or it could be an update to an existing element if that feature is added.
        // For simple drawing, if it's our own and exists, we probably drew it optimistically.
        if (element.createdBy === clientId) {
          console.log(
            "Skipping own element received from server (already drawn or processed locally): ",
            element.id
          );
          return;
        }
        // If it is from another user and somehow already exists, replace it to be safe (e.g. if it's an update)
        // This situation should be rare for new drawings.
        console.warn(
          "Element with ID already exists, replacing (potentially an update from another user):",
          element.id
        );
        elementsRef.current = elementsRef.current.map((el) =>
          el.id === element.id ? element : el
        );
      } else {
        // New element from another user, or our own element that wasn't drawn optimistically (less common).
        elementsRef.current.push(element);
      }

      // Redraw the entire canvas with the updated list of elements.
      redrawCanvas();
    });

    newSocket.on("clear-canvas", (data) => {
      console.log(
        "Canvas cleared by user:",
        data?.clearedBy || "unknown",
        "timestamp:",
        data?.timestamp
      );
      elementsRef.current = [];
      clearCanvas();

      // Force a redraw in case there are any lingering elements
      if (contextRef.current && canvasRef.current) {
        contextRef.current.clearRect(
          0,
          0,
          canvasRef.current.width,
          canvasRef.current.height
        );
      }
    });

    newSocket.on("client-disconnected", (disconnectedClientId) => {
      console.log("Client disconnected", disconnectedClientId);
      setCursors((prev) => {
        const newCursors = { ...prev };
        delete newCursors[disconnectedClientId];
        return newCursors;
      });
    });

    // Add drawing settings synchronization
    newSocket.on("drawing-settings-change", (settings) => {
      console.log("Received drawing settings change:", settings);
      // Only update if it's not from this client
      if (settings.clientId !== newSocket.id) {
        setDrawingSettings((prev) => ({
          ...prev,
          ...settings.settings,
        }));
      }
    });

    newSocket.on("direct-message", (data) => {
      console.log("Received direct message:", data);
    });

    setSocket(newSocket);

    // Send cursor position every 50ms if changed
    let lastSentPosition = { x: 0, y: 0 };

    const handleMouseMove = (e) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Only send if position changed significantly
      if (
        Math.abs(x - lastSentPosition.x) > 5 ||
        Math.abs(y - lastSentPosition.y) > 5
      ) {
        newSocket.emit("cursor-move", { x, y, userName });
        lastSentPosition = { x, y };
      }

      // Update position for tooltip
      setPosition({ x, y });
    };

    document.addEventListener("mousemove", handleMouseMove);

    // Cleanup on component unmount
    return () => {
      console.log("Disconnecting socket");
      document.removeEventListener("mousemove", handleMouseMove);
      newSocket.disconnect();
    };
  }, [userName, serverUrl]);

  // Effect for updating drawing context when settings change
  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = drawingSettings.color;
      contextRef.current.lineWidth = drawingSettings.lineWidth;

      if (drawingSettings.tool === "eraser") {
        contextRef.current.globalCompositeOperation = "destination-out";
      } else {
        contextRef.current.globalCompositeOperation = "source-over";
      }
    }
  }, [drawingSettings]);

  // Function to change server URL
  const changeServerUrl = (newUrl) => {
    if (newUrl && newUrl !== serverUrl) {
      // Save to localStorage
      localStorage.setItem("whiteboardServerUrl", newUrl);

      // Disconnect current socket if any
      if (socket) {
        socket.disconnect();
      }

      // Update state
      setServerUrl(newUrl);
      setConnected(false);

      // Force page reload to reconnect
      window.location.reload();
    }
  };

  // User name change handler
  const handleUserNameChange = (newName) => {
    setUserName(newName);
    localStorage.setItem("whiteboardUserName", newName);
    if (socket && connected) {
      socket.emit("user-info", { userName: newName });
    }
  };

  // Redraw the entire canvas
  const redrawCanvas = () => {
    if (!contextRef.current || !canvasRef.current) {
      console.error("redrawCanvas: Canvas or context not available.");
      return;
    }
    const ctx = contextRef.current;
    const canvas = canvasRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // console.log(`redrawCanvas: Redrawing ${elementsRef.current.length} elements.`);
    elementsRef.current.forEach((element) => {
      // IMPORTANT: Do not attempt to "draw" the global clear command itself
      if (element && element.type !== GLOBAL_CLEAR_COMMAND_TYPE) {
        try {
          drawElement(ctx, element);
        } catch (e) {
          console.error("redrawCanvas: Error calling drawElement:", e, element);
        }
      }
    });
  };

  // Start drawing
  const startDrawing = (e) => {
    if (!contextRef.current || !connected) return;

    const { offsetX, offsetY } = getCoordinates(e);
    lastPosRef.current = { x: offsetX, y: offsetY };

    if (drawingSettings.tool === "select") {
      // Check if clicked on an element
      const clickedElement = elementsRef.current.findLast((el) =>
        isPointInElement(offsetX, offsetY, el)
      );

      if (clickedElement) {
        setSelectedElement(clickedElement);
        setAction("moving");
      } else {
        setSelectedElement(null);
      }
      return;
    }

    isDrawingRef.current = true;
    setAction("drawing");

    // Create new element based on selected tool
    const newElement = {
      type: drawingSettings.tool,
      color: drawingSettings.color,
      lineWidth: drawingSettings.lineWidth,
      createdBy: clientId,
      createdAt: new Date().toISOString(),
    };

    // Tool-specific properties
    switch (drawingSettings.tool) {
      case "pencil":
        newElement.points = [{ x: offsetX, y: offsetY }];
        break;
      case "line":
        newElement.startX = offsetX;
        newElement.startY = offsetY;
        newElement.endX = offsetX;
        newElement.endY = offsetY;
        break;
      case "rectangle":
        newElement.startX = offsetX;
        newElement.startY = offsetY;
        newElement.width = 0;
        newElement.height = 0;
        break;
      case "circle":
        newElement.centerX = offsetX;
        newElement.centerY = offsetY;
        newElement.radius = 0;
        break;
      case "text":
        const text = prompt("Enter text:");
        if (text) {
          newElement.text = text;
          newElement.x = offsetX;
          newElement.y = offsetY;
          newElement.font = `${drawingSettings.lineWidth * 5}px Arial`;
        } else {
          isDrawingRef.current = false;
          return;
        }
        break;
      case "eraser":
        newElement.type = "pencil"; // Eraser is just a white pencil
        newElement.color = "#FFFFFF";
        newElement.points = [{ x: offsetX, y: offsetY }];

        break;
    }

    // Store element temporarily
    elementsRef.current.push(newElement);

    // For dots, draw immediately
    if (
      drawingSettings.tool === "pencil" ||
      drawingSettings.tool === "eraser"
    ) {
      contextRef.current.beginPath();
      contextRef.current.arc(
        offsetX,
        offsetY,
        drawingSettings.lineWidth / 2,
        0,
        Math.PI * 2
      );
      contextRef.current.fillStyle =
        drawingSettings.tool === "eraser" ? "#FFFFFF" : drawingSettings.color;
      contextRef.current.fill();
    }

    // For finished tools like text, send immediately
    if (drawingSettings.tool === "text") {
      isDrawingRef.current = false;

      // Draw locally
      drawElement(contextRef.current, newElement);

      // Send to server
      if (socket) {
        console.log("Sending drawing element to server:", newElement);
        socket.emit("draw-element", newElement);
      }
    }
  };

  // Draw
  const draw = (e) => {
    const ctx = contextRef.current;
    if (!ctx || !canvasRef.current) return;

    const { offsetX, offsetY } = getCoordinates(e);

    // Update tooltip position
    setPosition({ x: offsetX, y: offsetY });
    setShowTooltip(true);

    // If using select tool
    if (action === "moving" && selectedElement) {
      // Calculate movement delta
      const deltaX = offsetX - lastPosRef.current.x;
      const deltaY = offsetY - lastPosRef.current.y;

      // Update element position
      moveElement(selectedElement, deltaX, deltaY);

      // Redraw canvas
      redrawCanvas();

      // Update last position
      lastPosRef.current = { x: offsetX, y: offsetY };
      return;
    }

    // Regular drawing
    if (!isDrawingRef.current) return;

    // Get the last element (the one we're currently drawing)
    const currentElement = elementsRef.current[elementsRef.current.length - 1];

    // Update element based on tool
    switch (currentElement.type) {
      case "pencil":
        currentElement.points.push({ x: offsetX, y: offsetY });
        // Draw line from last point
        const lastPoint =
          currentElement.points[currentElement.points.length - 2];
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
        break;
      case "line":
        // Update end point
        currentElement.endX = offsetX;
        currentElement.endY = offsetY;
        // Redraw
        redrawCanvas();
        break;
      case "rectangle":
        // Update width and height
        currentElement.width = offsetX - currentElement.startX;
        currentElement.height = offsetY - currentElement.startY;
        // Redraw
        redrawCanvas();
        break;
      case "circle":
        // Update radius
        const dx = offsetX - currentElement.centerX;
        const dy = offsetY - currentElement.centerY;
        currentElement.radius = Math.sqrt(dx * dx + dy * dy);
        // Redraw
        redrawCanvas();
        break;
    }

    lastPosRef.current = { x: offsetX, y: offsetY };
  };

  // End drawing
  const endDrawing = () => {
    if (!isDrawingRef.current) {
      setAction("none");
      return;
    }

    isDrawingRef.current = false;
    setAction("none");

    // Get the last element (the one we just finished drawing)
    const finishedElement = elementsRef.current[elementsRef.current.length - 1];

    // Send to server if it's a valid element
    if (finishedElement && socket && connected) {
      console.log("Sending drawing element to server:", finishedElement);

      // Add a timestamp if not present
      if (!finishedElement.createdAt) {
        finishedElement.createdAt = new Date().toISOString();
      }

      socket.emit("draw-element", finishedElement);
    }
  };

  // Check if point is inside an element
  const isPointInElement = (x, y, element) => {
    switch (element.type) {
      case "line":
        // Check if point is near the line
        const distance = distanceToLine(
          x,
          y,
          element.startX,
          element.startY,
          element.endX,
          element.endY
        );
        return distance < 10; // 10px tolerance
      case "rectangle":
        // Check if point is inside rectangle
        const minX = Math.min(element.startX, element.startX + element.width);
        const maxX = Math.max(element.startX, element.startX + element.width);
        const minY = Math.min(element.startY, element.startY + element.height);
        const maxY = Math.max(element.startY, element.startY + element.height);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
      case "circle":
        // Check if point is inside circle
        const dx = x - element.centerX;
        const dy = y - element.centerY;
        return Math.sqrt(dx * dx + dy * dy) <= element.radius;
      case "text":
        // Check if point is near text (simple box check)
        const textWidth = contextRef.current.measureText(element.text).width;
        return (
          x >= element.x &&
          x <= element.x + textWidth &&
          y >= element.y - parseInt(element.font) &&
          y <= element.y
        );
      default:
        return false;
    }
  };

  // Calculate distance from point to line
  const distanceToLine = (x, y, x1, y1, x2, y2) => {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;

    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;

    return Math.sqrt(dx * dx + dy * dy);
  };

  // Move element by delta
  const moveElement = (element, deltaX, deltaY) => {
    switch (element.type) {
      case "line":
        element.startX += deltaX;
        element.startY += deltaY;
        element.endX += deltaX;
        element.endY += deltaY;
        break;
      case "rectangle":
        element.startX += deltaX;
        element.startY += deltaY;
        break;
      case "circle":
        element.centerX += deltaX;
        element.centerY += deltaY;
        break;
      case "text":
        element.x += deltaX;
        element.y += deltaY;
        break;
      case "pencil":
        element.points = element.points.map((point) => ({
          x: point.x + deltaX,
          y: point.y + deltaY,
        }));
        break;
    }
  };

  // Enhance the getCoordinates function for better touch support
  const getCoordinates = (e) => {
    if (!canvasRef.current) return { offsetX: 0, offsetY: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    let offsetX, offsetY;

    // Touch event handling
    if (e.type.includes("touch")) {
      const touch = e.touches[0] || e.changedTouches[0];
      if (!touch) return { offsetX: 0, offsetY: 0 };

      offsetX = touch.clientX - rect.left;
      offsetY = touch.clientY - rect.top;

      // Prevent scrolling while drawing on mobile
      e.preventDefault();
    } else {
      // Mouse event handling
      offsetX = e.nativeEvent.offsetX || e.nativeEvent.clientX - rect.left;
      offsetY = e.nativeEvent.offsetY || e.nativeEvent.clientY - rect.top;
    }

    // Constrain to canvas boundaries
    offsetX = Math.max(0, Math.min(offsetX, rect.width));
    offsetY = Math.max(0, Math.min(offsetY, rect.height));

    return { offsetX, offsetY };
  };

  // Draw element on canvas
  const drawElement = (ctx, element) => {
    if (!element || !ctx || !canvasRef.current) {
      // console.warn('drawElement: called with invalid params', {hasElement: !!element, hasCtx: !!ctx, hasCanvas: !!canvasRef.current});
      return;
    }

    // IMPORTANT: Explicitly do nothing if it's a global clear command
    if (element.type === GLOBAL_CLEAR_COMMAND_TYPE) {
      // console.log('drawElement: Encountered GLOBAL_CLEAR_COMMAND_TYPE, skipping drawing.');
      return;
    }

    // Fallback for any other unknown types that aren't drawable
    const drawableTypes = ["pencil", "line", "rectangle", "circle", "text"];
    if (!drawableTypes.includes(element.type)) {
      // console.warn(`drawElement: Attempted to draw unknown or non-drawable element type: ${element.type}`, element);
      return;
    }

    ctx.strokeStyle = element.color;
    ctx.fillStyle = element.color;
    ctx.lineWidth = element.lineWidth;
    // Ensure globalCompositeOperation is set correctly for normal drawing vs eraser
    if (
      element.type === "pencil" &&
      element.color === "#FFFFFF" &&
      drawingSettings.tool === "eraser"
    ) {
      // This condition is tricky, eraser is just a white pencil.
      // The actual eraser effect via globalCompositeOperation is handled in drawingSettings useEffect.
      // Here, we just draw. If it's meant to be an eraser line, it should have the eraser's color.
    } else {
      ctx.globalCompositeOperation = "source-over";
    }

    switch (element.type) {
      case "pencil":
        if (element.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(element.points[0].x, element.points[0].y);

        for (let i = 1; i < element.points.length; i++) {
          ctx.lineTo(element.points[i].x, element.points[i].y);
        }

        ctx.stroke();
        break;

      case "line":
        ctx.beginPath();
        ctx.moveTo(element.startX, element.startY);
        ctx.lineTo(element.endX, element.endY);
        ctx.stroke();
        break;

      case "rectangle":
        ctx.beginPath();
        ctx.rect(element.startX, element.startY, element.width, element.height);

        if (element.fill) {
          ctx.fill();
        } else {
          ctx.stroke();
        }
        break;

      case "circle":
        ctx.beginPath();
        ctx.arc(
          element.centerX,
          element.centerY,
          element.radius,
          0,
          Math.PI * 2
        );
        ctx.stroke();
        break;

      case "text":
        ctx.font = element.font;
        ctx.fillText(element.text, element.x, element.y);
        break;
    }
  };

  // Update drawing settings
  const handleSettingsChange = (newSettings) => {
    setDrawingSettings((prev) => {
      const updated = {
        ...prev,
        ...newSettings,
      };

      // Emit settings change to other clients
      if (socket && connected) {
        // socket.emit("drawing-settings-change", {
        //   clientId: clientId,
        //   settings: newSettings,
        // });
        socket.emit("draw", {
          clientId: clientId,
          settings: newSettings,
        });
      }

      return updated;
    });
  };

  // Simplified clearCanvas for global clear only
  const clearCanvas = () => {
    console.log(
      "[clearCanvas] Function called. Attempting global clear. GLOBAL_TYPE:",
      GLOBAL_CLEAR_COMMAND_TYPE
    );

    if (!socket || !socket.connected) {
      console.error(
        "[clearCanvas] Socket not available or not connected. Cannot send global clear command."
      );
      alert(
        "Error: Not connected to server. Cannot clear whiteboard globally."
      );
      return;
    }

    console.log(
      `[clearCanvas] Proceeding to send ${GLOBAL_CLEAR_COMMAND_TYPE} command.`
    );

    const clearCommandPayload = {
      id: `${GLOBAL_CLEAR_COMMAND_TYPE}-${Date.now()}-${clientId}`,
      type: GLOBAL_CLEAR_COMMAND_TYPE,
      createdBy: clientId,
      userName: userName,
      timestamp: new Date().toISOString(),
    };

    console.log(
      "[clearCanvas] Clear command payload prepared:",
      JSON.stringify(clearCommandPayload)
    );

    if (socket && typeof socket.emit === "function") {
      socket.emit("draw-element", clearCommandPayload);
      console.log(
        `[clearCanvas] 'draw-element' event EMITTED with the clear command payload.`
      );
    } else {
      console.error(
        "[clearCanvas] CRITICAL: socket object or socket.emit function is not available!"
      );
      alert(
        "CRITICAL ERROR: Unable to send clear command to server (socket issue)."
      );
    }
  };

  // Save canvas as image
  const saveCanvas = () => {
    if (!canvasRef.current) return;

    // Create temporary link
    const link = document.createElement("a");
    link.download = `whiteboard-${new Date().toISOString().split("T")[0]}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  // Generate random color
  const getRandomColor = () => {
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
  };

  // Add a new useEffect for loading from local storage on initial render
  useEffect(() => {
    // Attempt to restore from local storage when component mounts
    const storedElements = localStorage.getItem("whiteboard_elements");
    const backupImage = localStorage.getItem("whiteboard_backup");
    const backupTime = localStorage.getItem("whiteboard_backup_time");

    if (storedElements || backupImage) {
      // If we have both, show a confirm dialog to choose which to restore
      if (
        storedElements &&
        backupImage &&
        confirm(
          `Unsaved drawing data found from ${new Date(
            backupTime
          ).toLocaleString()}. Would you like to restore it?`
        )
      ) {
        try {
          // Parse stored elements and add to elements array
          const parsedElements = JSON.parse(storedElements);
          if (Array.isArray(parsedElements) && parsedElements.length > 0) {
            console.log(
              `Restored ${parsedElements.length} elements from local storage`
            );

            // Wait for canvas to be initialized
            const checkCanvas = setInterval(() => {
              if (canvasRef.current && contextRef.current) {
                clearInterval(checkCanvas);
                elementsRef.current = parsedElements;
                redrawCanvas();

                // Clear storage after successful restore
                localStorage.removeItem("whiteboard_elements");
                localStorage.removeItem("whiteboard_backup");
                localStorage.removeItem("whiteboard_backup_time");
              }
            }, 100);
          }
        } catch (error) {
          console.error(
            "Failed to restore elements from local storage:",
            error
          );

          // Fall back to image backup if available
          if (backupImage && canvasRef.current && contextRef.current) {
            const img = new Image();
            img.onload = () => {
              const ctx = contextRef.current;
              ctx.drawImage(
                img,
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
              );
            };
            img.src = backupImage;
          }
        }
      }
    }
  }, []);

  // Add connection diagnostic function
  const diagnoseConnection = () => {
    if (!socket) {
      setConnectionError(
        "No socket connection established. Please check your server URL."
      );
      return;
    }

    console.log("Running connection diagnostics...");

    // Check if socket is connected
    if (!socket.connected) {
      setConnectionError("Socket is not connected. Attempting to reconnect...");
      socket.connect();
      return;
    }

    // Ping server to check connection
    const pingStart = Date.now();
    socket.emit("ping", {}, () => {
      const pingTime = Date.now() - pingStart;
      console.log(`Server ping time: ${pingTime}ms`);

      if (pingTime > 500) {
        setConnectionError(
          `High latency detected (${pingTime}ms). This may cause synchronization delays.`
        );
      } else {
        setConnectionError(null);
        console.log("Connection diagnostics passed");
      }
    });

    // Check if we're missing users
    if (Object.keys(connectedUsers).length === 0) {
      console.log("No users detected. Requesting users list update...");
      socket.emit("request-initial-state");
    }
  };

  // Add an automatic saving function
  useEffect(() => {
    // Auto-save to local storage every 30 seconds if we have elements
    const autoSaveInterval = setInterval(() => {
      if (elementsRef.current.length > 0) {
        try {
          localStorage.setItem(
            "whiteboard_autosave",
            JSON.stringify(elementsRef.current)
          );
          console.log("Auto-saved drawings to local storage");
        } catch (error) {
          console.error("Failed to auto-save drawings:", error);
        }
      }
    }, 30000);

    return () => clearInterval(autoSaveInterval);
  }, []);

  return (
    <div className="container">
      <ConnectionStatus
        connected={connected}
        error={connectionError}
        serverUrl={serverUrl}
        onServerUrlChange={changeServerUrl}
        onDiagnose={diagnoseConnection}
      />
      <NetworkInfo
        connected={connected}
        serverUrl={serverUrl}
        clientId={clientId}
      />

      <header className="app-header">
        <div className="row align-items-center">
          <div className="col-md-8">
            <h1 className="mb-0">Collaborative Whiteboard</h1>
            <p className="mb-0 mt-1">
              <span className="user-badge me-2">
                <i className="bi bi-person-circle me-1"></i>
                <span
                  className="cursor-pointer"
                  onClick={() => {
                    const newName = prompt("Enter your name:", userName);
                    if (newName && newName.trim())
                      handleUserNameChange(newName);
                  }}
                  title="Click to change name"
                >
                  {userName}
                </span>
              </span>
              <span className="user-badge">
                <i className="bi bi-people-fill me-1"></i>
                {Object.keys(connectedUsers).length || 0} online
              </span>
            </p>
          </div>
          <div className="col-md-4 text-md-end">
            <UsersList users={connectedUsers} currentUserId={clientId} />
          </div>
        </div>
      </header>

      <WhiteboardToolbar
        settings={drawingSettings}
        onSettingsChange={handleSettingsChange}
        onClear={clearCanvas}
        onSave={saveCanvas}
      />

      <div className="canvas-container">
        <canvas
          id="whiteboard"
          ref={canvasRef}
          width={1600}
          height={1200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={() => {
            endDrawing();
            setShowTooltip(false);
          }}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
          style={{ backgroundColor: "white", display: "block" }}
        />
        <UserCursors cursors={cursors} />

        {showTooltip && (
          <div
            className="position-tooltip"
            style={{
              left: position.x + 15,
              top: position.y - 25,
              position: "absolute",
              backgroundColor: "black",
              color: "white",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "12px",
            }}
          >
            x: {Math.round(position.x)}, y: {Math.round(position.y)}
          </div>
        )}
      </div>

      <div className="collaboration-indicator">
        <i className="bi bi-broadcast me-1"></i>
        {connected ? "Real-time collaboration active" : "Offline mode"}
      </div>
    </div>
  );
}

export default App;

// Add throttle and debounce functions
function throttle(callback, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall >= delay) {
      lastCall = now;
      callback(...args);
    }
  };
}

function debounce(callback, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
}
