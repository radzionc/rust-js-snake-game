import { Vector, Game, Movement } from "wasm-snake-game";

const getRange = length => [...Array(length).keys()]

const DEFAULT_GAME_CONFIG = {
  width: 17,
  height: 15,
  speed: 0.006,
  initialSnakeLength: 3,
  initialDirection: new Vector(1, 0)
}

const UPDATE_EVERY = 1000 / 60

const MOVEMENT_KEYS = {
  [Movement.TOP]: [87, 38],
  [Movement.RIGHT]: [68, 39],
  [Movement.DOWN]: [83, 40],
  [Movement.LEFT]: [65, 37]
}

const STOP_KEY = 32

class View {
  constructor(gameWidth, gameHeight) {
    this.gameWidth = gameWidth
    this.gameHeight = gameHeight
    this.container = document.getElementById('container')
    this.setUp()

    window.addEventListener('resize', () => {
      const [child] = this.container.children
      if (child) {
        this.container.removeChild(child)
      }
      this.setUp()
    })
  }

  setUp() {
    const { width, height } = this.container.getBoundingClientRect()
    const widthRatio = width / this.gameWidth
    const heightRatio = height / this.gameHeight
    this.unitOnScreen = Math.min(widthRatio, heightRatio)
    this.projectDistance = distance => distance * this.unitOnScreen
    this.projectPosition = position => position.scale_by(this.unitOnScreen)

    this.viewWidth = this.projectDistance(this.gameWidth)
    this.viewHeight = this.projectDistance(this.gameHeight)
    const canvas = document.createElement('canvas')
    this.container.appendChild(canvas)
    this.context = canvas.getContext('2d')
    canvas.setAttribute('width', this.viewWidth)
    canvas.setAttribute('height', this.viewHeight)
  }

  render(food, snake, score, bestScore) {
    this.context.clearRect(0, 0, this.viewWidth, this.viewHeight)
    this.context.globalAlpha = 0.2
    getRange(this.gameWidth).forEach(column =>
      getRange(this.gameHeight)
      .filter(row => (column + row) % 2 === 1)
      .forEach(row =>
        this.context.fillRect(
          column * this.unitOnScreen,
          row * this.unitOnScreen,
          this.unitOnScreen,
          this.unitOnScreen
        )
      )
    )
    this.context.globalAlpha = 1

    const projectedFood = this.projectPosition(food)
    this.context.beginPath()
    this.context.arc(
      projectedFood.x,
      projectedFood.y,
      this.unitOnScreen / 2.5,
      0,
      2 * Math.PI
    )
    this.context.fillStyle = '#e74c3c'
    this.context.fill()

    this.context.lineWidth = this.unitOnScreen
    this.context.strokeStyle = '#3498db'
    this.context.beginPath()
    snake
      .map(this.projectPosition)
      .forEach(({ x, y }) => this.context.lineTo(x, y))
    this.context.stroke()

    document.getElementById('current-score').innerText = score
    document.getElementById('best-score').innerText = bestScore
  }
}

class GameManager {
  constructor() {
    this.game = new Game(
      DEFAULT_GAME_CONFIG.width,
      DEFAULT_GAME_CONFIG.height,
      DEFAULT_GAME_CONFIG.speed,
      DEFAULT_GAME_CONFIG.initialSnakeLength,
      DEFAULT_GAME_CONFIG.initialDirection
    )
    this.bestScore = parseInt(localStorage.bestScore) || 0
    this.view = new View(this.game.width, this.game.height)
  }

  tick() {
    if (!this.stopTime) {
      const lastUpdate = Date.now()
      if (this.lastUpdate) {
        this.game.process(this.movement, lastUpdate - this.lastUpdate)
        if (this.game.score > this.bestScore) {
          localStorage.setItem('bestScore', this.game.score)
          this.bestScore = this.game.score
        }
      }
      this.lastUpdate = lastUpdate
      this.view.render(this.game.food, this.game.get_snake(), this.game.score, this.bestScore)
    }
  }

  run() {
    window.addEventListener('keydown', ({ which }) => {
      this.movement = Object.keys(MOVEMENT_KEYS).find(key => MOVEMENT_KEYS[key].includes(which))
    })
    window.addEventListener('keyup', ({ which }) => {
      this.movement = undefined
      if (which === STOP_KEY) {
        const now = Date.now()
        if (this.stopTime) {
          this.stopTime = undefined
          this.lastUpdate = this.time + now - this.lastUpdate
        } else {
          this.stopTime = now
        }
      }
    })
    setInterval(this.tick.bind(this), UPDATE_EVERY)
  }
}

const gameManager = new GameManager()
gameManager.run()