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

// #region rendering
const getContainer = () => document.getElementById('container')

const getContainerSize = () => {
  const { width, height } = getContainer().getBoundingClientRect()
  return { width, height }
}

const clearContainer = () => {
  const container = getContainer()
  const [child] = container.children
  if (child) {
    container.removeChild(child)
  }
}

const getContext = (width, height) => {
  const [existing] = document.getElementsByTagName('canvas')
  const canvas = existing || document.createElement('canvas')
  if (!existing) {
    getContainer().appendChild(canvas)
  }
  const context = canvas.getContext('2d')
  context.clearRect(0, 0, canvas.width, canvas.height)
  canvas.setAttribute('width', width)
  canvas.setAttribute('height', height)
  return context
}

const renderCells = (context, cellSide, width, height) => {
  context.globalAlpha = 0.2
  getRange(width).forEach(column => getRange(height).forEach(row => {
    if ((column + row) % 2 === 1) {
      context.fillRect(column * cellSide, row * cellSide, cellSide, cellSide)
    }
  }))
  context.globalAlpha = 1
}

const renderFood = (context, cellSide, { x, y }) => {
  context.beginPath()
  context.arc(x, y, cellSide / 2.5, 0, 2 * Math.PI)
  context.fillStyle = '#e74c3c'
  context.fill()
}

const renderSnake = (context, cellSide, snake) => {
  context.lineWidth = cellSide
  context.strokeStyle = '#3498db'
  context.beginPath()
  snake.forEach(({ x, y }) => context.lineTo(x, y))
  context.stroke()
}

const renderScores = (score, bestScore) => {
  document.getElementById('current-score').innerText = score
  document.getElementById('best-score').innerText = bestScore
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
    this.containerSize = getContainerSize()
    this.updateProjectors()
  }

  updateProjectors() {
    const widthRatio = this.containerSize.width / this.game.width
    const heightRatio = this.containerSize.height / this.game.height
    const unitOnScreen = Math.min(widthRatio, heightRatio)

    this.projectDistance = distance => distance * unitOnScreen,
    this.projectPosition = position => position.scale_by(unitOnScreen)
  }

  tick() {
    if (!this.stopTime) {
      const lastUpdate = Date.now()
      if (this.lastUpdate) {
        this.game.process(this.movement, lastUpdate - this.lastUpdate)
        if (this.game.score > this.bestScore) {
          localStorage.setItem('bestScore', this.game.score)
          this.bestScore = this.game.score
          return {
            ...newProps,
            bestScore: this.game.score
          }
        }
      }
      this.lastUpdate = lastUpdate
      this.render()
    }
  }

  run() {
    window.addEventListener('resize', () => {
      clearContainer()
      this.containerSize = getContainerSize()
      this.updateProjectors()
      this.tick()
    })
    window.addEventListener('keydown', ({ which }) => {
      this.movement = Object.keys(MOVEMENT_KEYS).find(key => MOVEMENT_KEYS[key].includes(which))
    })
    window.addEventListener('keyup', ({ which }) => {
      this.movement = undefined
      if (which === STOP_KEY) {
        const now = Date.now()
        if (state.stopTime) {
          this.stopTime = undefined
          this.lastUpdate = this.time + now - this.lastUpdate
        } else {
          this.stopTime = now
        }
      }
    })
    setInterval(this.tick.bind(this), UPDATE_EVERY)
  }

  render() {
    const [viewWidth, viewHeight] = [this.game.width, this.game.height].map(this.projectDistance)
    const context = getContext(viewWidth, viewHeight)
    const cellSide = viewWidth / this.game.width
    renderCells(context, cellSide, this.game.width, this.game.height)
    renderFood(context, cellSide, this.projectPosition(this.game.food))
    renderSnake(context, cellSide, this.game.get_snake().map(this.projectPosition))
    renderScores(this.game.score, this.bestScore)
  }
}

const gameManager = new GameManager()
gameManager.run()