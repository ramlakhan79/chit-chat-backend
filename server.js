const mongoose = require("mongoose");
const express = require("express");
const dotenv = require("dotenv");
const { chats } = require("./data/data");
const connectDB = require("./config/db");
const colors = require("colors");
const userRoutes = require("./routes/userRoutes");
const cors = require("cors");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, erroHandler } = require("./middlewares/errorMiddleware");
const path = require("path");

dotenv.config();
connectDB();
const app = express();

app.use(express.json()); //to accept json data

app.use(
  cors({
    origin: "http://localhost:3000",
    credentials: true,
  })
);

// app.get("/", (req, res) => {
//   res.send("API Chal Rahi Hai Successfully");
// });
const react_app_url = process.env.REACT_APP_URL;
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  react_app_url,
];

app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);
// app.use(
//   cors({
//     origin: function (origin, callback) {
//       const isAllowed = allowedOrigins.includes(origin) || !origin;
//       callback(null, isAllowed);
//     },
//     credentials: true,
//     exposedHeaders: [
//       "set-cookie",
//       "Content-Disposition",
//       "Content-Type",
//       "Content-Length",
//     ],
//   })
// );



// --------------------------deployment------------------------------

const __dirname1 = path.resolve();

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname1, "/frontend/build")));

  app.get("*", (req, res) =>
    res.sendFile(path.resolve(__dirname1, "frontend", "build", "index.html"))
  );
} else {
  app.get("/", (req, res) => {
    res.send("API Chal Rahi Hai Successfully");
  });
}

// --------------------------deployment------------------------------

app.use(notFound);
app.use(erroHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(
  5000,
  console.log(`Server Chal Rha Hai PORT ${PORT}`.yellow.bold)
);

const io = require("socket.io")(server, {
  pingTimeout: 60000,
  cors: {
    origin: "http://localhost:3000",
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => {
    socket.join(userData._id);
    // console.log(userData);
    socket.emit("connected");
  });
  socket.on("join chat", (room) => {
    socket.join(room);
    console.log("User Joined Room: " + room);
  });

  socket.on("typing", (room) => socket.in(room).emit("typing"));
  socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;

    if (!chat.users) return console.log("chat.users not defined");

    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;

      socket.in(user._id).emit("message recieved", newMessageRecieved);
    });
  });

  socket.off("setup", () => {
    console.log("USER DISCONNECTED");
    socket.leave(userData._id);
  });
});
