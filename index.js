const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, '../public')));

// Store messages per room in memory
const chatHistory = {};

io.on('connection', (socket) => {
  socket.on('join room', ({ username, room }) => {
    socket.join(room);
    socket.data.username = username;
    socket.data.room = room;

    // Create room entry if doesn't exist
    if (!chatHistory[room]) chatHistory[room] = [];

    // Send chat history to the new user
    socket.emit('chat history', chatHistory[room]);

    // Broadcast join notification
    const joinMsg = {
      username: 'System',
      text: `${username} has joined the chat.`,
      timestamp: new Date().toLocaleTimeString()
    };
    chatHistory[room].push(joinMsg);
    socket.to(room).emit('chat message', joinMsg);
  });

  // Typing indicator
  socket.on('typing', (isTyping) => {
    const room = socket.data.room;
    if (room) {
      socket.to(room).emit('typing', {
        username: socket.data.username,
        isTyping
      });
    }
  });

  // Handle chat message
  socket.on('chat message', (msg) => {
    const room = socket.data.room;
    if (!room) return;

    // Check for private message (@username)
    if (msg.text.startsWith('@')) {
      const split = msg.text.split(' ');
      const targetUser = split[0].substring(1);
      const privateMsg = split.slice(1).join(' ');

      for (const [id, s] of io.of("/").sockets) {
        if (s.data.username === targetUser && s.data.room === room) {
          s.emit('chat message', {
            username: `${msg.username} (whisper)`,
            text: privateMsg,
            timestamp: msg.timestamp
          });
          socket.emit('chat message', {
            username: `To ${targetUser}`,
            text: privateMsg,
            timestamp: msg.timestamp
          });
          return;
        }
      }

      // User not found
      socket.emit('chat message', {
        username: 'System',
        text: `User @${targetUser} not found in this room.`,
        timestamp: msg.timestamp
      });

    } else {
      // Broadcast and store public message
      io.to(room).emit('chat message', msg);
      chatHistory[room].push(msg);
    }
  });

  socket.on('disconnect', () => {
    const { username, room } = socket.data;
    if (room && username) {
      const leaveMsg = {
        username: 'System',
        text: `${username} has left the chat.`,
        timestamp: new Date().toLocaleTimeString()
      };
      chatHistory[room].push(leaveMsg);
      socket.to(room).emit('chat message', leaveMsg);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
