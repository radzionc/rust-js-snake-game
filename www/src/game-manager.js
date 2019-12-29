import { Game, Vector } from 'wasm-snake-game'

import CONFIG from './config'

export class GameManager {
  constructor() {
    this.restart()
  }

  restart() {
    this.game = new Game(
      CONFIG.WIDTH,
      CONFIG.HEIGHT,
      CONFIG.SPEED,
      CONFIG.SNAKE_LENGTH,
      new Vector(
        CONFIG.SNAKE_DIRECTION_X,
        CONFIG.SNAKE_DIRECTION_Y
      )
    )
    console.log(this.game)
  }

  run() {
    // running the game
  }
}