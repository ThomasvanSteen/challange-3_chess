const workerpool = require('workerpool');

pool.exec('randomMove', ['rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'])
  .then((result) => {
    console.log(`Result: ${result}`);
  })
  .catch((err) => {
    console.error(err);
  });