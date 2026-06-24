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

        // Logo central con glitch
        this.logo = null;
        this.logoR = null;
        this.logoG = null;
        this.logoB = null;

        this.setupCanvas();
        this.setupEventListeners();
        this.loadLogo();
        this.animate();
    }

    loadLogo() {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            this.logo = img;
            this.logoR = this.makeTinted(img, 255, 0, 0);
            this.logoG = this.makeTinted(img, 0, 255, 0);
            this.logoB = this.makeTinted(img, 0, 0, 255);
        };
        img.src = 'https://jesus1942.github.io/natalia-natalia-Agenda-de-turnos/denovaje-white.png';
    }

    // Crea una version teñida del logo (para el RGB-split del glitch)
    makeTinted(img, r, g, b) {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const cx = c.getContext('2d');
        cx.drawImage(img, 0, 0);
        // Teñir manteniendo el alpha original del logo
        cx.globalCompositeOperation = 'multiply';
        cx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        cx.fillRect(0, 0, c.width, c.height);
        cx.globalCompositeOperation = 'destination-in';
        cx.drawImage(img, 0, 0);
        return c;
    }

    // Logo central con efecto glitch reactivo al bass
    drawLogo(centerX, baseRadius) {
        if (!this.logo) return;

        const glitch = this.bassPulse || 0;
        const aspect = this.logo.naturalHeight / this.logo.naturalWidth;
        const w = baseRadius * 1.9;
        const h = w * aspect;
        const cx = centerX;
        const cy = baseRadius * 0.85; // dentro del nucleo, visible
        const dx = w / 2;
        const dy = h / 2;

        // Desplazamiento del RGB-split segun el golpe
        const shift = glitch * 16 + Math.random() * glitch * 6;

        this.ctx.save();
        this.ctx.globalCompositeOperation = 'lighter';
        // Canal rojo a un lado, azul al otro, verde con jitter -> se rearma blanco en silencio
        this.ctx.drawImage(this.logoR, cx - dx - shift, cy - dy + (Math.random() - 0.5) * glitch * 4, w, h);
        this.ctx.drawImage(this.logoG, cx - dx + (Math.random() - 0.5) * shift, cy - dy, w, h);
        this.ctx.drawImage(this.logoB, cx - dx + shift, cy - dy - (Math.random() - 0.5) * glitch * 4, w, h);
        this.ctx.restore();

        // Desgarro horizontal (slices) en los golpes fuertes
        if (glitch > 0.35) {
            const slices = 2 + Math.floor(Math.random() * 3);
            for (let s = 0; s < slices; s++) {
                const srcY = Math.random() * this.logo.naturalHeight;
                const srcH = this.logo.naturalHeight * (0.04 + Math.random() * 0.1);
                const off = (Math.random() - 0.5) * glitch * 45;
                const destY = cy - dy + (srcY / this.logo.naturalHeight) * h;
                this.ctx.drawImage(
                    this.logo,
                    0, srcY, this.logo.naturalWidth, srcH,
                    cx - dx + off, destY, w, (srcH / this.logo.naturalHeight) * h
                );
            }
        }
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
        // Nucleo pegado al borde superior, centrado
        const centerX = width / 2;
        const centerY = 0;
        const radius = Math.min(width, height) * 0.16;

        // Fade suave
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        this.ctx.fillRect(0, 0, width, height);

        // Tiempo para deformacion continua
        if (!this.cloudTime) this.cloudTime = 0;
        this.cloudTime += 0.02;

        const half = Math.floor(this.bufferLength / 2);

        // Nivel de graves (primeros bins) para que la estrella lata estilo TrapNation
        let bassSum = 0;
        const bassBins = 8;
        for (let b = 0; b < bassBins; b++) bassSum += this.dataArray[b];
        const bass = (bassSum / bassBins) / 255; // 0..1
        // Suavizado para que el latido sea organico y no tiemble
        if (this.bassPulse === undefined) this.bassPulse = 0;
        this.bassPulse += (bass - this.bassPulse) * 0.25;

        // El nucleo/estrella crece y encoge con el bass
        const coreRadius = radius * (1 + this.bassPulse * 0.8);

        // La deformacion respira sola y se amplifica con la musica
        const getDeform = (idx) =>
            (Math.sin(this.cloudTime + idx * 0.1) * 10 +
             Math.cos(this.cloudTime * 1.3 + idx * 0.15) * 7) *
            (1 + this.bassPulse * 1.5);

        // Corona del nucleo: mas grande y pulsa con el bass
        const coronaR = coreRadius * (3.4 + this.bassPulse * 1.2);
        const coreGlow = this.ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, coronaR
        );
        coreGlow.addColorStop(0, `rgba(255, 255, 255, ${0.4 + this.bassPulse * 0.4})`);
        coreGlow.addColorStop(0.35, `rgba(215, 215, 215, ${0.12 + this.bassPulse * 0.18})`);
        coreGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = coreGlow;
        this.ctx.fillRect(0, 0, width, height);

        // dir: +1 lado derecho, -1 lado izquierdo (espejo)
        const drawSide = (dir, alphaMul) => {
            for (let i = 0; i < half; i++) {
                // Abanico que cuelga hacia abajo: PI/2 (recto abajo) -> 0 (horizonte)
                const a1 = (Math.PI / 2) * (1 - i / half);
                const a2 = (Math.PI / 2) * (1 - (i + 1) / half);

                const av1 = this.dataArray[i] / 255;
                const av2 = this.dataArray[i + 1] / 255;
                const bh1 = av1 * coreRadius * 3.2;
                const bh2 = av2 * coreRadius * 3.2;
                const d1 = getDeform(i);
                const d2 = getDeform(i + 1);

                // Punto interno (radio base que late) y externo (radio + barra)
                const ix1 = centerX + dir * Math.cos(a1) * (coreRadius + d1);
                const iy1 = centerY + Math.sin(a1) * (coreRadius + d1);
                const ox1 = centerX + dir * Math.cos(a1) * (coreRadius + bh1 + d1);
                const oy1 = centerY + Math.sin(a1) * (coreRadius + bh1 + d1);

                const ix2 = centerX + dir * Math.cos(a2) * (coreRadius + d2);
                const iy2 = centerY + Math.sin(a2) * (coreRadius + d2);
                const ox2 = centerX + dir * Math.cos(a2) * (coreRadius + bh2 + d2);
                const oy2 = centerY + Math.sin(a2) * (coreRadius + bh2 + d2);

                this.ctx.beginPath();
                this.ctx.moveTo(ix1, iy1);
                this.ctx.lineTo(ox1, oy1);
                this.ctx.lineTo(ox2, oy2);
                this.ctx.lineTo(ix2, iy2);
                this.ctx.closePath();

                const brightness = Math.floor(av1 * 255);
                this.ctx.fillStyle = `rgba(${brightness}, ${brightness}, ${brightness}, ${0.3 * alphaMul})`;
                this.ctx.fill();

                this.ctx.strokeStyle = `rgba(255, 255, 255, ${av1 * 0.4 * alphaMul})`;
                this.ctx.lineWidth = 1.5;
                this.ctx.stroke();
            }
        };

        drawSide(1, 1);    // derecha
        drawSide(-1, 1);   // izquierda (espejo)

        // Logo central con glitch al son del bass
        this.drawLogo(centerX, radius);
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
