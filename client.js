const socket = io();

const messages = document.getElementById('messages');
const form = document.getElementById('chat-form');
const input = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');

// Replace text emoji patterns with Unicode
function parseEmojis(text) {
  return text
    .replace(/:smile:/g, "😄")
    .replace(/:sad:/g, "😢")
    .replace(/:heart:/g, "❤️")
    .replace(/:thumbsup:/g, "👍")
    .replace(/:fire:/g, "🔥");
}

// Join chat after username/room input
document.getElementById('join-btn').addEventListener('click', () => {
  const username = document.getElementById('username').value.trim() || "Anonymous";
  const room = document.getElementById('room').value;

  localStorage.setItem('username', username);
  localStorage.setItem('room', room);

  socket.emit('join room', { username, room });

  document.getElementById('roomModal').remove();
});

// Handle form submit
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    const msg = {
      username: localStorage.getItem("username") || "Anonymous",
      text: input.value,
      timestamp: new Date().toLocaleTimeString()
    };
    socket.emit('chat message', msg);
    input.value = '';
  }
});

// Render chat message
function renderMessage(msg) {
  const messageHTML = `
    <div class="mb-2">
      <strong>${msg.username}</strong>
      <small class="text-muted">[${msg.timestamp}]</small><br />
      <span>${parseEmojis(msg.text)}</span>
    </div>
  `;
  messages.insertAdjacentHTML('beforeend', messageHTML);
  messages.scrollTop = messages.scrollHeight;
}

// Typing indicator
let typingTimeout;
input.addEventListener('input', () => {
  socket.emit('typing', true);
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing', false);
  }, 1000);
});

// Receive messages
socket.on('chat message', renderMessage);

// Show chat history
socket.on('chat history', (history) => {
  messages.innerHTML = ''; // clear
  history.forEach(renderMessage);
});

// Typing event
socket.on('typing', ({ username, isTyping }) => {
  typingIndicator.innerText = isTyping ? `${username} is typing...` : '';
});
