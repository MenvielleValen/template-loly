import type { WssContext } from "@lolyjs/core";

/**
 * WebSocket event handlers for the counter namespace.
 * 
 * This demo shows a collaborative counter where multiple users can
 * increment/decrement a shared counter value in real-time.
 * 
 * Features:
 * - Real-time counter synchronization
 * - User join/leave notifications
 * - Action history (who did what)
 * - Connected users list
 */

type CounterAction = {
  type: "increment" | "decrement" | "reset";
  userId: string;
  userName: string;
  timestamp: number;
  value: number;
};

// Store connected users: socketId -> { userId, userName }
const connectedUsers = new Map<string, { userId: string; userName: string }>();

// Store userId to socketId mapping
const userIdToSocketId = new Map<string, string>();

// Current counter value
let counterValue = 0;

// Action history (last 50 actions)
const actionHistory: CounterAction[] = [];

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

// Helper function to broadcast counter value
function broadcastCounterValue(ctx: WssContext) {
  ctx.actions.emit("counter-update", {
    value: counterValue,
    timestamp: Date.now(),
  });
}

// Helper function to add action to history
function addAction(action: CounterAction) {
  actionHistory.push(action);
  // Keep only last 50 actions
  if (actionHistory.length > 50) {
    actionHistory.shift();
  }
}

export const events = [
  {
    name: "connection",
    handler: (ctx: WssContext) => {
      console.log("Client connected to counter namespace:", ctx.socket.id);

      // Send current counter value to newly connected client
      ctx.socket.emit("counter-update", {
        value: counterValue,
        timestamp: Date.now(),
      });

      // Send action history
      ctx.socket.emit("action-history", actionHistory);

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
    name: "increment",
    handler: (ctx: WssContext) => {
      const { socket } = ctx;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        socket.emit("error", {
          message: "User not registered",
        });
        return;
      }

      counterValue += 1;

      const action: CounterAction = {
        type: "increment",
        userId: user.userId,
        userName: user.userName,
        timestamp: Date.now(),
        value: counterValue,
      };

      addAction(action);

      // Broadcast counter update to all clients
      ctx.actions.emit("counter-update", {
        value: counterValue,
        timestamp: action.timestamp,
      });

      // Broadcast action to all clients
      ctx.actions.emit("action", action);

      console.log(`${user.userName} incremented counter to ${counterValue}`);
    },
  },

  {
    name: "decrement",
    handler: (ctx: WssContext) => {
      const { socket } = ctx;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        socket.emit("error", {
          message: "User not registered",
        });
        return;
      }

      counterValue -= 1;

      const action: CounterAction = {
        type: "decrement",
        userId: user.userId,
        userName: user.userName,
        timestamp: Date.now(),
        value: counterValue,
      };

      addAction(action);

      // Broadcast counter update to all clients
      ctx.actions.emit("counter-update", {
        value: counterValue,
        timestamp: action.timestamp,
      });

      // Broadcast action to all clients
      ctx.actions.emit("action", action);

      console.log(`${user.userName} decremented counter to ${counterValue}`);
    },
  },

  {
    name: "reset",
    handler: (ctx: WssContext) => {
      const { socket } = ctx;
      const user = connectedUsers.get(socket.id);

      if (!user) {
        socket.emit("error", {
          message: "User not registered",
        });
        return;
      }

      counterValue = 0;

      const action: CounterAction = {
        type: "reset",
        userId: user.userId,
        userName: user.userName,
        timestamp: Date.now(),
        value: counterValue,
      };

      addAction(action);

      // Broadcast counter update to all clients
      ctx.actions.emit("counter-update", {
        value: counterValue,
        timestamp: action.timestamp,
      });

      // Broadcast action to all clients
      ctx.actions.emit("action", action);

      console.log(`${user.userName} reset counter to ${counterValue}`);
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

