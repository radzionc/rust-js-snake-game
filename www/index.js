import { Vector } from "wasm-snake-game";

// #region general utils
const getRange = length => [...Array(length).keys()]
const getWithoutLastElement = array => array.slice(0, array.length - 1)
const areEqual = (one, another) => Math.abs(one - another) < 0.00000000001
const getRandomFrom = array => array[Math.floor(Math.random() * array.length)]
const getLastElement = array => array[array.length - 1]
// #endregion

// #region geometry
class Segment {
  constructor(start, end) {
    this.start = start
    this.end = end
  }

  getVector() {
    return this.end.subtract(this.start)
  }

  length() {
    return this.getVector().length()
  }

  isPointInside(point) {
    const first = new Segment(this.start, point)
    const second = new Segment(point, this.end)
    return areEqual(this.length(), first.length() + second.length())
  }

  getProjectedPoint({ x, y }) {
    const { start, end } = this
    const { x: px, y: py } = end.subtract(start)
    const u = ((x - start.x) * px + (y - start.y) * py) / (px * px + py * py)
    return new Vector(start.x + u * px, start.y + u * py)
  }
}

const getSegmentsFromVectors = vectors => getWithoutLastElement(vectors)
  .map((one, index) => new Segment(one, vectors[index + 1]))
// #endregion

// #region constants
const DIRECTION = {
  TOP: new Vector(0, -1),
  RIGHT: new Vector(1, 0),
  DOWN: new Vector(0, 1),
  LEFT: new Vector(-1, 0)
}

const DEFAULT_GAME_CONFIG = {
  width: 17,
  height: 15,
  speed: 0.006,
  initialSnakeLength: 3,
  initialDirection: DIRECTION.RIGHT
}
// #endregion

// #region game core
const getFood = (width, height, snake) => {
  const allPositions = getRange(width).map(x => 
    getRange(height).map(y => new Vector(x + 0.5, y + 0.5))
  ).flat()
  const segments = getSegmentsFromVectors(snake)
  const freePositions = allPositions
    .filter(point => segments.every(segment => !segment.isPointInside(point)))
  return getRandomFrom(freePositions)
}

const getNewTail = (oldSnake, distance) => {
  const { tail } = getWithoutLastElement(oldSnake).reduce((acc, point, index) => {
    if (acc.tail.length !== 0) {
      return {
        ...acc,
        tail: [...acc.tail, point]
      }
    }
    const next = oldSnake[index + 1]
    const segment = new Segment(point, next)
    const length = segment.length()
    if (length >= distance) {
      const vector = segment.getVector().normalize().scale_by(acc.distance)
      return {
        distance: 0,
        tail: [...acc.tail, point.add(vector)]
      }
    } else {
      return {
        ...acc,
        distance: acc.distance - length
      }
    }
  }, { distance, tail: [] })
  return tail
}

const getNewDirection = (oldDirection, movement) => {
  const newDirection = DIRECTION[movement]
  const shouldChange = newDirection && !oldDirection.is_opposite(newDirection)
  return shouldChange ? newDirection : oldDirection
}

const getStateAfterMoveProcessing = (state, movement, distance) => {
  const newTail = getNewTail(state.snake, distance)
  const oldHead = getLastElement(state.snake)
  const newHead = oldHead.add(state.direction.scale_by(distance))
  const newDirection = getNewDirection(state.direction, movement)
  if (!state.direction.equal_to(newDirection)) {
    const { x: oldX, y: oldY } = oldHead
    const [
      oldXRounded,
      oldYRounded,
      newXRounded,
      newYRounded
    ] = [oldX, oldY, newHead.x, newHead.y].map(Math.round)
    const getStateWithBrokenSnake = (old, oldRounded, newRounded, getBreakpoint) => {
      const breakpointComponent = oldRounded + (newRounded > oldRounded ? 0.5 : -0.5)
      const breakpoint = getBreakpoint(breakpointComponent)
      const vector = newDirection.scale_by(distance - Math.abs(old - breakpointComponent))
      const head = breakpoint.add(vector)
      return {
        ...state,
        direction: newDirection,
        snake: [...newTail, breakpoint, head]
      }
    }
    if (oldXRounded !== newXRounded) {
      return getStateWithBrokenSnake(
        oldX,
        oldXRounded,
        newXRounded,
        x => new Vector(x, oldY)
      )
    }
    if (oldYRounded !== newYRounded) {
      return getStateWithBrokenSnake(
        oldY,
        oldYRounded,
        newYRounded,
        y => new Vector(oldX, y)
      )
    }
  }
  return {
    ...state,
    snake: [...newTail, newHead]
  }
}

const getStateAfterFoodProcessing = (state) => {
  const headSegment = new Segment(
    getLastElement(getWithoutLastElement(state.snake)),
    getLastElement(state.snake)
  )
  if (!headSegment.isPointInside(state.food)) return state

  const [tailEnd, beforeTailEnd, ...restOfSnake] = state.snake
  const tailSegment = new Segment(beforeTailEnd, tailEnd)
  const newTailEnd = tailEnd.add(tailSegment.getVector().normalize())
  const snake = [newTailEnd, beforeTailEnd, ...restOfSnake]
  const food = getFood(state.width, state.height, snake)
  return {
    ...state,
    snake,
    score: state.score + 1,
    food
  }
}

const isGameOver = ({ snake, width, height }) => {
  const { x, y } = getLastElement(snake)
  if (x < 0 || x > width || y < 0 || y > height) {
    return true
  }
  if (snake.length < 5) return false

  const [head, ...tail] = snake.slice().reverse()
  return getSegmentsFromVectors(tail).slice(2).find(segment => {
    const projected = segment.getProjectedPoint(head)
    if (!segment.isPointInside(projected)) {
      return false
    }
    const distance = new Segment(head, projected).length()
    return distance < 0.5
  })
}
// #endregion

class Game {
  constructor(state) {
    this.state = state
  }

  iterate(movement, timespan) {
    const distance = this.state.speed * timespan
    const stateAfterMove = getStateAfterMoveProcessing(this.state, movement, distance)
    const stateAfterFood = getStateAfterFoodProcessing(stateAfterMove)
    if (isGameOver(stateAfterFood)) {
      return getGame(this.state)
    }
    return new Game(stateAfterFood)
  }
}

const getGame = (config = {}) => {
  const {
    width,
    height,
    speed,
    initialSnakeLength,
    initialDirection
  } = { ...config, ...DEFAULT_GAME_CONFIG }
  const head = new Vector(
    Math.round(width / 2) - 0.5,
    Math.round(height / 2) - 0.5
  )
  const tailtip = head.subtract(initialDirection.scale_by(initialSnakeLength))
  const snake = [tailtip, head]
  const food = getFood(width, height, snake)

  const state = {
    width,
    height,
    speed,
    initialSnakeLength,
    initialDirection,
    snake,
    direction: initialDirection,
    food,
    score: 0
  }

  return new Game(state)
}

// needed: 
// position.scale_by()
// getRange()
// getGame()
const UPDATE_EVERY = 1000 / 60

const MOVEMENT_KEYS = {
  TOP: [87, 38],
  RIGHT: [68, 39],
  DOWN: [83, 40],
  LEFT: [65, 37]
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

const getProjectors = (containerSize, { width, height }) => {
  const widthRatio = containerSize.width / width
  const heightRatio = containerSize.height / height
  const unitOnScreen = Math.min(widthRatio, heightRatio)

  return {
    projectDistance: distance => distance * unitOnScreen,
    projectPosition: position => position.scale_by(unitOnScreen)
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
  console.log(x, y)
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

const render = (state) => {
  const { game, bestScore, projectDistance, projectPosition } = state
  const { width, height, food, snake, score } = game.state
  const [viewWidth, viewHeight] = [width, height].map(projectDistance)
  const context = getContext(viewWidth, viewHeight)
  const cellSide = viewWidth / width
  renderCells(context, cellSide, width, height)
  renderFood(context, cellSide, projectPosition(food))
  renderSnake(context, cellSide, snake.map(projectPosition))
  renderScores(score, bestScore)
}
// #endregion

// #region main
const getInitialState = () => {
  const game = getGame()
  const containerSize = getContainerSize()
  return {
    game,
    bestScore: parseInt(localStorage.bestScore) || 0,
    ...containerSize,
    ...getProjectors(containerSize, game.state)
  }
}

const getNewStatePropsOnTick = (oldState) => {
  if (oldState.stopTime) return oldState

  const lastUpdate = Date.now()
  if (oldState.lastUpdate) {
    const game = oldState.game.iterate(oldState.movement, lastUpdate - oldState.lastUpdate)
    const newProps = {
      game,
      lastUpdate
    }
    if (game.state.score > oldState.bestScore) {
      localStorage.setItem('bestScore', game.state.score)
      return {
        ...newProps,
        bestScore: game.state.score
      }
    }
    return newProps
  }

  return {
    lastUpdate
  }
}

const startGame = () => {
  let state = getInitialState()
  const updateState = props => {
    state = { ...state, ...props }
  }

  window.addEventListener('resize', () => {
    clearContainer()
    const containerSize = getContainerSize()
    updateState({ ...containerSize, ...getProjectors(containerSize, state.game.state) })
    tick()
  })
  window.addEventListener('keydown', ({ which }) => {
    const entries = Object.entries(MOVEMENT_KEYS)
    const [movement] = entries.find(([, keys]) => keys.includes(which)) || [undefined]
    updateState({ movement })
  })
  window.addEventListener('keyup', ({ which }) => {
    updateState({ movement: undefined })
    if (which === STOP_KEY) {
      const now = Date.now()
      if (state.stopTime) {
        updateState({ stopTime: undefined, lastUpdate: state.time + now - state.lastUpdate })
      } else {
        updateState({ stopTime: now })
      }
    }
  })

  const tick = () => {
    const newProps = getNewStatePropsOnTick(state)
    updateState(newProps)
    render(state)
  }
  setInterval(tick, UPDATE_EVERY)
}
// #endregion

startGame()