// Canvas and DOM Elements
const canvas = document.getElementById('game-board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-piece');
const nextCtx = nextCanvas.getContext('2d');

const scoreVal = document.getElementById('score-val');
const levelVal = document.getElementById('level-val');
const linesVal = document.getElementById('lines-val');
const finalScore = document.getElementById('final-score');

// Screen Overlays
const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameOverScreen = document.getElementById('game-over-screen');

// Buttons
const startBtn = document.getElementById('start-btn');
const resumeBtn = document.getElementById('resume-btn');
const restartBtn = document.getElementById('restart-btn');
const resumeGameBtn = document.getElementById('resume-game-btn');

// Leaderboard DOM elements
const leaderboardInputArea = document.getElementById('leaderboard-input-area');
const playerNameInput = document.getElementById('player-name-input');
const saveScoreBtn = document.getElementById('save-score-btn');
const leaderboardList = document.getElementById('leaderboard-list');

// Game Constants
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK_SIZE = 30; // 300 / 10 = 30px, 600 / 20 = 30px

// Tetromino Neon Colors (Indices match shapes matrix values)
const SHAPE_COLORS = {
    1: '#00f2fe', // I: Cyan
    2: '#0066ff', // J: Blue
    3: '#ff9f43', // L: Orange
    4: '#ffd000', // O: Yellow
    5: '#00ff87', // S: Green
    6: '#d83aff', // T: Purple
    7: '#ff3860'  // Z: Red
};

// Tetromino Matrices definitions
const TETROMINO_SHAPES = {
    'I': [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
    ],
    'J': [
        [2, 0, 0],
        [2, 2, 2],
        [0, 0, 0]
    ],
    'L': [
        [0, 0, 3],
        [3, 3, 3],
        [0, 0, 0]
    ],
    'O': [
        [4, 4],
        [4, 4]
    ],
    'S': [
        [0, 5, 5],
        [5, 5, 0],
        [0, 0, 0]
    ],
    'T': [
        [0, 6, 0],
        [6, 6, 6],
        [0, 0, 0]
    ],
    'Z': [
        [7, 7, 0],
        [0, 7, 7],
        [0, 0, 0]
    ]
};

// Game Variables
let board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
let activePiece = null;
let nextPiece = null;
let bag = [];

let score = 0;
let level = 1;
let lines = 0;
let highScore = parseInt(localStorage.getItem('tetris_highScore')) || 0;
let leaderboard = JSON.parse(localStorage.getItem('tetris_leaderboard')) || [];

let dropCounter = 0;
let lastTime = 0;

// Level drop speeds in ms
const DROP_INTERVALS = {
    1: 800,
    2: 720,
    3: 630,
    4: 550,
    5: 470,
    6: 380,
    7: 300,
    8: 220,
    9: 130,
    10: 100
};

// Animation States
let isClearing = false;
let clearingRows = [];
let clearTimer = 0;
const CLEAR_FLASH_DURATION = 8; // Number of frames to flash

// Game States: 'start', 'playing', 'paused', 'gameover'
let gameState = 'start';

// ----------------------------------------
// Initialization & Board Functions
// ----------------------------------------

function createMatrix(width, height) {
    const matrix = [];
    while (height--) {
        matrix.push(new Array(width).fill(0));
    }
    return matrix;
}

// 7-Bag Randomizer
function getNextPiece() {
    if (bag.length === 0) {
        bag = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        // Shuffle bag
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }
    }
    const type = bag.pop();
    return {
        id: type,
        matrix: JSON.parse(JSON.stringify(TETROMINO_SHAPES[type])),
        pos: { x: 0, y: 0 }
    };
}

function spawnPiece() {
    if (!nextPiece) {
        nextPiece = getNextPiece();
    }
    
    activePiece = nextPiece;
    nextPiece = getNextPiece();
    
    // Spawn at top center
    activePiece.pos.y = activePiece.id === 'I' ? -1 : 0;
    activePiece.pos.x = Math.floor((BOARD_WIDTH - activePiece.matrix[0].length) / 2);
    
    // Check game over right away
    if (collide(board, activePiece)) {
        changeGameState('gameover');
    } else {
        saveGame();
    }
    
    drawNextPiece();
}

// Collision detection
function collide(board, piece) {
    const matrix = piece.matrix;
    const pos = piece.pos;
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < matrix[y].length; ++x) {
            if (matrix[y][x] !== 0) {
                const boardX = pos.x + x;
                const boardY = pos.y + y;
                
                // Boundaries check
                if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                    return true;
                }
                
                // Existing block collision
                if (boardY >= 0 && board[boardY][boardX] !== 0) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Lock active piece to board matrix
function merge(board, piece) {
    piece.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const boardY = piece.pos.y + y;
                const boardX = piece.pos.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = value;
                }
            }
        });
    });
}

// ----------------------------------------
// Game Actions & Controls
// ----------------------------------------

function moveLeft() {
    activePiece.pos.x--;
    if (collide(board, activePiece)) {
        activePiece.pos.x++;
    } else {
        dropCounter = 0; // Reset gravity delay slightly on movement
    }
}

function moveRight() {
    activePiece.pos.x++;
    if (collide(board, activePiece)) {
        activePiece.pos.x--;
    } else {
        dropCounter = 0;
    }
}

function softDrop() {
    activePiece.pos.y++;
    if (collide(board, activePiece)) {
        activePiece.pos.y--;
        lockPiece();
    } else {
        score += 1; // Soft drop points
        updateHUD();
    }
    dropCounter = 0;
}

function hardDrop() {
    let drops = 0;
    while (!collide(board, activePiece)) {
        activePiece.pos.y++;
        drops++;
    }
    activePiece.pos.y--;
    
    score += drops * 2; // Hard drop points
    updateHUD();
    lockPiece();
}

function lockPiece() {
    merge(board, activePiece);
    checkLineClears();
    
    if (!isClearing) {
        spawnPiece();
    }
}

// Rotation Logic with Wall Kicks
function rotate(dir) {
    const originalMatrix = activePiece.matrix;
    const rotatedMatrix = rotateMatrix(activePiece.matrix, dir);
    
    const originalX = activePiece.pos.x;
    
    // basic wall kick checks
    const kicks = [0, 1, -1, 2, -2];
    let success = false;
    
    activePiece.matrix = rotatedMatrix;
    for (let k of kicks) {
        activePiece.pos.x = originalX + k;
        if (!collide(board, activePiece)) {
            success = true;
            break;
        }
    }
    
    if (!success) {
        // Revert matrix and x position
        activePiece.matrix = originalMatrix;
        activePiece.pos.x = originalX;
    } else {
        dropCounter = 0;
    }
}

function rotateMatrix(matrix, dir) {
    const n = matrix.length;
    const temp = Array.from({length: n}, () => Array(n).fill(0));
    
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (dir > 0) {
                temp[c][n - 1 - r] = matrix[r][c]; // Clockwise
            } else {
                temp[n - 1 - c][r] = matrix[r][c]; // Counter-clockwise
            }
        }
    }
    return temp;
}

// Line Clear Detection & Animations
function checkLineClears() {
    clearingRows = [];
    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        if (board[y].every(value => value !== 0)) {
            clearingRows.push(y);
        }
    }
    
    if (clearingRows.length > 0) {
        isClearing = true;
        clearTimer = CLEAR_FLASH_DURATION;
    }
}

function performLineClear() {
    let clearedCount = clearingRows.length;
    
    // Remove rows from bottom to top
    clearingRows.sort((a, b) => b - a).forEach(y => {
        board.splice(y, 1);
    });
    
    // Add empty rows to the top
    while (board.length < BOARD_HEIGHT) {
        board.unshift(new Array(BOARD_WIDTH).fill(0));
    }
    
    // Score Formula
    const scores = { 1: 100, 2: 300, 3: 500, 4: 800 };
    score += (scores[clearedCount] || 0) * level;
    lines += clearedCount;
    
    // Level Up Formula (every 10 lines)
    level = Math.floor(lines / 10) + 1;
    
    updateHUD();
    saveGame();
}

function getDropInterval() {
    return DROP_INTERVALS[Math.min(level, 10)];
}

// Ghost Piece positioning
function getGhostY() {
    let ghostY = activePiece.pos.y;
    while (!collide(board, { pos: { x: activePiece.pos.x, y: ghostY + 1 }, matrix: activePiece.matrix })) {
        ghostY++;
    }
    return ghostY;
}

// ----------------------------------------
// Renders & Canvas Graphics
// ----------------------------------------

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawBlock(context, x, y, colorIndex, isGhost = false) {
    const color = SHAPE_COLORS[colorIndex];
    if (!color) return;
    
    const px = x * BLOCK_SIZE;
    const py = y * BLOCK_SIZE;
    
    context.save();
    if (isGhost) {
        // Hollow neon outline for ghost pieces
        context.strokeStyle = color;
        context.lineWidth = 1.5;
        context.globalAlpha = 0.35;
        context.shadowBlur = 6;
        context.shadowColor = color;
        drawRoundedRect(context, px + 2, py + 2, BLOCK_SIZE - 4, BLOCK_SIZE - 4, 4);
        context.stroke();
    } else {
        // Bright solid filled block with deep glow
        context.fillStyle = color;
        context.shadowBlur = 12;
        context.shadowColor = color;
        drawRoundedRect(context, px + 1, py + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 5);
        context.fill();
        
        // Inner glassy light highlight reflection (top bar)
        context.shadowBlur = 0;
        context.fillStyle = 'rgba(255, 255, 255, 0.25)';
        drawRoundedRect(context, px + 3, py + 3, BLOCK_SIZE - 6, 3, 1.5);
        context.fill();
    }
    context.restore();
}

function drawGrid() {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
    ctx.lineWidth = 0.5;
    
    // Vertical gridlines
    for (let x = 0; x <= BOARD_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * BLOCK_SIZE, 0);
        ctx.lineTo(x * BLOCK_SIZE, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal gridlines
    for (let y = 0; y <= BOARD_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * BLOCK_SIZE);
        ctx.lineTo(canvas.width, y * BLOCK_SIZE);
        ctx.stroke();
    }
    ctx.restore();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid layer
    drawGrid();
    
    // Draw board matrix
    board.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                // Check if row is currently clearing and flashing
                if (isClearing && clearingRows.includes(y)) {
                    ctx.save();
                    // Pulse between full white and transparent
                    const pulse = Math.sin(clearTimer * 1.2) * 0.4 + 0.6;
                    ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
                    ctx.shadowBlur = 20;
                    ctx.shadowColor = '#ffffff';
                    drawRoundedRect(ctx, x * BLOCK_SIZE + 1, y * BLOCK_SIZE + 1, BLOCK_SIZE - 2, BLOCK_SIZE - 2, 5);
                    ctx.fill();
                    ctx.restore();
                } else {
                    drawBlock(ctx, x, y, value);
                }
            }
        });
    });
    
    // Draw ghost preview first, so active piece renders on top
    if (activePiece && gameState === 'playing' && !isClearing) {
        const ghostY = getGhostY();
        activePiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(ctx, activePiece.pos.x + x, ghostY + y, value, true);
                }
            });
        });
        
        // Draw active piece
        activePiece.matrix.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    drawBlock(ctx, activePiece.pos.x + x, activePiece.pos.y + y, value);
                }
            });
        });
    }
}

function drawNextPiece() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (!nextPiece) return;
    
    // Drawing a minimal background grid inside Next canvas
    nextCtx.save();
    nextCtx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
    nextCtx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) {
        nextCtx.beginPath();
        nextCtx.moveTo(i * BLOCK_SIZE, 0);
        nextCtx.lineTo(i * BLOCK_SIZE, nextCanvas.height);
        nextCtx.stroke();
        nextCtx.beginPath();
        nextCtx.moveTo(0, i * BLOCK_SIZE);
        nextCtx.lineTo(nextCanvas.width, i * BLOCK_SIZE);
        nextCtx.stroke();
    }
    nextCtx.restore();
    
    const matrix = nextPiece.matrix;
    const shapeId = nextPiece.id;
    
    // Calculate offsets to center the tetromino inside the 4x4 matrix
    let offsetX = 0;
    let offsetY = 0;
    
    if (shapeId === 'I') {
        offsetX = 0;
        offsetY = 0.5;
    } else if (shapeId === 'O') {
        offsetX = 1;
        offsetY = 1;
    } else {
        offsetX = 0.5;
        offsetY = 1;
    }
    
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                drawBlock(nextCtx, x + offsetX, y + offsetY, value);
            }
        });
    });
}

function updateHUD() {
    scoreVal.innerText = score.toLocaleString();
    levelVal.innerText = level;
    linesVal.innerText = lines;
    
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('tetris_highScore', highScore);
    }
    const highScoreVal = document.getElementById('high-score-val');
    if (highScoreVal) {
        highScoreVal.innerText = highScore.toLocaleString();
    }
}

// ----------------------------------------
// Game Controller State Machine
// ----------------------------------------

function changeGameState(newState) {
    gameState = newState;
    
    // Hide all overlays
    startScreen.classList.remove('active');
    pauseScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    if (newState === 'start') {
        startScreen.classList.add('active');
        checkSavedGame();
    } else if (newState === 'paused') {
        pauseScreen.classList.add('active');
        saveGame();
    } else if (newState === 'gameover') {
        finalScore.innerText = score.toLocaleString();
        gameOverScreen.classList.add('active');
        clearSave();
        
        // Render rankings and handle input area visibility
        renderLeaderboard();
        if (checkLeaderboardEligibility(score)) {
            if (leaderboardInputArea) leaderboardInputArea.style.display = 'block';
            if (playerNameInput) {
                playerNameInput.value = '';
                setTimeout(() => playerNameInput.focus(), 150);
            }
        } else {
            if (leaderboardInputArea) leaderboardInputArea.style.display = 'none';
        }
    }
}

function startGame() {
    board = createMatrix(BOARD_WIDTH, BOARD_HEIGHT);
    score = 0;
    level = 1;
    lines = 0;
    bag = [];
    nextPiece = null;
    activePiece = null;
    isClearing = false;
    
    clearSave();
    updateHUD();
    spawnPiece();
    changeGameState('playing');
    
    lastTime = performance.now();
    requestAnimationFrame(update);
}

function togglePause() {
    if (gameState === 'playing') {
        changeGameState('paused');
    } else if (gameState === 'paused') {
        changeGameState('playing');
        lastTime = performance.now();
        requestAnimationFrame(update);
    }
}

// Main update ticker
function update(time = 0) {
    if (gameState !== 'playing') return;
    
    const deltaTime = time - lastTime;
    lastTime = time;
    
    if (isClearing) {
        clearTimer--;
        if (clearTimer <= 0) {
            performLineClear();
            isClearing = false;
            spawnPiece();
        }
    } else {
        dropCounter += deltaTime;
        if (dropCounter > getDropInterval()) {
            softDrop();
        }
    }
    
    draw();
    requestAnimationFrame(update);
}

// ----------------------------------------
// Event Bindings
// ----------------------------------------

window.addEventListener('keydown', event => {
    if (gameState !== 'playing') {
        // Allow pause toggle if paused
        if (gameState === 'paused' && (event.key === 'Escape' || event.key === 'p' || event.key === 'P')) {
            togglePause();
            event.preventDefault();
        }
        return;
    }
    
    switch (event.key) {
        case 'ArrowLeft':
            moveLeft();
            event.preventDefault();
            break;
        case 'ArrowRight':
            moveRight();
            event.preventDefault();
            break;
        case 'ArrowDown':
            softDrop();
            event.preventDefault();
            break;
        case 'ArrowUp':
            rotate(1); // Rotate clockwise
            event.preventDefault();
            break;
        case ' ':
            hardDrop();
            event.preventDefault();
            break;
        case 'Escape':
        case 'p':
        case 'P':
            togglePause();
            event.preventDefault();
            break;
    }
});

// LocalStorage Save & Load Helper Functions
function saveGame() {
    if (gameState !== 'playing' && gameState !== 'paused') return;
    const state = {
        board,
        score,
        level,
        lines,
        activePiece,
        nextPiece,
        bag
    };
    localStorage.setItem('tetris_gameState', JSON.stringify(state));
}

function clearSave() {
    localStorage.removeItem('tetris_gameState');
    if (resumeGameBtn) {
        resumeGameBtn.style.display = 'none';
    }
}

function checkSavedGame() {
    const saved = localStorage.getItem('tetris_gameState');
    if (saved && resumeGameBtn) {
        resumeGameBtn.style.display = 'block';
    } else if (resumeGameBtn) {
        resumeGameBtn.style.display = 'none';
    }
}

function resumeGame() {
    const saved = localStorage.getItem('tetris_gameState');
    if (!saved) return;
    
    try {
        const state = JSON.parse(saved);
        board = state.board;
        score = state.score;
        level = state.level;
        lines = state.lines;
        activePiece = state.activePiece;
        nextPiece = state.nextPiece;
        bag = state.bag;
        
        updateHUD();
        drawNextPiece();
        changeGameState('playing');
        
        lastTime = performance.now();
        requestAnimationFrame(update);
    } catch (e) {
        console.error("Failed to load saved game state:", e);
        clearSave();
    }
}

// Leaderboard helper functions
function checkLeaderboardEligibility(score) {
    if (score <= 0) return false;
    if (leaderboard.length < 10) return true;
    return score > leaderboard[leaderboard.length - 1].score;
}

function renderLeaderboard(highlightedIndex = -1) {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = `<tr><td colspan="3" style="color: #606070; text-align: center; padding: 15px 0;">NO RECORDS YET</td></tr>`;
        return;
    }
    
    leaderboard.forEach((entry, idx) => {
        const isHighlight = idx === highlightedIndex;
        const tr = document.createElement('tr');
        if (isHighlight) tr.classList.add('highlight');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>${entry.name}</td>
            <td>${entry.score.toLocaleString()}</td>
        `;
        leaderboardList.appendChild(tr);
    });
}

function handleRestartAttempt() {
    const isEligible = leaderboardInputArea && leaderboardInputArea.style.display !== 'none';
    if (isEligible) {
        const leaveWithoutSaving = confirm("점수를 저장하지 않고 새 게임을 시작하시겠습니까?");
        if (!leaveWithoutSaving) {
            if (playerNameInput) playerNameInput.focus();
            return;
        }
    }
    startGame();
}

// Button triggers
startBtn.addEventListener('click', startGame);
resumeBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', handleRestartAttempt);
if (resumeGameBtn) {
    resumeGameBtn.addEventListener('click', resumeGame);
}

if (saveScoreBtn) {
    saveScoreBtn.addEventListener('click', () => {
        if (!playerNameInput) return;
        let name = playerNameInput.value.trim().toUpperCase();
        
        const regex = /^[A-Z]{1,10}$/;
        if (!regex.test(name)) {
            alert("영문 10자 이내로 입력해주세요 (공백 제외).");
            return;
        }
        
        // Save score
        leaderboard.push({ name, score });
        leaderboard.sort((a, b) => b.score - a.score);
        leaderboard = leaderboard.slice(0, 10);
        localStorage.setItem('tetris_leaderboard', JSON.stringify(leaderboard));
        
        const newIdx = leaderboard.findIndex(entry => entry.name === name && entry.score === score);
        
        if (leaderboardInputArea) {
            leaderboardInputArea.style.display = 'none';
        }
        renderLeaderboard(newIdx);
        
        // Remove focus from any active elements so that pressing Enter doesn't trigger restart
        document.activeElement.blur();
    });
}

if (playerNameInput) {
    playerNameInput.addEventListener('input', () => {
        playerNameInput.value = playerNameInput.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    });
    playerNameInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (saveScoreBtn) saveScoreBtn.click();
            event.preventDefault();
        }
    });
}

// Autosave on window close or reload
window.addEventListener('beforeunload', () => {
    saveGame();
});

// Initialize visual view on load
changeGameState('start');
draw();
drawNextPiece();
updateHUD();
