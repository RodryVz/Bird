document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const startScreen = document.getElementById('start-screen');
    const gameOverScreen = document.getElementById('game-over-screen');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const scoreDisplay = document.getElementById('score-display');
    const finalScore = document.getElementById('final-score');
    
    // Game variables
    let score = 0;
    let gameStarted = false;
    let gameOver = false;
    let animationFrameId;
    let frameCount = 0;
    
    // Bird properties - con sistema de carga de salto
    const bird = {
        x: 100,
        y: 300,
        width: 40,
        height: 30,
        gravity: 0.3,           // Gravedad reducida para mejor control
        velocity: 0,
        minLift: -6,             // Impulso mínimo
        maxLift: -12,            // Impulso máximo
        chargeTime: 0,           // Frames de carga actual
        maxChargeTime: 25,      // Frames máximos de carga
        color: '#FFEB3B',
        chargingColor: '#FFC107', // Color cuando está cargando
        
        // Inicia la carga del salto
        startCharge() {
            if (this.chargeTime === 0) {
                this.chargeTime = 1;
            }
        },
        
        // Continúa la carga mientras se mantiene presionado
        continueCharge() {
            if (this.chargeTime > 0 && this.chargeTime < this.maxChargeTime) {
                this.chargeTime++;
            }
        },
        
        // Ejecuta el salto con la potencia calculada
        flap() {
            const chargeRatio = Math.min(this.chargeTime / this.maxChargeTime, 1);
            this.velocity = this.minLift + (this.maxLift - this.minLift) * chargeRatio;
            this.chargeTime = 0;
        },
        
        // Actualiza la posición del pájaro
        update() {
            this.continueCharge();
            this.velocity += this.gravity;
            this.velocity *= 0.95; // Fricción para suavizar el movimiento
            this.y += this.velocity;
            
            // Limita al pájaro en los bordes superior e inferior
            if (this.y < 0) {
                this.y = 0;
                this.velocity = 0;
            }
        },
        
        // Dibuja el pájaro
        draw() {
            // Cambia el color si está cargando
            ctx.fillStyle = this.chargeTime > 0 ? this.chargingColor : this.color;
            
            // Cuerpo del pájaro
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // Pico
            ctx.fillStyle = '#FF9800';
            ctx.beginPath();
            ctx.moveTo(this.x + 15, this.y);
            ctx.lineTo(this.x + 25, this.y - 5);
            ctx.lineTo(this.x + 25, this.y + 5);
            ctx.fill();
            
            // Ojo
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Ala
            ctx.fillStyle = '#FBC02D';
            ctx.beginPath();
            ctx.ellipse(this.x - 5, this.y + 5, 10, 5, Math.PI/4, 0, Math.PI * 2);
            ctx.fill();
            
            // Indicador de carga (opcional)
            if (this.chargeTime > 0) {
                const chargePercent = Math.min(this.chargeTime / this.maxChargeTime, 1);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(this.x - 20, this.y - 30, 40 * chargePercent, 5);
            }
        },
        
        // Reinicia el pájaro a su posición inicial
        reset() {
            this.y = 300;
            this.velocity = 0;
            this.chargeTime = 0;
        }
    };
    
    // Tubos (pipes)
    const pipes = [];
    const pipeWidth = 60;
    const pipeGap = 180;         // Hueco más grande para mayor facilidad
    const pipeFrequency = 120;   // Frames entre tubos (más tiempo)
    
    // Crea un nuevo tubo
    function createPipe() {
        const minHeight = 70;
        const maxHeight = canvas.height - minHeight - pipeGap;
        const pipeHeight = Math.floor(Math.random() * (maxHeight - minHeight + 1) + minHeight);
        
        pipes.push({
            x: canvas.width,
            height: pipeHeight,
            passed: false
        });
    }
    
    // Dibuja los tubos
    function drawPipes() {
        ctx.fillStyle = '#4CAF50';
        
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];
            
            // Tubo superior
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.height);
            
            // Tubo inferior
            ctx.fillRect(
                pipe.x, 
                pipe.height + pipeGap, 
                pipeWidth, 
                canvas.height - pipe.height - pipeGap
            );
        }
    }
    
    // Actualiza la posición de los tubos
    function updatePipes() {
        // Elimina tubos que salieron de pantalla
        if (pipes.length > 0 && pipes[0].x < -pipeWidth) {
            pipes.shift();
        }
        
        // Mueve los tubos
        for (let i = 0; i < pipes.length; i++) {
            pipes[i].x -= 2;
            
            // Verifica si el pájaro pasó el tubo
            if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
                pipes[i].passed = true;
                score++;
                scoreDisplay.textContent = score;
            }
        }
        
        // Crea nuevos tubos
        if (frameCount % pipeFrequency === 0) {
            createPipe();
        }
    }
    
    // Verifica colisiones
    function checkCollision() {
        const birdRadius = 15;
        
        // Verifica choque con el suelo o techo
        if (bird.y + birdRadius > canvas.height || bird.y - birdRadius < 0) {
            return true;
        }
        
        // Verifica choque con tubos
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];
            
            // Verifica si el pájaro está en el rango horizontal del tubo
            if (bird.x + birdRadius > pipe.x && bird.x - birdRadius < pipe.x + pipeWidth) {
                // Verifica si no está pasando por el hueco
                if (bird.y - birdRadius < pipe.height || 
                    bird.y + birdRadius > pipe.height + pipeGap) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    // Bucle principal del juego
    function gameLoop() {
        frameCount++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Dibuja el fondo
        drawBackground();
        
        // Actualiza y dibuja los elementos del juego
        bird.update();
        bird.draw();
        updatePipes();
        drawPipes();
        
        // Verifica colisiones
        if (checkCollision()) {
            gameOver = true;
            endGame();
            return;
        }
        
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    // Inicia el juego
    function startGame() {
        score = 0;
        scoreDisplay.textContent = score;
        pipes.length = 0;
        bird.reset();
        gameStarted = true;
        gameOver = false;
        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        frameCount = 0;
        gameLoop();
    }
    
    // Termina el juego
    function endGame() {
        cancelAnimationFrame(animationFrameId);
        gameOverScreen.style.display = 'flex';
        finalScore.textContent = `Score: ${score}`;
    }
    
    // Dibuja el fondo con nubes
    function drawBackground() {
        // Gradiente del cielo
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#E0F7FA');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Nubes
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        
        // Nube 1
        ctx.beginPath();
        ctx.arc(100, 100, 30, 0, Math.PI * 2);
        ctx.arc(130, 90, 35, 0, Math.PI * 2);
        ctx.arc(160, 100, 25, 0, Math.PI * 2);
        ctx.arc(130, 110, 30, 0, Math.PI * 2);
        ctx.fill();
        
        // Nube 2
        ctx.beginPath();
        ctx.arc(300, 150, 20, 0, Math.PI * 2);
        ctx.arc(330, 140, 30, 0, Math.PI * 2);
        ctx.arc(360, 150, 25, 0, Math.PI * 2);
        ctx.arc(330, 160, 20, 0, Math.PI * 2);
        ctx.fill();
        
        // Nube 3
        ctx.beginPath();
        ctx.arc(200, 50, 25, 0, Math.PI * 2);
        ctx.arc(230, 40, 35, 0, Math.PI * 2);
        ctx.arc(260, 50, 30, 0, Math.PI * 2);
        ctx.arc(230, 60, 25, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Event listeners para los botones
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    
    // Controles de teclado
    document.addEventListener('keydown', (e) => {
        if ((e.code === 'Space' || e.key === ' ' || e.keyCode === 32) && !gameOver) {
            if (!gameStarted) {
                startGame();
            } else {
                bird.startCharge();
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if ((e.code === 'Space' || e.key === ' ' || e.keyCode === 32) && bird.chargeTime > 0) {
            bird.flap();
        }
    });
    
    // Controles de ratón
    canvas.addEventListener('mousedown', () => {
        if (!gameOver) {
            if (!gameStarted) {
                startGame();
            } else {
                bird.startCharge();
            }
        }
    });
    
    canvas.addEventListener('mouseup', () => {
        if (bird.chargeTime > 0) {
            bird.flap();
        }
    });
    
    // Controles táctiles
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!gameOver) {
            if (!gameStarted) {
                startGame();
            } else {
                bird.startCharge();
            }
        }
    });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        if (bird.chargeTime > 0) {
            bird.flap();
        }
    });
    
    // Dibujo inicial
    drawBackground();
    bird.draw();
});