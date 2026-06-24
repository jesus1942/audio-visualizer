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
        this.guardSensitivity = 7;
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
            alert('Para proyectar al TV:\n\n1. Android: Usa "Smart View" o "Pantalla inalambrica"\n2. iPhone: Usa AirPlay\n3. Chromecast: Toca el icono de Cast en Chrome\n\nLuego activa Modo Guardia');
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
            alert('Error: No se pudo acceder al microfono. Verifica los permisos.');
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

        // Detect sudden spikes (footsteps, knocks, voices)
        const maxVal = Math.max(...this.dataArray);
        const isSuddenNoise = maxVal > (255 - this.guardSensitivity * 15);

        const threshold = 20 + (this.guardSensitivity * 5);
        const brightnessMultiplier = this.guardBrightness / 10;

        // MODO DISUASIÓN: Respuesta agresiva a ruidos
        if (avg > threshold || isSuddenNoise) {
            // Flash blanco INMEDIATO para cámaras
            this.ctx.fillStyle = `rgba(255, 255, 255, ${brightnessMultiplier})`;
            this.ctx.fillRect(0, 0, width, height);

            // Patrón de "alerta" - parpadeo rápido
            if (Math.random() > 0.5) {
                this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                this.ctx.fillRect(0, 0, width, height);
            }
        } else {
            // Fade más lento para que las cámaras detecten el cambio
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
            this.ctx.fillRect(0, 0, width, height);
        }

        // Actividad aleatoria para simular vigilancia humana
        if (Math.random() > 0.98) {
            const randomIntensity = Math.random() * 0.5 * brightnessMultiplier;
            this.ctx.fillStyle = `rgba(255, 255, 255, ${randomIntensity})`;
            this.ctx.fillRect(0, 0, width, height);
        }

        // Gradiente adicional en sonidos sostenidos (conversaciones, pasos continuos)
        if (avg > 80) {
            const gradient = this.ctx.createRadialGradient(
                width/2, height/2, 0,
                width/2, height/2, Math.max(width, height)/2
            );
            const intensity = (avg / 255) * brightnessMultiplier;
            gradient.addColorStop(0, `rgba(255, 255, 255, ${intensity * 1.5})`);
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.5})`);
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

        // Fade effect con desvanecimiento lento
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, width, height);

        // Inicializar particulas si no existen
        if (!this.circleParticles) this.circleParticles = [];

        // ESPEJO SUPERIOR (original)
        this.ctx.save();
        for (let i = 0; i < this.bufferLength / 2; i++) {
            const angle = (i / (this.bufferLength / 2)) * Math.PI;
            const barHeight = (this.dataArray[i] / 255) * radius * 1.2;

            // Agregar variacion de trazo a mano (jitter)
            const jitterX = (Math.random() - 0.5) * 2;
            const jitterY = (Math.random() - 0.5) * 2;

            const x1 = centerX + Math.cos(angle) * radius + jitterX;
            const y1 = centerY - Math.sin(angle) * radius + jitterY;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight) + jitterX;
            const y2 = centerY - Math.sin(angle) * (radius + barHeight) + jitterY;

            // Trazo con efecto lapiz (lineas no perfectas)
            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);

            // Curva con puntos intermedios para efecto organico
            const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 3;
            const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 3;
            this.ctx.quadraticCurveTo(midX, midY, x2, y2);

            const hue = (i / this.bufferLength) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 80%, 65%, 0.9)`;
            this.ctx.lineWidth = 2.5;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();

            // Crear gotitas en picos de audio
            if (barHeight > radius * 0.6 && Math.random() > 0.7) {
                this.circleParticles.push({
                    x: x2,
                    y: y2,
                    vx: (Math.cos(angle) * 2 + (Math.random() - 0.5) * 2),
                    vy: (-Math.sin(angle) * 2 + (Math.random() - 0.5) * 2),
                    size: Math.random() * 2 + 1,
                    hue: hue,
                    life: 1,
                    alpha: 0.8
                });
            }
        }
        this.ctx.restore();

        // ESPEJO INFERIOR (reflejo)
        this.ctx.save();
        this.ctx.translate(0, centerY);
        this.ctx.scale(1, -1);
        this.ctx.translate(0, -centerY);

        for (let i = 0; i < this.bufferLength / 2; i++) {
            const angle = (i / (this.bufferLength / 2)) * Math.PI;
            const barHeight = (this.dataArray[i] / 255) * radius * 1.2;

            const jitterX = (Math.random() - 0.5) * 2;
            const jitterY = (Math.random() - 0.5) * 2;

            const x1 = centerX + Math.cos(angle) * radius + jitterX;
            const y1 = centerY - Math.sin(angle) * radius + jitterY;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight) + jitterX;
            const y2 = centerY - Math.sin(angle) * (radius + barHeight) + jitterY;

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);

            const midX = (x1 + x2) / 2 + (Math.random() - 0.5) * 3;
            const midY = (y1 + y2) / 2 + (Math.random() - 0.5) * 3;
            this.ctx.quadraticCurveTo(midX, midY, x2, y2);

            const hue = (i / this.bufferLength) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 80%, 65%, 0.6)`;
            this.ctx.lineWidth = 2.5;
            this.ctx.lineCap = 'round';
            this.ctx.stroke();
        }
        this.ctx.restore();

        // Dibujar y actualizar particulas tipo gotitas
        this.circleParticles = this.circleParticles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // Gravedad sutil
            p.vx *= 0.98; // Friccion
            p.life -= 0.012;
            p.alpha -= 0.008;

            if (p.life > 0 && p.alpha > 0) {
                // Gotita con trazo irregular
                this.ctx.save();
                this.ctx.globalAlpha = Math.max(0, p.alpha);
                this.ctx.fillStyle = `hsl(${p.hue}, 70%, 60%)`;

                // Forma irregular tipo gotita
                this.ctx.beginPath();
                const segments = 6;
                for (let i = 0; i <= segments; i++) {
                    const a = (i / segments) * Math.PI * 2;
                    const r = p.size + Math.sin(a * 3) * (p.size * 0.3);
                    const px = p.x + Math.cos(a) * r;
                    const py = p.y + Math.sin(a) * r;
                    if (i === 0) {
                        this.ctx.moveTo(px, py);
                    } else {
                        this.ctx.lineTo(px, py);
                    }
                }
                this.ctx.closePath();
                this.ctx.fill();

                // Brillo interno
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
                this.ctx.fillStyle = `hsla(${p.hue}, 80%, 80%, ${p.alpha * 0.6})`;
                this.ctx.fill();

                this.ctx.restore();
                return true;
            }
            return false;
        });
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
