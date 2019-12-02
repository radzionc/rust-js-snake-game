const getRange = length => [...Array(length).keys()]

export class View {
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
    this.context.fillStyle = 'black'
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