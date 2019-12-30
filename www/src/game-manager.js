import { Game, Vector } from 'wasm-snake-game'

import CONFIG from './config'
import { View } from './view'

export class GameManager {
  constructor() {
    this.restart()
    this.view = new View(
      this.game.width,
      this.game.height,
      this.render.bind(this)
    )
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

  render() {
    this.view.render(
      this.game.food,
      this.game.get_snake(),
      this.game.score,
      // TODO actual best score
      0
    )
  }

  run() {
    this.render()
  }
}