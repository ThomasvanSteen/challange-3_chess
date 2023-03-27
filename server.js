const express = require('express');

const app = express();
const http = require('http');

const server = http.createServer(app);
const { Chess } = require('chess.js');
const { Server } = require('socket.io');

const io = new Server(server);

const Agent = require('./agents/agent');


app.use(express.static(`${__dirname}/public`));

app.use(
  express.static(`${__dirname}/node_modules/@chrisoakman/chessboardjs/dist/`),
);

app.use(express.static(`${__dirname}/node_modules/chess.js/`));


app.get('/', (_req, res) => {
  res.sendFile(`${__dirname}/public/index.html`);
});


const rooms = [];


app.get('/chess', (req, res) => {
  if (rooms.find((room) => room.name === req.query.roomName)) {
    res.sendFile(`${__dirname}/public/chess-page.html`);
  } else {
    res.redirect('/');
  }
});


io.on('connection', (socket) => {
  socket.emit('room_list', rooms);

  let roomNameSocket = '';
  let userNameSocket = '';

  socket.on('create_room', (type, name, algorithmName, depth, time) => {
    if (rooms.find((room) => room.name === name)) {
      console.log('room already exists:', name);
      return;
    }
    console.log('creating room:', name);
    rooms.push({
      name,
      white: {},
      black: {},
      spectators: [],
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      restart: '',
      switch: '',
    });

    if (type === 'single') {
      const options = {
        algorithm: algorithmName,
        seed: 1,
        evaluatorString: '',
        depth,
        time,
      };
      const agent = new Agent(options);
      setTimeout(() => {
        agent.joinRoom(name);
      }, 1000);
    }
  });


  socket.on('join_room', (name, userName) => {
    console.log(userName, 'is joining room', name);

    const room = rooms.find((r) => r.name === name);
    if (room) {
      socket.join(name);
      if (Object.keys(room.white).length === 0) {
        room.white.id = socket.id;
        room.white.name = userName;
        socket.emit('side', 'w');
      } else if (Object.keys(room.black).length === 0) {
        room.black.id = socket.id;
        room.black.name = userName;
        socket.emit('side', 'b');
      } else {

        room.spectators.push({ name: userName, id: socket.id });
        socket.emit('side', 's');
      }
      roomNameSocket = room.name;
      userNameSocket = userName;
    }

    io.to(room.name).emit('room_status', room);


    io.emit('room_list', rooms);
  });

  socket.on('move', (san) => {

    const room = rooms.find((r) => r.name === roomNameSocket);

    if (room) {

      const game = new Chess(room.fen);
      const move = game.move(san);
      room.fen = game.fen();

      io.to(room.name).emit('update_board', room.fen, move.san);
      io.to(room.name).emit('move', move);
    }
  });

  socket.on('restart_request', () => {
    const room = rooms.find((r) => r.name === roomNameSocket);
    switch (socket.id) {
      case room.white.id:
        room.restart = 'w';
        io.to(room.black.id).emit('restart_requested');
        console.log('restart requested by white');
        break;
      case room.black.id:
        room.restart = 'b';
        io.to(room.white.id).emit('restart_requested');
        console.log('restart requested by black');
        break;
      default:
        console.log('unknown user requested restart');
        break;
    }
    io.to(room.name).emit('room_status', room);
  });

  socket.on('restart_grant', () => {
    const room = rooms.find((r) => r.name === roomNameSocket);
    console.log('restart_grant');
    if (
      (room.restart === 'w' && socket.id === room.black.id)
      || (room.restart === 'b' && socket.id === room.white.id)
    ) {
      console.log('restart granted');
      room.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      room.restart = '';
      io.to(room.name).emit('room_status', room);
      io.to(room.name).emit('update_board', room.fen, null);
    }
  });


  socket.on('switch_request', () => {
    console.log('switch request');
    const room = rooms.find((r) => r.name === roomNameSocket);

    switch (socket.id) {
      case room.white.id:
        room.switch = 'w';
        io.to(room.black.id).emit('switch_requested');
        console.log('switch requested by white');
        break;
      case room.black.id:
        room.switch = 'b';
        io.to(room.white.id).emit('switch_requested');
        console.log('switch requested by black');
        break;
      default:
        console.log('unknown user requested switch');
        break;
    }
    io.to(room.name).emit('room_status', room);
  });

  socket.on('switch_grant', () => {
    const room = rooms.find((r) => r.name === roomNameSocket);
    if (
      (room.switch === 'w' && socket.id === room.black.id)
      || (room.switch === 'b' && socket.id === room.white.id)
    ) {
      console.log('switching sides');
      room.fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      const { white } = room;
      room.white = room.black;
      room.black = white;
      room.switch = '';
      room.restart = '';
      io.to(room.white.id).emit('side', 'w');
      io.to(room.black.id).emit('side', 'b');
      io.to(room.name).emit('room_status', room);
      io.to(room.name).emit('update_board', room.fen);
    }
  });


  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (roomNameSocket) {

      const room = rooms.find((r) => r.name === roomNameSocket);
      if (room.white.id === socket.id) {

        console.log(
          userNameSocket,
          'removed as white player from room',
          roomNameSocket,
        );
        room.white = {};
      } else if (room.black.id === socket.id) {

        console.log(
          userNameSocket,
          'removed as black player from room',
          roomNameSocket,
        );
        room.black = {};
      } else {
        console.log(
          userNameSocket,
          'removed as spectator player from room',
          roomNameSocket,
        );
        room.spectators = room.spectators.filter(
          (spectator) => spectator.id !== socket.id,
        );
      }
      io.to(room.name).emit('room_status', room);

      if (
        Object.keys(room.white).length === 0
        && Object.keys(room.black).length === 0
        && room.spectators.length === 0
      ) {
        console.log('room removed:', roomNameSocket);
        rooms.splice(rooms.indexOf(room), 1);
        io.emit('room_list', rooms);
      }
    }
  });
});

// start server
server.listen(3001, () => {
  console.log(`listening on *:${server.address().port}`);
});
