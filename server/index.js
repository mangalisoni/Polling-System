const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const path = require("path");

// Serve static frontend
app.use(express.static(path.join(__dirname, "../client/build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

let pollHistory = [];

app.use(cors({
  origin:  "https://polling-system-1-zhoh.onrender.com/",
  methods: ["GET", "POST"]
}));
app.use(express.json());

io.on("connection", (socket) => {
  console.log("🟢 User connected:", socket.id);

  // Send latest poll to new student
  const latestPoll = pollHistory[pollHistory.length - 1];
  if (latestPoll) {
    socket.emit("new_poll", latestPoll);
  }

  // Receive and broadcast chat message
  socket.on("chat_message", (msg) => {
    console.log("💬 Chat:", msg);
    io.emit("chat_message", msg); // broadcast to all
  });

  // Receive a poll
  socket.on("create_poll", (data) => {
    const pollWithResults = {
      ...data,
      results: {},
      timestamp: new Date(),
    };
    pollHistory.push(pollWithResults);
    io.emit("new_poll", pollWithResults); // send to all students
    console.log("📨 Poll created:", data);
  });

  // Receive student answer
  socket.on("submit_answer", (data) => {
    const latestPoll = pollHistory[pollHistory.length - 1];
    if (latestPoll) {
      latestPoll.results[data.option] = (latestPoll.results[data.option] || 0) + 1;
      io.emit("update_results", data); // broadcast new result
    }
  });

  socket.on("disconnect", () => {
    console.log("🔴 Disconnected:", socket.id);
  });
});

// REST endpoints
app.get("/", (req, res) => {
  res.send("🎯 Polling backend is running");
});
app.get("/polls/history", (req, res) => {
  res.json(pollHistory);
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

