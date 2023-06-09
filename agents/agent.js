const { io } = require('socket.io-client');
const { Chess } = require('chess.js');
const workerpool = require('workerpool');

const pool = workerpool.pool('./agents/worker.js');

class Agent {
  constructor(options) {
    this.options = options;
    this.socket = io('http://localhost:3001');
    console.log('[Agent] New agent with algorithm:', this.options.algorithm);
  }

  joinRoom(roomName, name = 'Bot') {
    const { socket } = this;
    socket.emit('join_room', roomName, name);

    socket.on('side', (side) => {
      this.side = side;
    });

    socket.on('update_board', (fen) => {
      const game = new Chess(fen);
      if (game.game_over()) {
        console.log('[Agent] Game over');
        return;
      }
      if (game.turn() === this.side) {
        console.log('[Agent] Its my turn');

        pool.exec(this.options.algorithm, [fen, this.options, this.lastResult])
          .then((result) => {
            setTimeout(() => {
              this.lastResult = result;
              const { mov } = result;
              game.move(mov);
              socket.emit('move', mov);
            }, 100);
          })
          .catch((err) => {
            console.error('Worker error:', err);
          });
      }
    });

    socket.on('restart_requested', () => {
      console.log('[Agent] Got a restart request, granting it');
      socket.emit('restart_grant');
    });

    socket.on('switch_requested', () => {
      console.log('[Agent] Got a switch request, granting it');
      socket.emit('switch_grant');
    });
    socket.on('room_status', (room) => {
      if (Object.keys(room.white).length === 0 || Object.keys(room.black).length === 0) {
        console.log('[Agent] Opponent left, disconnecting...');
        socket.disconnect();
      }
    });

    socket.onAny((event, ..._args) => {
      console.log(`[Agent] Got ${event}`);
    });
  }
}

module.exports = Agent;