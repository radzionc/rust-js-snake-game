const getRange = length => [...Array(length).keys()]

export class View {
  constructor(gameWidth, gameHeight, onViewChange = () => {}) {
    this.gameWidth = gameWidth
    this.gameHeight = gameHeight
    this.container = document.getElementById('container')
    this.onViewChange = onViewChange
    this.setUp()

    window.addEventListener('resize', () => {
      const [child] = this.container.children
      if (child) {
        this.container.removeChild(child)
      }
      this.setUp()
      this.onViewChange()
    })
  }

  setUp() {
    const { width, height } = this.container.getBoundingClientRect()
    this.unitOnScreen = Math.min(
      width / this.gameWidth,
      height / this.gameHeight
    )
    this.projectDistance = distance => distance * this.unitOnScreen
    this.projectPosition = position => position.scale_by(this.unitOnScreen)

    const canvas = document.createElement('canvas')
    this.container.appendChild(canvas)
    this.context = canvas.getContext('2d')
    canvas.setAttribute('width', this.projectDistance(this.gameWidth))
    canvas.setAttribute('height', this.projectDistance(this.gameHeight))
  }

  render(food, snake, score, bestScore) {
    this.context.clearRect(
      0,
      0,
      this.context.canvas.width,
      this.context.canvas.height
    )
    
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

    const projectedFood = this.projectPosition(food.coord)

    this.context.beginPath()
    this.context.arc(
      projectedFood.x,
      projectedFood.y,
      this.unitOnScreen / 2.5,
      0,
      2 * Math.PI
    )
    switch(food.food_type){
      case 0:
        this.context.fillStyle = '#e74c3c';
        break;
      case 1:
        this.context.fillStyle = 'green';
        break;
      case 2:
        this.context.fillStyle = 'white';
        break;
      case 3:
        this.context.fillStyle = 'yellow';
        break;
    }
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