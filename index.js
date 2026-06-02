class AudioVisualizer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioFile = document.getElementById('audioFile');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.visualizerType = document.getElementById('visualizerType');
        this.youtubeUrl = document.getElementById('youtubeUrl');
        this.loadYt = document.getElementById('loadYt');
        this.micBtn = document.getElementById('micBtn');
        this.toggleControls = document.getElementById('toggleControls');
        this.controlsPanel = document.getElementById('controls');

        this.audio = new Audio();
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.source = null;
        this.animationId = null;
        this.particles = [];
        this.micStream = null;
        this.isUsingMic = false;

        this.setupCanvas();
        this.setupEventListeners();
        this.animate();
    }

    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        this.audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.stopMic();
                const url = URL.createObjectURL(file);
                this.audio.src = url;
                this.playBtn.disabled = false;
                this.initAudioContext();
            }
        });

        this.loadYt.addEventListener('click', () => {
            const url = this.youtubeUrl.value.trim();
            if (url) {
                this.loadYouTube(url);
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

        this.micBtn.addEventListener('click', () => {
            if (this.isUsingMic) {
                this.stopMic();
            } else {
                this.startMic();
            }
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

    async startMic() {
        try {
            this.audio.pause();
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.micStream = stream;
            this.isUsingMic = true;
            this.micBtn.textContent = '⏹';
            this.micBtn.style.background = 'rgba(255, 50, 50, 0.2)';

            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;

            const micSource = this.audioContext.createMediaStreamSource(stream);
            micSource.connect(this.analyser);

            this.bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(this.bufferLength);

            this.playBtn.disabled = true;
            this.pauseBtn.disabled = true;
        } catch (err) {
            alert('No se pudo acceder al micrófono');
        }
    }

    stopMic() {
        if (this.micStream) {
            this.micStream.getTracks().forEach(track => track.stop());
            this.micStream = null;
            this.isUsingMic = false;
            this.micBtn.textContent = '🎤';
            this.micBtn.style.background = '';
            this.playBtn.disabled = false;
        }
    }

    loadYouTube(url) {
        const videoId = this.extractYouTubeId(url);
        if (!videoId) {
            alert('URL de YouTube inválida');
            return;
        }

        this.stopMic();

        const audioUrl = `https://www.youtube.com/watch?v=${videoId}`;
        alert('Por limitaciones del navegador, pega esta URL en YouTube y activa el micrófono para visualizar el audio que se reproduce.');
    }

    extractYouTubeId(url) {
        const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[7].length === 11) ? match[7] : null;
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 512;

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

        const type = this.visualizerType.value;

        switch(type) {
            case 'bars':
                this.drawBars();
                break;
            case 'circle':
                this.drawCircle();
                break;
            case 'wave':
                this.drawWave();
                break;
            case 'particles':
                this.drawParticles();
                break;
        }
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

            const hue = (i / this.bufferLength) * 360;
            this.ctx.fillStyle = `hsla(${hue}, 70%, 60%, 0.8)`;

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

            const hue = (i / this.bufferLength) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.8)`;
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

            const hue = (i / this.bufferLength) * 360;
            this.ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.9)`;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        this.ctx.stroke();
    }

    drawParticles() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        this.ctx.fillRect(0, 0, width, height);

        const avg = this.dataArray.reduce((a, b) => a + b) / this.bufferLength;

        if (avg > 30 && Math.random() > 0.7) {
            for (let i = 0; i < 3; i++) {
                this.particles.push({
                    x: width / 2,
                    y: height / 2,
                    vx: (Math.random() - 0.5) * 10,
                    vy: (Math.random() - 0.5) * 10,
                    size: Math.random() * 4 + 2,
                    hue: Math.random() * 360,
                    life: 1
                });
            }
        }

        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.2;
            p.life -= 0.01;

            if (p.life > 0) {
                this.ctx.fillStyle = `hsla(${p.hue}, 70%, 60%, ${p.life})`;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.ctx.fill();
                return true;
            }
            return false;
        });
    }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizer();
});
