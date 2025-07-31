const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// ✅ Use environment PORT or default to 5000
const PORT = process.env.PORT || 5000;

// ✅ Serve React frontend build
app.use(express.static(path.join(__dirname, "../client/build")));

app.get("/", (req, res) => {
  res.send("🎯 Polling backend is running");
});

// ✅ Catch-all to serve index.html for React routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

// ✅ Middleware setup
app.use(cors());
app.use(express.json());

// ✅ WebSocket Server (with correct CORS for deployment)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let pollHistory = [];

// ✅ WebSocket events
io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  const latestPoll = pollHistory[pollHistory.length - 1];
  if (latestPoll) {
    socket.emit("new_poll", latestPoll);
  }

  socket.on("chat_message", (msg) => {
    console.log("💬 Chat:", msg);
    io.emit("chat_message", msg);
  });

  socket.on("create_poll", (data) => {
    const pollWithResults = {
      ...data,
      results: {},
      timestamp: new Date(),
    };
    pollHistory.push(pollWithResults);
    io.emit("new_poll", pollWithResults);
    console.log("📨 Poll created:", data);
  });

  socket.on("submit_answer", (data) => {
    const latestPoll = pollHistory[pollHistory.length - 1];
    if (latestPoll) {
      latestPoll.results[data.option] = (latestPoll.results[data.option] || 0) + 1;
      io.emit("update_results", data);
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
  });
});

// ✅ REST endpoint for poll history
app.get("/polls/history", (req, res) => {
  res.json(pollHistory);
});

// ✅ Start the server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
