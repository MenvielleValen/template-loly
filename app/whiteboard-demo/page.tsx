import { useEffect, useState, useRef } from "react";
import { lolySocket } from "@lolyjs/core/sockets";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

type User = {
  userId: string;
  userName: string;
};

type DrawPoint = {
  x: number;
  y: number;
  color: string;
  lineWidth: number;
};

type DrawPath = {
  points: DrawPoint[];
  userId: string;
  userName: string;
  timestamp: number;
};

export default function WhiteboardDemoPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [userName, setUserName] = useState("");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(2);
  const [isDrawing, setIsDrawing] = useState(false);
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentPathRef = useRef<DrawPoint[]>([]);

  useEffect(() => {
    // Connect to WebSocket
    const ws = lolySocket("/whiteboard");
    setSocket(ws);

    ws.on("connect", () => {
      console.log("Connected to whiteboard namespace");
      setConnected(true);
    });

    ws.on("disconnect", () => {
      console.log("Disconnected from whiteboard namespace");
      setConnected(false);
      setRegistered(false);
    });

    ws.on("error", (error: { message: string }) => {
      console.error("WebSocket error:", error);
      alert(`Error: ${error.message}`);
    });

    ws.on("registered", (data: { userId: string; userName: string }) => {
      console.log("Registered:", data);
      setRegistered(true);
    });

    ws.on("drawing-state", (data: { paths: DrawPath[] }) => {
      // Redraw all paths when receiving initial state
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Redraw all paths
      data.paths.forEach((path) => {
        drawPath(ctx, path.points);
      });
    });

    ws.on("draw", (data: { path: DrawPath }) => {
      // Draw received path
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      drawPath(ctx, data.path.points);
    });

    ws.on("clear", () => {
      // Clear canvas
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    ws.on("users-list", (usersList: User[]) => {
      setUsers(usersList);
    });

    ws.on("user-joined", (data: { userId: string; userName: string }) => {
      console.log("User joined:", data);
    });

    ws.on("user-left", (data: { userId: string; userName: string }) => {
      console.log("User left:", data);
    });

    return () => {
      ws.disconnect();
    };
  }, []);

  // Setup canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  const drawPath = (ctx: CanvasRenderingContext2D, points: DrawPoint[]) => {
    if (points.length === 0) return;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      ctx.strokeStyle = points[i].color;
      ctx.lineWidth = points[i].lineWidth;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(points[i].x, points[i].y);
    }
  };

  const handleRegister = () => {
    if (!socket || !userName.trim()) {
      alert("Please enter a name");
      return;
    }

    socket.emit("register", {
      userId,
      userName: userName.trim(),
    });
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getTouchPos = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0] || e.changedTouches[0];
    if (!touch) return null;

    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!registered) return;

    setIsDrawing(true);
    const pos = getMousePos(e);
    if (pos) {
      currentPathRef.current = [{
        x: pos.x,
        y: pos.y,
        color,
        lineWidth,
      }];
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !registered) return;

    const pos = getMousePos(e);
    if (pos) {
      const point = {
        x: pos.x,
        y: pos.y,
        color,
        lineWidth,
      };

      currentPathRef.current.push(point);

      // Draw locally
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const lastPoint = currentPathRef.current[currentPathRef.current.length - 2];
      if (lastPoint) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || !registered || !socket) return;

    setIsDrawing(false);

    // Send path to server
    if (currentPathRef.current.length > 0) {
      socket.emit("draw", {
        points: currentPathRef.current,
        color,
        lineWidth,
      });
      currentPathRef.current = [];
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!registered) return;
    e.preventDefault(); // Prevent scrolling

    setIsDrawing(true);
    const pos = getTouchPos(e);
    if (pos) {
      currentPathRef.current = [{
        x: pos.x,
        y: pos.y,
        color,
        lineWidth,
      }];
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !registered) return;
    e.preventDefault(); // Prevent scrolling

    const pos = getTouchPos(e);
    if (pos) {
      const point = {
        x: pos.x,
        y: pos.y,
        color,
        lineWidth,
      };

      currentPathRef.current.push(point);

      // Draw locally
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const lastPoint = currentPathRef.current[currentPathRef.current.length - 2];
      if (lastPoint) {
        ctx.beginPath();
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !registered || !socket) return;
    e.preventDefault();

    setIsDrawing(false);

    // Send path to server
    if (currentPathRef.current.length > 0) {
      socket.emit("draw", {
        points: currentPathRef.current,
        color,
        lineWidth,
      });
      currentPathRef.current = [];
    }
  };

  const handleClear = () => {
    if (!socket || !registered) return;
    if (confirm("Are you sure you want to clear the whiteboard? This will clear for everyone.")) {
      socket.emit("clear");
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Collaborative Whiteboard Demo</h1>
          <p className="text-muted-foreground">
            Real-time collaborative drawing synchronized across all connected users
          </p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-4">
            <div className={cn("h-3 w-3 rounded-full", connected ? "bg-green-500" : "bg-red-500")} />
            <span className="text-sm">
              {connected ? "Connected" : "Disconnected"}
            </span>
            {registered && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-muted-foreground">
                  Registered as: <strong>{userName}</strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Registration Form */}
        {!registered && (
          <div className="mb-6 rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Join the Whiteboard</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRegister()}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button
                onClick={handleRegister}
                disabled={!connected || !userName.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        )}

        {/* Whiteboard Controls */}
        {registered && (
          <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Color:</label>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-8 w-16 rounded border border-input"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={lineWidth}
                onChange={(e) => setLineWidth(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">{lineWidth}px</span>
            </div>
            <button
              onClick={handleClear}
              className="ml-auto rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Board
            </button>
          </div>
        )}

        {/* Canvas */}
        <div className="mb-6 rounded-lg border border-border bg-card p-4">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            className="w-full cursor-crosshair rounded border border-border bg-white"
            style={{ height: "600px", touchAction: "none" }}
          />
        </div>

        {/* Connected Users */}
        {registered && users.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">
              Connected Users ({users.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {users.map((user) => (
                <span
                  key={user.userId}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm",
                    user.userId === userId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {user.userName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

