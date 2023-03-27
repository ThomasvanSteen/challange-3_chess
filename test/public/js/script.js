// var board1 = Chessboard('board1', {
//     draggable: true,
//     dropOffBoard: 'trash',
//     sparePieces: true
//   })

  var config = {
    showNotation: false,
    position: 'start'
    draggable: true,
    dropOffBoard: 'trash',
  }
  var board = Chessboard('myBoard', config)
  
  $('#startBtn').on('click', board2.start)
  $('#clearBtn').on('click', board2.clear)

  console.log("testlog")