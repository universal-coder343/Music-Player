class MusicPlayer {
  constructor () {
    this.audio = document.getElementById('audio')
    this.playPauseBtn = document.getElementById('playPauseBtn')
    this.prevBtn = document.getElementById('prevBtn')
    this.nextBtn = document.getElementById('nextBtn')
    this.progressBar = document.getElementById('progressBar')
    this.progress = document.getElementById('progress')
    this.currentTime = document.getElementById('currentTime')
    this.duration = document.getElementById('duration')
    this.volumeSlider = document.getElementById('volumeSlider')
    this.fileInput = document.getElementById('fileInput')
    this.playlist = document.getElementById('playlist')
    this.songTitle = document.getElementById('songTitle')
    this.artistName = document.getElementById('artistName')

    this.songs = []
    this.currentSongIndex = 0
    this.isPlaying = false

    // Audio visualizer setup
    this.canvas = document.getElementById('visualizer')
    this.ctx = this.canvas.getContext('2d')
    this.audioContext = null
    this.analyser = null
    this.dataArray = null
    this.source = null
    this.animationId = null

    this.initEventListeners()
    this.setupVisualizer()
  }

  initEventListeners () {
    this.playPauseBtn.addEventListener('click', () => this.togglePlayPause())
    this.prevBtn.addEventListener('click', () => this.previousSong())
    this.nextBtn.addEventListener('click', () => this.nextSong())
    this.progressBar.addEventListener('click', e => this.setProgress(e))
    this.volumeSlider.addEventListener('input', e => this.setVolume(e))
    this.fileInput.addEventListener('change', e => this.loadFiles(e))

    this.audio.addEventListener('timeupdate', () => this.updateProgress())
    this.audio.addEventListener('loadedmetadata', () => this.updateDuration())
    this.audio.addEventListener('ended', () => this.nextSong())
  }

  loadFiles (event) {
    const files = Array.from(event.target.files)
    this.songs = files.map((file, index) => ({
      file: file,
      name: file.name.replace(/\.[^/.]+$/, ''),
      url: URL.createObjectURL(file)
    }))

    this.renderPlaylist()
    if (this.songs.length > 0) {
      this.loadSong(0)
    }
  }

  renderPlaylist () {
    this.playlist.innerHTML = ''
    this.songs.forEach((song, index) => {
      const item = document.createElement('div')
      item.className = 'playlist-item'
      item.textContent = song.name
      item.addEventListener('click', () => this.loadSong(index))
      this.playlist.appendChild(item)
    })
  }

  loadSong (index) {
    if (index >= 0 && index < this.songs.length) {
      this.currentSongIndex = index
      const song = this.songs[index]

      this.audio.src = song.url
      this.songTitle.textContent = song.name
      this.artistName.textContent = 'Unknown Artist'

      // Update playlist active state
      document.querySelectorAll('.playlist-item').forEach((item, i) => {
        item.classList.toggle('active', i === index)
      })
    }
  }

  togglePlayPause () {
    if (this.songs.length === 0) return

    if (this.isPlaying) {
      this.audio.pause()
      this.playPauseBtn.textContent = '▶'
      this.stopVisualizer()
    } else {
      this.audio.play()
      this.playPauseBtn.textContent = '⏸'
      this.startVisualizer()
    }
    this.isPlaying = !this.isPlaying
  }

  previousSong () {
    if (this.songs.length === 0) return
    this.currentSongIndex =
      (this.currentSongIndex - 1 + this.songs.length) % this.songs.length
    this.loadSong(this.currentSongIndex)
    if (this.isPlaying) {
      this.audio.play()
    }
  }

  nextSong () {
    if (this.songs.length === 0) return
    this.currentSongIndex = (this.currentSongIndex + 1) % this.songs.length
    this.loadSong(this.currentSongIndex)
    if (this.isPlaying) {
      this.audio.play()
    }
  }

  setProgress (event) {
    const rect = this.progressBar.getBoundingClientRect()
    const percent = (event.clientX - rect.left) / rect.width
    this.audio.currentTime = percent * this.audio.duration
  }

  updateProgress () {
    if (this.audio.duration) {
      const percent = (this.audio.currentTime / this.audio.duration) * 100
      this.progress.style.width = percent + '%'
      this.currentTime.textContent = this.formatTime(this.audio.currentTime)
    }
  }

  updateDuration () {
    this.duration.textContent = this.formatTime(this.audio.duration)
  }

  setVolume (event) {
    this.audio.volume = event.target.value / 100
  }

  formatTime (seconds) {
    if (isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  setupVisualizer () {
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 256

      const bufferLength = this.analyser.frequencyBinCount
      this.dataArray = new Uint8Array(bufferLength)

      // Connect audio element to analyser
      if (!this.source) {
        this.source = this.audioContext.createMediaElementSource(this.audio)
        this.source.connect(this.analyser)
        this.analyser.connect(this.audioContext.destination)
      }
    } catch (error) {
      console.log('Web Audio API not supported:', error)
    }
  }

  startVisualizer () {
    if (!this.analyser) return

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume()
    }

    this.drawVisualizer()
  }

  stopVisualizer () {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
      this.animationId = null
    }
    this.clearCanvas()
  }

  drawVisualizer () {
    if (!this.analyser) return

    this.animationId = requestAnimationFrame(() => this.drawVisualizer())

    this.analyser.getByteFrequencyData(this.dataArray)

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    const barWidth = (this.canvas.width / this.dataArray.length) * 2.5
    let barHeight
    let x = 0

    // Create gradient
    const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0)
    gradient.addColorStop(0, '#07229aff')
    gradient.addColorStop(0.5, '#260943ff')
    gradient.addColorStop(1, '#bc2f2fff')

    for (let i = 0; i < this.dataArray.length; i++) {
      barHeight = (this.dataArray[i] / 255) * this.canvas.height * 0.8

      this.ctx.fillStyle = gradient
      this.ctx.fillRect(x, this.canvas.height - barHeight, barWidth, barHeight)

      x += barWidth + 1
    }
  }

  clearCanvas () {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Draw static bars when not playing
    const barWidth = 4
    const barCount = Math.floor(this.canvas.width / (barWidth + 1))
    const gradient = this.ctx.createLinearGradient(0, this.canvas.height, 0, 0)
    gradient.addColorStop(0, 'rgba(11, 22, 74, 0.3)')
    gradient.addColorStop(1, 'rgba(15, 4, 27, 0.3)')

    this.ctx.fillStyle = gradient

    for (let i = 0; i < barCount; i++) {
      const x = i * (barWidth + 1)
      const height = Math.random() * this.canvas.height * 0.3 + 10
      this.ctx.fillRect(x, this.canvas.height - height, barWidth, height)
    }
  }
}

// Initialize the music player
const player = new MusicPlayer()

// Initialize visualizer with static bars
setTimeout(() => {
  player.clearCanvas()
}, 100)
