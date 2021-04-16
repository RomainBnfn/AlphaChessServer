const app = require("express");
const httpServer = require("http").createServer(app);
const io = require("socket.io")(httpServer, {
  cors: true,
  origins: ["*"],
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.emit("message", "Hi !");

  socket.on("test", (data) => {
    console.log("Test recieved");
    console.log(data);
  });
  //socket.broadcast.emit("message", "A new personne is connected !");

  //io.emit('message', 'This a send message')
  //socket.join("UniqueIDForTheRoom");
  //socket.to("Unique ID").emit("message", "Blabla");
  //io.to("Unique ID").emit("message", "data");
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  console.log("Server ruing on port " + PORT);
});
