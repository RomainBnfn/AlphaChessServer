const http = require("http");

const hostname = "localhost";
const port = 3000;

const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader("Content.Type", "text/plain");
  res.end("Zeet Node");
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
//const app = require("express");
//const httpServer = require("http").createServer(app);

const io = require("socket.io")(server, {
  cors: true,
  origins: ["*"],
});

io.on("connection", (socket) => {
  console.log("A user connected");

  socket.emit("connected", {});

  socket.on("test", (data) => {
    console.log("Test recieved");
    console.log(data);
  });

  socket.on("askForPseudo", (data) => {
    console.log(socket.id + " ask for pseudo : " + data.pseudo);
    socket.emit("pseudoResponse", { response: true });
  });

  //socket.broadcast.emit("message", "A new personne is connected !");

  //io.emit('message', 'This a send message')
  //socket.join("UniqueIDForTheRoom");
  //socket.to("Unique ID").emit("message", "Blabla");
  //io.to("Unique ID").emit("message", "data");
});

//const PORT = process.env.PORT || 3000;

/*
httpServer.listen(PORT, () => {
  console.log("Server ruing on port " + PORT);
});
*/
