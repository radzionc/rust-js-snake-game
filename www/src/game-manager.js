import { Vector, Game } from "wasm-snake-game";

import { View } from './view'
import { Controller } from './controller'

const UPDATE_EVERY = 1000 / 60

export class GameManager {
  constructor() {
    this.restart()
    this.bestScore = parseInt(localStorage.bestScore) || 0
    this.view = new View(
      this.game.width,
      this.game.height,
      this.render.bind(this)
    )
    this.controller = new Controller(
      this.onStop.bind(this)
    )
  }

  onStop() {
    const now = Date.now()
    if (this.stopTime) {
      this.stopTime = undefined
      this.lastUpdate = this.time + now - this.lastUpdate
    } else {
      this.stopTime = now
    }
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
        this.game.process(lastUpdate - this.lastUpdate, this.controller.movement)
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
    setInterval(this.tick.bind(this), UPDATE_EVERY)
  }
}