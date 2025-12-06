import { useEffect, useState, useRef } from "react";
import { lolySocket } from "@lolyjs/core/sockets";
import type { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

type User = {
  userId: string;
  userName: string;
};

type Action = {
  type: "increment" | "decrement" | "reset";
  userId: string;
  userName: string;
  timestamp: number;
  value: number;
};

export default function CounterDemoPage() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [counterValue, setCounterValue] = useState(0);
  const [users, setUsers] = useState<User[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [userName, setUserName] = useState("");
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const userNameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = lolySocket("/counter");
    setSocket(ws);

    ws.on("connect", () => {
      console.log("Connected to counter namespace");
      setConnected(true);
    });

    ws.on("disconnect", () => {
      console.log("Disconnected from counter namespace");
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

    ws.on("counter-update", (data: { value: number; timestamp: number }) => {
      setCounterValue(data.value);
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

    ws.on("action", (action: Action) => {
      setActions((prev) => [action, ...prev].slice(0, 20)); // Keep last 20 actions
    });

    ws.on("action-history", (history: Action[]) => {
      setActions(history.slice(-20)); // Keep last 20
    });

    return () => {
      ws.disconnect();
    };
  }, []);

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

  const handleIncrement = () => {
    if (!socket || !registered) return;
    socket.emit("increment");
  };

  const handleDecrement = () => {
    if (!socket || !registered) return;
    socket.emit("decrement");
  };

  const handleReset = () => {
    if (!socket || !registered) return;
    if (confirm("Are you sure you want to reset the counter?")) {
      socket.emit("reset");
    }
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Collaborative Counter Demo</h1>
          <p className="text-muted-foreground">
            Real-time counter synchronized across all connected users
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
            <h2 className="text-xl font-semibold mb-4">Join the Counter</h2>
            <div className="flex gap-2">
              <input
                ref={userNameInputRef}
                type="text"
                placeholder="Enter your name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleRegister()}
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

        {/* Counter Display */}
        {registered && (
          <div className="mb-6 rounded-lg border border-border bg-card p-8">
            <div className="text-center">
              <div className="mb-4 text-6xl font-bold text-primary">{counterValue}</div>
              <div className="flex justify-center gap-4">
                <button
                  onClick={handleDecrement}
                  className="rounded-md bg-secondary px-6 py-3 text-lg font-semibold hover:bg-secondary/80"
                >
                  −
                </button>
                <button
                  onClick={handleReset}
                  className="rounded-md bg-destructive px-6 py-3 text-lg font-semibold text-destructive-foreground hover:bg-destructive/90"
                >
                  Reset
                </button>
                <button
                  onClick={handleIncrement}
                  className="rounded-md bg-primary px-6 py-3 text-lg font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Connected Users */}
        {registered && users.length > 0 && (
          <div className="mb-6 rounded-lg border border-border bg-card p-6">
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

        {/* Action History */}
        {registered && actions.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Actions</h2>
            <div className="space-y-2">
              {actions.map((action, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm"
                >
                  <span>
                    <strong>{action.userName}</strong>{" "}
                    {action.type === "increment" && "incremented"}
                    {action.type === "decrement" && "decremented"}
                    {action.type === "reset" && "reset"} to{" "}
                    <strong>{action.value}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(action.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

