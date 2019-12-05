import { Vector, Game, Movement } from "wasm-snake-game";
import { View } from './view'

const UPDATE_EVERY = 1000 / 60

const MOVEMENT_KEYS = {
  [Movement.TOP]: [87, 38],
  [Movement.RIGHT]: [68, 39],
  [Movement.DOWN]: [83, 40],
  [Movement.LEFT]: [65, 37]
}

const STOP_KEY = 32

export class GameManager {
  constructor() {
    this.restart()
    this.bestScore = parseInt(localStorage.bestScore) || 0
    this.view = new View(
      this.game.width,
      this.game.height,
      this.render.bind(this)
    )
  }

  restart() {
    this.game = new Game(
      17,
      15,
      0.006,
      3,
      new Vector(1, 0)
    )
    this.lastUpdate = undefined
    this.stopTime = undefined
    this.movement = undefined
  }

  render() {
    this.view.render(
      this.game.food,
      this.game.get_snake(),
      this.game.score,
      this.bestScore
    )
  }

  tick() {
    if (!this.stopTime) {
      const lastUpdate = Date.now()
      if (this.lastUpdate) {
        this.game.process(lastUpdate - this.lastUpdate, this.movement)
        if (this.game.is_over()) {
          this.restart()
          return
        }
        if (this.game.score > this.bestScore) {
          localStorage.setItem('bestScore', this.game.score)
          this.bestScore = this.game.score
        }
      }
      this.lastUpdate = lastUpdate
      this.render()
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