import express  from 'express'
import path from 'path'
import { Chess } from 'chess.js'

const chess = new Chess()
const __dirname = path.resolve()

const app = express()
const port = 3300


// const path = require ('path')

app.use('/css', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/css')))npm
app.use('/js', express.static(path.join(__dirname, 'node_modules/bootstrap/dist/js')))
app.use('/js', express.static(path.join(__dirname, 'node_modules/jquery/dist')))
app.use(express.static(__dirname + '/public/css'));
app.use(express.static(__dirname + '/public/js'));

app.get("/", (req, res)=> {
    // res.send('Hello World!')
    res.sendFile(path.join(__dirname, 'views/index.html'))
})

app.use('/js', express.static(path.join(__dirname, 'public/js')))

app.listen(port, () => {
    console.log(`ik luister op ${port}`)
})





while (!chess.isGameOver()) {
  const moves = chess.moves()
  const move = moves[Math.floor(Math.random() * moves.length)]
  chess.move(move)
}