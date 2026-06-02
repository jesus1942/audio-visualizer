class Guardian {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.statusIndicator = document.getElementById('statusIndicator');

        // Controls
        this.guardMode = document.getElementById('guardMode');
        this.visualMode = document.getElementById('visualMode');
        this.guardSettings = document.getElementById('guardSettings');
        this.visualSettings = document.getElementById('visualSettings');
        this.startGuard = document.getElementById('startGuard');
        this.stopGuard = document.getElementById('stopGuard');
        this.sensitivity = document.getElementById('sensitivity');
        this.brightness = document.getElementById('brightness');
        this.frequency = document.getElementById('frequency');
        this.audioFile = document.getElementById('audioFile');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.visualizerType = document.getElementById('visualizerType');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.castBtn = document.getElementById('castBtn');
        this.toggleControls = document.getElementById('toggleControls');
        this.controlsPanel = document.getElementById('controls');

        this.audio = new Audio();
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.source = null;
        this.micStream = null;
        this.wakeLock = null;

        // Guard mode state
        this.isGuarding = false;
        this.guardSensitivity = 5;
        this.guardBrightness = 10;
        this.guardFrequency = 5;

        this.setupCanvas();
        this.setupEventListeners();
        this.animate();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Mode switching
        this.guardMode.addEventListener('click', () => {
            this.guardMode.classList.add('active');
            this.visualMode.classList.remove('active');
            this.guardSettings.style.display = 'block';
            this.visualSettings.style.display = 'none';
        });

        this.visualMode.addEventListener('click', () => {
            this.visualMode.classList.add('active');
            this.guardMode.classList.remove('active');
            this.visualSettings.style.display = 'block';
            this.guardSettings.style.display = 'none';
        });

        // Guard controls
        this.startGuard.addEventListener('click', () => this.startGuardMode());
        this.stopGuard.addEventListener('click', () => this.stopGuardMode());

        // Sliders
        this.sensitivity.addEventListener('input', (e) => {
            this.guardSensitivity = parseInt(e.target.value);
            document.getElementById('sensitivityValue').textContent = e.target.value;
        });

        this.brightness.addEventListener('input', (e) => {
            this.guardBrightness = parseInt(e.target.value);
            document.getElementById('brightnessValue').textContent = e.target.value;
        });

        this.frequency.addEventListener('input', (e) => {
            this.guardFrequency = parseInt(e.target.value);
            document.getElementById('frequencyValue').textContent = e.target.value;
        });

        // Audio file
        this.audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.audio.src = url;
                this.playBtn.disabled = false;
                this.initAudioContext();
            }
        });

        this.playBtn.addEventListener('click', () => {
            this.audio.play();
            this.playBtn.disabled = true;
            this.pauseBtn.disabled = false;
        });

        this.pauseBtn.addEventListener('click', () => {
            this.audio.pause();
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
        });

        // Fullscreen
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

        // Cast button (shows instruction)
        this.castBtn.addEventListener('click', () => {
            alert('Para proyectar al TV:\n\n1. Android: Usa "Smart View" o "Pantalla inalámbrica"\n2. iPhone: Usa AirPlay\n3. Chromecast: Toca el ícono de Cast en Chrome\n\nLuego activa Modo Guardia');
        });

        this.toggleControls.addEventListener('click', () => {
            this.controlsPanel.classList.toggle('hidden');
        });

        window.addEventListener('resize', () => {
            this.setupCanvas();
        });

        this.audio.addEventListener('ended', () => {
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
        });
    }

    async startGuardMode() {
        try {
            // Request microphone
            this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup audio analysis
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            const micSource = this.audioContext.createMediaStreamSource(this.micStream);
            micSource.connect(this.analyser);

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            // Request wake lock
            await this.requestWakeLock();

            // Update UI
            this.isGuarding = true;
            this.statusIndicator.textContent = '🔴';
            this.statusIndicator.classList.add('active');
            this.startGuard.style.display = 'none';
            this.stopGuard.style.display = 'block';
            this.controlsPanel.classList.add('hidden');

            // Auto fullscreen after 3 seconds
            setTimeout(() => {
                if (this.isGuarding) {
                    this.toggleFullscreen();
                }
            }, 3000);

        } catch (err) {
            alert('Error: No se pudo acceder al micrófono. Verifica los permisos.');
        }
    }

    stopGuardMode() {
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
        }

        if (this.wakeLock) {
            this.wakeLock.release();
            this.wakeLock = null;
        }

        this.isGuarding = false;
        this.statusIndicator.textContent = '⚫';
        this.statusIndicator.classList.remove('active');
        this.startGuard.style.display = 'block';
        this.stopGuard.style.display = 'none';

        if (document.fullscreenElement) {
            document.exitFullscreen();
        }

        // Clear canvas
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    async requestWakeLock() {
        try {
            if ('wakeLock' in navigator) {
                this.wakeLock = await navigator.wakeLock.request('screen');
            }
        } catch (err) {
            console.log('Wake Lock not supported');
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().then(() => {
                document.body.classList.add('fullscreen');
            });
        } else {
            document.exitFullscreen().then(() => {
                document.body.classList.remove('fullscreen');
            });
        }
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;

            this.source = this.audioContext.createMediaElementSource(this.audio);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.analyser) return;

        this.analyser.getByteFrequencyData(this.dataArray);

        if (this.isGuarding) {
            this.drawGuardMode();
        } else {
            const type = this.visualizerType.value;
            switch(type) {
                case 'flashbang':
                    this.drawFlashbang();
                    break;
                case 'strobe':
                    this.drawStrobe();
                    break;
                case 'bars':
                    this.drawBars();
                    break;
                case 'circle':
                    this.drawCircle();
                    break;
                case 'wave':
                    this.drawWave();
                    break;
            }
        }
    }

    drawGuardMode() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Calculate average volume
        const avg = this.dataArray.reduce((a, b) => a + b) / this.bufferLength;
        const threshold = 255 - (this.guardSensitivity * 20);
        const brightnessMultiplier = this.guardBrightness / 10;
        const changeSpeed = this.guardFrequency / 10;

        if (avg > threshold * brightnessMultiplier * changeSpeed) {
            // Flash white for camera detection
            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightnessMultiplier})`;
            this.ctx.fillRect(0, 0, width, height);
        } else {
            // Fade to black
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.ctx.fillRect(0, 0, width, height);
        }

        // Add moving gradient for more variation
        if (avg > 50) {
            const gradient = this.ctx.createRadialGradient(
                width/2, height/2, 0,
                width/2, height/2, Math.max(width, height)/2
            );
            const intensity = (avg / 255) * brightnessMultiplier;
            gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, width, height);
        }
    }

    drawFlashbang() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const avg = this.dataArray.reduce((a, b) => a + b) / this.bufferLength;

        if (avg > 50) {
            this.ctx.fillStyle = '#fff';
            this.ctx.fillRect(0, 0, width, height);
        } else {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            this.ctx.fillRect(0, 0, width, height);
        }
    }

    drawStrobe() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const avg = this.dataArray.reduce((a, b) => a + b) / this.bufferLength;

        const shouldFlash = Math.random() > (1 - (avg / 255));
        this.ctx.fillStyle = shouldFlash ? '#fff' : '#000';
        this.ctx.fillRect(0, 0, width, height);
    }

    drawBars() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(0, 0, width, height);

        const barWidth = (width / this.bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const barHeight = (this.dataArray[i] / 255) * height * 0.7;
            this.ctx.fillStyle = `hsl(${(i / this.bufferLength) * 360}, 70%, 60%)`;
            this.ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
            x += barWidth;
        }
    }

    drawCircle() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.25;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        this.ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < this.bufferLength; i++) {
            const angle = (i / this.bufferLength) * Math.PI * 2;
            const barHeight = (this.dataArray[i] / 255) * radius * 0.8;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = `hsl(${(i / this.bufferLength) * 360}, 70%, 60%)`;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        }
    }

    drawWave() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        this.ctx.fillRect(0, 0, width, height);

        this.analyser.getByteTimeDomainData(this.dataArray);

        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        const sliceWidth = width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * height / 2;

            this.ctx.strokeStyle = `hsl(${(i / this.bufferLength) * 360}, 70%, 60%)`;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.stroke();
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
    new Guardian();
});
