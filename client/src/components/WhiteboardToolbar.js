import React, { useState } from "react";

const WhiteboardToolbar = ({ settings, onSettingsChange, onClear, onSave }) => {
  const [showPalette, setShowPalette] = useState(false);
  const [customColor, setCustomColor] = useState("#000000");

  const tools = [
    { id: "pencil", icon: "✏️", label: "Pencil" },
    { id: "line", icon: "➖", label: "Line" },
    { id: "rectangle", icon: "🔲", label: "Rectangle" },
    { id: "circle", icon: "⭕", label: "Circle" },
    { id: "eraser", icon: "🧽", label: "Eraser" },
    { id: "text", icon: "🔤", label: "Text" },
  ];

  const colors = [
    { color: "#000000", name: "Black" },
    { color: "#FFFFFF", name: "White" },
    { color: "#FF0000", name: "Red" },
    { color: "#00FF00", name: "Green" },
    { color: "#0000FF", name: "Blue" },
    { color: "#FFFF00", name: "Yellow" },
    { color: "#FF00FF", name: "Magenta" },
    { color: "#00FFFF", name: "Cyan" },
    { color: "#FFA500", name: "Orange" },
    { color: "#800080", name: "Purple" },
  ];

  const lineWidths = [2, 4, 6, 10, 16];

  const handleCustomColorChange = (e) => {
    setCustomColor(e.target.value);
  };

  const applyCustomColor = () => {
    onSettingsChange({ color: customColor });
    setShowPalette(false);
  };

  return (
    <div className="toolbar-container">
      <div className="toolbar bg-white border rounded shadow-sm p-4 mb-4">
        <div className="container-fluid">
          <div className="row mb-3">
            {/* Tools */}
            <div className="col-md-4 mb-3">
              <label className="text-uppercase fw-bold small text-muted mb-2">
                Tools
              </label>
              <div className="btn-group flex-wrap" role="group">
                {tools.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={`btn ${
                      settings.tool === tool.id
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => onSettingsChange({ tool: tool.id })}
                    title={tool.label}
                  >
                    <span style={{ fontSize: "1.2rem" }}>{tool.icon}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div className="col-md-5 mb-3">
              <label className="text-uppercase fw-bold small text-muted mb-2">
                Color
              </label>
              <div className="d-flex align-items-start flex-wrap">
                <div
                  className="d-flex flex-wrap me-3"
                  style={{ maxWidth: "200px" }}
                >
                  {colors.map(({ color, name }) => (
                    <button
                      key={color}
                      className="me-1 mb-1"
                      style={{
                        backgroundColor: color,
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        border:
                          settings.color === color
                            ? "2px solid #333"
                            : "1px solid #ccc",
                        cursor: "pointer",
                        transition: "transform 0.2s ease-in-out",
                      }}
                      onClick={() => onSettingsChange({ color })}
                      title={name}
                      onMouseOver={(e) =>
                        (e.currentTarget.style.transform = "scale(1.2)")
                      }
                      onMouseOut={(e) =>
                        (e.currentTarget.style.transform = "scale(1)")
                      }
                    />
                  ))}
                  <div style={{ marginLeft: "15%" }}>
                    <button
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setShowPalette(!showPalette)}
                    >
                      Custom
                    </button>
                    {showPalette && (
                      <div className="position-relative mt-2">
                        <div
                          className="position-absolute bg-white p-3 border rounded shadow-sm"
                          style={{ zIndex: 10 }}
                        >
                          <input
                            type="color"
                            value={customColor}
                            onChange={handleCustomColorChange}
                            className="form-control mb-2"
                            style={{ width: "100px", height: "40px" }}
                          />
                          <button
                            className="btn btn-sm btn-primary w-100"
                            onClick={applyCustomColor}
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Line Width & Actions */}
          <div className="row align-items-center">
            {/* Line Width */}
            <div className="col-md-3 mb-3">
              <label className="text-uppercase fw-bold small text-muted mb-2">
                Line Width
              </label>
              <div className="d-flex flex-wrap">
                {lineWidths.map((width) => (
                  <button
                    key={width}
                    className={`btn btn-sm me-1 mb-1 ${
                      settings.lineWidth === width
                        ? "btn-primary"
                        : "btn-outline-secondary"
                    }`}
                    onClick={() => onSettingsChange({ lineWidth: width })}
                    style={{ width: "34px" }}
                  >
                    {width}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="col-md-9 text-end">
              <button className="btn btn-success me-2" onClick={onSave}>
                <i className="bi bi-download me-1"></i> Save
              </button>
              <button
                className="btn btn-warning me-2"
                onClick={() => onSettingsChange({ tool: "select" })}
                title="Select"
              >
                <i className="bi bi-cursor me-1"></i> Select
              </button>
              <button
                className="btn btn-danger"
                onClick={onClear}
                title="Clear Whiteboard"
              >
                <i className="bi bi-trash me-1"></i> Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhiteboardToolbar;
