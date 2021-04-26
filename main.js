//#region HTTP & Socket Connexion
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

const io = require("socket.io")(server, {
  cors: true,
  origins: ["*"],
});
//#endregion

// firebaseUID -> { socketId : socketId, displayName : string, opponentFirebaseUID : string | null }
// Car l'UID de firebase est unique pour chaque compte alors que le
// socketID ne l'est que pour une connexion
const infoJoueurs = new Map();

//#region Utilitaires
setVarValue = (firebaseUID, variable, value) => {
  let infos = infoJoueurs.get(firebaseUID);
  if (!infos) {
    infos = {};
  }
  infos[variable] = value;
  infoJoueurs.set(firebaseUID, infos);
};

getVarValue = (firebaseUID, variable) => {
  let infos = infoJoueurs.get(firebaseUID);
  if (!infos) {
    return null;
  }
  return infos[variable];
};

setPseudo = (firebaseUID, pseudo) => {
  setVarValue(firebaseUID, "pseudo", pseudo);
};

setOpponentFirebaseUID = (firebaseUID, opponentFirebaseUID) => {
  setVarValue(firebaseUID, "opponentFirebaseUID", opponentFirebaseUID);
};

getOpponentFirebaseUID = (firebaseUID) => {
  return getVarValue(firebaseUID, "opponentFirebaseUID");
};

getOpponentSocketID = (firebaseUID) => {
  return getVarValue(getOpponentFirebaseUID(firebaseUID), "socketID");
};

setSocketID = (firebaseUID, socketId) => {
  let oldSocketId = getVarValue(firebaseUID, "socketID");
  if (oldSocketId && oldSocketId != socketId) {
    // L'utilisateur était déjà connecté (autre onglet ?)
    io.to(oldSocketId).emit("close", {});
  }
  setVarValue(firebaseUID, "socketID", socketId);
};

getSocketID = (firebaseUID) => {
  return getVarValue(firebaseUID, "socketID");
};
//#endregion

sendOpponentList = (socketID) => {
  let opponents = [];
  for (let [key, value] of infoJoueurs) {
    opponents.push({
      firebaseUID: key,
      pseudo: value.pseudo,
      opponent: value.opponent,
    });
  }
  io.to(socketID).emit("listOpponent", { opponents: opponents });
};

io.on("connection", (socket) => {
  // Infos de l'utilisateur du socket
  let socketId = socket.id;
  let firebaseUID = "";
  let pseudo = "";

  let opponentFirebaseUID = null;
  let opponentSocketID = null;

  socket.on("initConnexion", (data) => {
    pseudo = data.pseudo;
    firebaseUID = data.firebaseUID;
    setPseudo(firebaseUID, pseudo);
    setSocketID(firebaseUID, socketId);
    console.log("[+] " + pseudo + " s'est connecté.");

    sendOpponentList(socketId);
    // Envoie au nouvel utilisateur de la liste des anciens joueurs en ligne

    io.emit("newConnexion", {
      opponent: { pseudo: pseudo, firebaseUID: firebaseUID },
    });
    // Envoie aux anciens du nouvel utilisateur
  });

  socket.on("changePseudo", (data) => {
    pseudo = data.pseudo;
    setPseudo(firebaseUID, pseudo);

    io.emit("changePseudo", {
      opponent: { pseudo: pseudo, firebaseUID: firebaseUID },
    });
  });

  socket.on("demandeDuel", (data) => {
    let opponent = data.opponent;
    let socketOpponent = getVarValue(opponent.firebaseUID, "socketID");
    io.to(socketOpponent).emit("demandeDuel", {
      opponent: { pseudo: pseudo, firebaseUID: firebaseUID },
    });
  });

  socket.on("accepterDuel", (data) => {
    let opponent = data.opponent;
    opponentFirebaseUID = opponent.firebaseUID;
    opponentSocketID = getSocketID(opponentFirebaseUID);

    io.to(opponentSocketID).emit("acceptationDuel", {
      opponent: { pseudo: pseudo, firebaseUID: firebaseUID },
    });

    setOpponentFirebaseUID(firebaseUID, opponentFirebaseUID);
    setOpponentFirebaseUID(opponentFirebaseUID, firebaseUID);

    // todo
    io.to(opponentSocketID).emit("startGame", {
      myTurn: false,
    });
    io.to(socketId).emit("startGame", {
      myTurn: true,
    });
  });

  socket.on("turn", (data) => {
    if (!opponentFirebaseUID) {
      opponentFirebaseUID = getOpponentFirebaseUID(firebaseUID);
      opponentSocketID = getSocketID(opponentFirebaseUID);
    }
    let piece = data.piece;
    let pos = data.pos;
    io.to(opponentSocketID).emit("turn", { piece: piece, pos: pos });
  });

  socket.on("refuserDuel", (data) => {
    let opponent = data.opponent;
    let socketOpponent = getSocketID(opponent.firebaseUID);
    io.to(socketOpponent).emit("refusDuel", {
      opponent: { pseudo: pseudo, firebaseUID: firebaseUID },
    });
  });

  socket.on("giveup", (data) => {
    io.to(opponentSocketID).emit("giveup", {});
  });

  //socket.broadcast.emit("message", "A new personne is connected !");
  //io.emit('message', 'This a send message')
  //socket.join("UniqueIDForTheRoom");
  //socket.to("Unique ID").emit("message", "Blabla");
  //io.to("Unique ID").emit("message", "data");

  socket.on("disconnect", (data) => {
    let socket = getOpponentSocketID(firebaseUID);
    if (socket) {
      io.to(socket).emit("giveup", {});
    }
    infoJoueurs.delete(firebaseUID);
    console.log("[-] " + pseudo + " s'est déconnecté.");

    io.emit("newDisconnexion", {
      opponent: { pseudo: pseudo, firebaseUID: firebaseUID },
    });
  });
});
