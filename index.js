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
    let coinScore = 0;
    let gameStarted = false;
    let gameOver = false;
    let animationFrameId;
    let frameCount = 0;
    let powerUps = [];
    let coins = [];
    let obstacles = [];
    let isInvincible = false;
    let invincibleTimer = 0;
    let isNightMode = false;
    let backgroundOffset = 0;
    const backgroundSpeed = 0.5;
    
    // Bird properties - con sistema de carga de salto
    const bird = {
        x: 100,
        y: 300,
        width: 40,
        height: 30,
        gravity: 0.3,
        velocity: 0,
        minLift: -6,
        maxLift: -12,
        chargeTime: 0,
        maxChargeTime: 25,
        color: '#FFEB3B',
        chargingColor: '#FFC107',
        isFlashing: false,
        flashFrames: 0,
        maxFlashFrames: 10,
        
        startCharge() {
            if (this.chargeTime === 0) {
                this.chargeTime = 1;
            }
        },
        
        continueCharge() {
            if (this.chargeTime > 0 && this.chargeTime < this.maxChargeTime) {
                this.chargeTime++;
            }
        },
        
        flap() {
            const chargeRatio = Math.min(this.chargeTime / this.maxChargeTime, 1);
            this.velocity = this.minLift + (this.maxLift - this.minLift) * chargeRatio;
            this.chargeTime = 0;
        },
        
        update() {
            if (this.isFlashing) {
                this.flashFrames--;
                if (this.flashFrames <= 0) {
                    this.isFlashing = false;
                }
            }
            
            this.continueCharge();
            this.velocity += this.gravity;
            this.velocity *= 0.95;
            this.y += this.velocity;
            
            if (this.y < 0) {
                this.y = 0;
                this.velocity = 0;
            }
        },
        
        draw() {
            if (this.isFlashing && this.flashFrames % 2 === 0) {
                return;
            }
            
            ctx.fillStyle = this.chargeTime > 0 ? this.chargingColor : this.color;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FF9800';
            ctx.beginPath();
            ctx.moveTo(this.x + 15, this.y);
            ctx.lineTo(this.x + 25, this.y - 5);
            ctx.lineTo(this.x + 25, this.y + 5);
            ctx.fill();
            
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(this.x + 5, this.y - 5, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FBC02D';
            ctx.beginPath();
            ctx.ellipse(this.x - 5, this.y + 5, 10, 5, Math.PI/4, 0, Math.PI * 2);
            ctx.fill();
            
            if (this.chargeTime > 0) {
                const chargePercent = Math.min(this.chargeTime / this.maxChargeTime, 1);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.fillRect(this.x - 20, this.y - 30, 40 * chargePercent, 5);
            }
        },
        
        reset() {
            this.y = 300;
            this.velocity = 0;
            this.chargeTime = 0;
            this.isFlashing = false;
        },
        
        startFlash() {
            this.isFlashing = true;
            this.flashFrames = this.maxFlashFrames;
        }
    };
    
    // Tubos (pipes)
    const pipes = [];
    const pipeWidth = 60;
    const pipeGap = 180;
    const pipeFrequency = 120;
    
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
    
    function drawPipes() {
        ctx.fillStyle = '#4CAF50';
        
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];
            
            ctx.fillRect(pipe.x, 0, pipeWidth, pipe.height);
            
            ctx.fillRect(
                pipe.x, 
                pipe.height + pipeGap, 
                pipeWidth, 
                canvas.height - pipe.height - pipeGap
            );
        }
    }
    
    function updatePipes() {
        if (pipes.length > 0 && pipes[0].x < -pipeWidth) {
            pipes.shift();
        }
        
        for (let i = 0; i < pipes.length; i++) {
            pipes[i].x -= 2;
            
            if (!pipes[i].passed && pipes[i].x + pipeWidth < bird.x) {
                pipes[i].passed = true;
                score++;
                scoreDisplay.textContent = score;
            }
        }
        
        if (frameCount % pipeFrequency === 0) {
            createPipe();
        }
    }
    
    // Power-ups
    function createPowerUp() {
        if (Math.random() < 0.01 && powerUps.length < 2) {
            powerUps.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 50) + 25,
                width: 30,
                height: 30,
                type: Math.random() < 0.5 ? 'invincible' : 'coinMagnet',
                rotation: 0
            });
        }
    }
    
    function drawPowerUps() {
        for (let i = 0; i < powerUps.length; i++) {
            const p = powerUps[i];
            ctx.save();
            ctx.translate(p.x + p.width/2, p.y + p.height/2);
            ctx.rotate(p.rotation);
            
            if (p.type === 'invincible') {
                ctx.fillStyle = '#FFD700';
                drawStar(ctx, -p.width/2, -p.height/2, 5, p.width/2, p.width/4);
            } else {
                ctx.fillStyle = '#FF5733';
                ctx.beginPath();
                ctx.moveTo(-p.width/2, -p.height/2);
                ctx.lineTo(p.width/2, 0);
                ctx.lineTo(-p.width/2, p.height/2);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#C70039';
                ctx.beginPath();
                ctx.arc(0, 0, p.width/4, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.restore();
            p.rotation += 0.05;
        }
    }
    
    function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI/2 * 3;
        let x = cx;
        let y = cy;
        let step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        
        for(let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
    
    function updatePowerUps() {
        for (let i = powerUps.length - 1; i >= 0; i--) {
            powerUps[i].x -= 2;
            
            if (checkCollisionWithBird(powerUps[i])) {
                const powerUp = powerUps.splice(i, 1)[0];
                activatePowerUp(powerUp.type);
                continue;
            }
            
            if (powerUps[i].x < -powerUps[i].width) {
                powerUps.splice(i, 1);
            }
        }
    }
    
    function activatePowerUp(type) {
        if (type === 'invincible') {
            isInvincible = true;
            invincibleTimer = 300;
            bird.startFlash();
        } else if (type === 'coinMagnet') {
            for (let i = 0; i < coins.length; i++) {
                coins[i].magnetized = true;
            }
        }
    }
    
    // Sistema de monedas
    function createCoin() {
        if (Math.random() < 0.03 && coins.length < 5) {
            coins.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 30) + 15,
                radius: 10,
                value: Math.floor(Math.random() * 3) + 1,
                magnetized: false,
                rotation: 0
            });
        }
    }
    
    function drawCoins() {
        for (let i = 0; i < coins.length; i++) {
            const coin = coins[i];
            ctx.save();
            ctx.translate(coin.x, coin.y);
            ctx.rotate(coin.rotation);
            
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(0, 0, coin.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = '#FFC107';
            ctx.beginPath();
            ctx.arc(0, 0, coin.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            coin.rotation += 0.1;
        }
    }
    
    function updateCoins() {
        for (let i = coins.length - 1; i >= 0; i--) {
            const coin = coins[i];
            
            if (coin.magnetized) {
                const dx = bird.x - coin.x;
                const dy = bird.y - coin.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 5) {
                    coins.splice(i, 1);
                    coinScore += coin.value;
                    score += coin.value;
                    scoreDisplay.textContent = score;
                    continue;
                }
                
                coin.x += dx * 0.1;
                coin.y += dy * 0.1;
            } else {
                coin.x -= 2;
            }
            
            if (checkCollisionWithBird(coin)) {
                coins.splice(i, 1);
                coinScore += coin.value;
                score += coin.value;
                scoreDisplay.textContent = score;
                continue;
            }
            
            if (coin.x < -coin.radius * 2) {
                coins.splice(i, 1);
            }
        }
    }
    
    // Obstáculos especiales
    function createObstacle() {
        if (Math.random() < 0.005 && obstacles.length < 2) {
            obstacles.push({
                x: canvas.width,
                y: Math.random() * (canvas.height - 100) + 50,
                width: 40,
                height: 40,
                type: Math.random() < 0.5 ? 'spike' : 'comet',
                speed: Math.random() * 2 + 1
            });
        }
    }
    
    function drawObstacles() {
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            
            if (obs.type === 'spike') {
                ctx.fillStyle = '#9E9E9E';
                ctx.beginPath();
                ctx.moveTo(obs.x, obs.y);
                ctx.lineTo(obs.x + obs.width, obs.y - obs.height/2);
                ctx.lineTo(obs.x + obs.width, obs.y + obs.height/2);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillStyle = '#FF5722';
                ctx.beginPath();
                ctx.arc(obs.x, obs.y, obs.width/2, 0, Math.PI * 2);
                ctx.fill();
                
                const tailLength = 30;
                ctx.strokeStyle = 'rgba(255, 215, 0, 0.7)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(obs.x - obs.width/2, obs.y);
                ctx.lineTo(obs.x - obs.width/2 - tailLength, obs.y);
                ctx.stroke();
            }
        }
    }
    
    function updateObstacles() {
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= obstacles[i].speed;
            
            if (!isInvincible && checkCollisionWithBird(obstacles[i])) {
                gameOver = true;
                endGame();
                return;
            }
            
            if (obstacles[i].x < -obstacles[i].width * 2) {
                obstacles.splice(i, 1);
            }
        }
    }
    
    // Funciones de colisión
    function checkCollision() {
        const birdRadius = 15;
        
        if (bird.y + birdRadius > canvas.height || bird.y - birdRadius < 0) {
            return true;
        }
        
        for (let i = 0; i < pipes.length; i++) {
            const pipe = pipes[i];
            
            if (bird.x + birdRadius > pipe.x && bird.x - birdRadius < pipe.x + pipeWidth) {
                if (bird.y - birdRadius < pipe.height || 
                    bird.y + birdRadius > pipe.height + pipeGap) {
                    return true;
                }
            }
        }
        
        return false;
    }
    
    function checkCollisionWithBird(object) {
        const dx = bird.x - object.x;
        const dy = bird.y - object.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const birdRadius = 15;
        const objectRadius = object.radius || Math.max(object.width, object.height) / 2;
        
        return distance < birdRadius + objectRadius;
    }
    
    // Fondo con movimiento parallax
    function drawBackground() {
        backgroundOffset += backgroundSpeed;
        if (backgroundOffset > canvas.width) {
            backgroundOffset = 0;
        }
        
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        
        if (isNightMode) {
            gradient.addColorStop(0, '#0F2027');
            gradient.addColorStop(1, '#203A43');
        } else {
            gradient.addColorStop(0, '#87CEEB');
            gradient.addColorStop(1, '#E0F7FA');
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = isNightMode ? '#2C3E50' : '#8BC34A';
        ctx.beginPath();
        ctx.moveTo(0 - backgroundOffset/3, canvas.height);
        ctx.lineTo(100 - backgroundOffset/3, canvas.height - 150);
        ctx.lineTo(300 - backgroundOffset/3, canvas.height - 50);
        ctx.lineTo(500 - backgroundOffset/3, canvas.height - 200);
        ctx.lineTo(700 - backgroundOffset/3, canvas.height - 100);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();
        ctx.fill();
        
        drawCloud(100 - backgroundOffset, 100, isNightMode);
        drawCloud(300 - backgroundOffset*0.7, 150, isNightMode);
        drawCloud(200 - backgroundOffset*0.5, 50, isNightMode);
        drawCloud(400 - backgroundOffset, 80, isNightMode);
        drawCloud(500 - backgroundOffset*0.3, 120, isNightMode);
        
        if (isNightMode) {
            ctx.fillStyle = 'white';
            for (let i = 0; i < 30; i++) {
                const x = (i * 50 + backgroundOffset/2) % canvas.width;
                const y = (i * 40) % (canvas.height - 200);
                const size = Math.random() * 2 + 1;
                
                ctx.beginPath();
                ctx.arc(x, y, size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    function drawCloud(x, y, isNight) {
        ctx.fillStyle = isNight ? 'rgba(150, 150, 150, 0.7)' : 'rgba(255, 255, 255, 0.7)';
        
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y - 10, 25, 0, Math.PI * 2);
        ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
        ctx.arc(x + 25, y + 10, 15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    // Bucle principal del juego
    function gameLoop() {
        frameCount++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (isInvincible) {
            invincibleTimer--;
            if (invincibleTimer <= 0) {
                isInvincible = false;
                bird.isFlashing = false;
            }
        }
        
        if (frameCount % 1000 === 0) {
            isNightMode = !isNightMode;
        }
        
        drawBackground();
        
        bird.update();
        bird.draw();
        updatePipes();
        drawPipes();
        
        createPowerUp();
        updatePowerUps();
        drawPowerUps();
        
        createCoin();
        updateCoins();
        drawCoins();
        
        createObstacle();
        updateObstacles();
        drawObstacles();
        
        if (!isInvincible && checkCollision()) {
            gameOver = true;
            endGame();
            return;
        }
        
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    function startGame() {
        score = 0;
        coinScore = 0;
        isInvincible = false;
        invincibleTimer = 0;
        isNightMode = false;
        powerUps = [];
        coins = [];
        obstacles = [];
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
    
    function endGame() {
        cancelAnimationFrame(animationFrameId);
        gameOverScreen.style.display = 'flex';
        finalScore.textContent = `Score: ${score}`;
    }
    
    // Event listeners
    startButton.addEventListener('click', startGame);
    restartButton.addEventListener('click', startGame);
    
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