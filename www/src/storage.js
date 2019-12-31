export default {
  getBestScore: () => parseInt(localStorage.bestScore) || 0,
  setBestScore: (bestScore) => localStorage.setItem('bestScore', bestScore)
}