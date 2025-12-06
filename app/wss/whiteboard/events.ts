import type { WssContext } from "@lolyjs/core";

/**
 * WebSocket event handlers for the whiteboard namespace.
 * 
 * This demo shows a collaborative whiteboard where multiple users can
 * draw together in real-time.
 * 
 * Features:
 * - Real-time drawing synchronization
 * - User join/leave notifications
 * - Clear board functionality
 * - Connected users list
 */

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

// Store connected users: socketId -> { userId, userName }
const connectedUsers = new Map<string, { userId: string; userName: string }>();

// Store userId to socketId mapping
const userIdToSocketId = new Map<string, string>();

// Store all drawing paths (in production, use a database or Redis)
const drawingPaths: DrawPath[] = [];

// Helper function to get connected users list
function getConnectedUsersList() {
  return Array.from(connectedUsers.values()).map(({ userId, userName }) => ({
    userId,
    userName,
  }));
}

// Helper function to broadcast updated user list
function broadcastUserList(ctx: WssContext) {
  const users = getConnectedUsersList();
  ctx.actions.emit("users-list", users);
}

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("Client connected to whiteboard namespace:", ctx.socket.id);

      // Send current drawing state to newly connected client
      ctx.socket.emit("drawing-state", {
        paths: drawingPaths,
        timestamp: Date.now(),
      });

      // Handle disconnection
      ctx.socket.on("disconnect", () => {
        const user = connectedUsers.get(ctx.socket.id);
        if (user) {
          console.log(`User disconnected: ${user.userName} (${user.userId})`);

          // Remove from maps
          connectedUsers.delete(ctx.socket.id);
          userIdToSocketId.delete(user.userId);

          // Notify all clients that user left
          ctx.actions.broadcast("user-left", {
            userId: user.userId,
            userName: user.userName,
          });

          // Broadcast updated user list
          broadcastUserList(ctx);
        }
      });
    },
  },

  {
    name: "register",
    handler: (ctx: WssContext) => {
      const { socket, data, actions } = ctx;
      const { userId, userName } = data;

      if (!userId || !userName || typeof userName !== "string" || userName.trim().length === 0) {
        socket.emit("error", {
          message: "userId and userName are required",
        });
        return;
      }

      const trimmedName = userName.trim();

      // Check if userId already exists
      if (userIdToSocketId.has(userId)) {
        socket.emit("error", {
          message: "userId already registered",
        });
        return;
      }

      // Store user information
      connectedUsers.set(socket.id, {
        userId,
        userName: trimmedName,
      });
      userIdToSocketId.set(userId, socket.id);

      // Store userId in socket data
      (socket as any).data = { ...(socket as any).data, userId, userName: trimmedName };

      console.log(`User registered: ${trimmedName} (${userId})`);

      // Notify the user of successful registration
      socket.emit("registered", {
        userId,
        userName: trimmedName,
        socketId: socket.id,
      });

      // Broadcast new user to all clients
      actions.broadcast("user-joined", {
        userId,
        userName: trimmedName,
      });

      // Send updated user list to all clients
      broadcastUserList(ctx);
    },
  },

  {
    name: "draw",
    handler: (ctx: WssContext) => {
      const { socket, data } = ctx;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        socket.emit("error", {
          message: "User not registered",
        });
        return;
      }

      const { points, color, lineWidth } = data;

      if (!points || !Array.isArray(points) || points.length === 0) {
        socket.emit("error", {
          message: "Invalid draw data",
        });
        return;
      }

      const drawPath: DrawPath = {
        points: points.map((p: any) => ({
          x: p.x,
          y: p.y,
          color: color || "#000000",
          lineWidth: lineWidth || 2,
        })),
        userId: user.userId,
        userName: user.userName,
        timestamp: Date.now(),
      };

      // Store the path
      drawingPaths.push(drawPath);

      // Keep only last 1000 paths to prevent memory issues
      if (drawingPaths.length > 1000) {
        drawingPaths.shift();
      }

      // Broadcast drawing to all clients
      ctx.actions.emit("draw", {
        path: drawPath,
      });

      console.log(`${user.userName} drew ${points.length} points`);
    },
  },

  {
    name: "clear",
    handler: (ctx: WssContext) => {
      const { socket } = ctx;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        socket.emit("error", {
          message: "User not registered",
        });
        return;
      }

      // Clear all paths
      drawingPaths.length = 0;

      // Broadcast clear to all clients
      ctx.actions.emit("clear", {
        clearedBy: {
          userId: user.userId,
          userName: user.userName,
        },
        timestamp: Date.now(),
      });

      console.log(`${user.userName} cleared the whiteboard`);
    },
  },

  {
    name: "get-users",
    handler: (ctx: WssContext) => {
      const { socket } = ctx;
      const users = getConnectedUsersList();
      socket.emit("users-list", users);
    },
  },
];

