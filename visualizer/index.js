// Audio Visualizer con Web Audio API
class AudioVisualizer {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.audioFile = document.getElementById('audioFile');
        this.playBtn = document.getElementById('playBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.visualizerType = document.getElementById('visualizerType');

        this.audio = new Audio();
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.bufferLength = null;
        this.source = null;
        this.animationId = null;

        this.setupCanvas();
        this.setupEventListeners();
    }

    setupCanvas() {
        // Ajustar el canvas al tamaño del contenedor
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    }

    setupEventListeners() {
        // Cargar archivo de audio
        this.audioFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.audio.src = url;
                this.playBtn.disabled = false;
                this.initAudioContext();
            }
        });

        // Reproducir audio
        this.playBtn.addEventListener('click', () => {
            this.audio.play();
            this.playBtn.disabled = true;
            this.pauseBtn.disabled = false;
            this.visualize();
        });

        // Pausar audio
        this.pauseBtn.addEventListener('click', () => {
            this.audio.pause();
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
            cancelAnimationFrame(this.animationId);
        });

        // Cambiar tipo de visualización
        this.visualizerType.addEventListener('change', () => {
            // La visualización se actualizará automáticamente en el próximo frame
        });

        // Ajustar canvas al cambiar el tamaño de la ventana
        window.addEventListener('resize', () => {
            this.setupCanvas();
        });

        // Reiniciar cuando termine el audio
        this.audio.addEventListener('ended', () => {
            this.playBtn.disabled = false;
            this.pauseBtn.disabled = true;
            cancelAnimationFrame(this.animationId);
        });
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

    visualize() {
        this.animationId = requestAnimationFrame(() => this.visualize());
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
        }
    }

    drawBars() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const barWidth = (width / this.bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        // Limpiar canvas con efecto de desvanecimiento
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, width, height);

        for (let i = 0; i < this.bufferLength; i++) {
            barHeight = (this.dataArray[i] / 255) * height * 0.8;

            // Crear gradiente para cada barra
            const gradient = this.ctx.createLinearGradient(0, height - barHeight, 0, height);
            gradient.addColorStop(0, `hsl(${(i / this.bufferLength) * 360}, 100%, 50%)`);
            gradient.addColorStop(1, `hsl(${(i / this.bufferLength) * 360}, 100%, 70%)`);

            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(x, height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    }

    drawCircle() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.3;

        // Limpiar canvas con efecto de desvanecimiento
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        this.ctx.fillRect(0, 0, width, height);

        // Dibujar círculo central
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.5, 0, 2 * Math.PI);
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Dibujar barras radiales
        for (let i = 0; i < this.bufferLength; i++) {
            const angle = (i / this.bufferLength) * 2 * Math.PI;
            const barHeight = (this.dataArray[i] / 255) * radius;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            this.ctx.beginPath();
            this.ctx.moveTo(x1, y1);
            this.ctx.lineTo(x2, y2);
            this.ctx.strokeStyle = `hsl(${(i / this.bufferLength) * 360}, 100%, 50%)`;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
        }
    }

    drawWave() {
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Limpiar canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.fillRect(0, 0, width, height);

        // Obtener datos de forma de onda
        this.analyser.getByteTimeDomainData(this.dataArray);

        // Dibujar línea central
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(0, height / 2);
        this.ctx.lineTo(width, height / 2);
        this.ctx.stroke();

        // Dibujar forma de onda
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();

        const sliceWidth = width / this.bufferLength;
        let x = 0;

        for (let i = 0; i < this.bufferLength; i++) {
            const v = this.dataArray[i] / 128.0;
            const y = v * height / 2;

            // Crear gradiente para la onda
            const gradient = this.ctx.createLinearGradient(0, 0, width, 0);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(0.5, '#764ba2');
            gradient.addColorStop(1, '#F093FB');
            this.ctx.strokeStyle = gradient;

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

// Inicializar el visualizador cuando se cargue la página
document.addEventListener('DOMContentLoaded', () => {
    new AudioVisualizer();
});
