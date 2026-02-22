const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CẤU HÌNH ---
const CONFIG = {
    duration: 300, 
    qTime: 10,
    winScore: 5 
};

let game = {
    active: false,
    time: CONFIG.duration,
    balance: 0, // 0 is center
    mode: 1, // 1 digit or 2 digits
    p1: { ans: '', timer: 0, q: {}, color: '#e74c3c' },
    p2: { ans: '', timer: 0, q: {}, color: '#3498db' }
};

let animFrame;
let ropePos = 0; // Animation visual position

// --- HỆ THỐNG FULLSCREEN ---
window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    }
};

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);

// --- LOGIC TOÁN ---
function genQ(mode) {
    let a, b, op, res;
    const ops = ['+', '-'];
    op = ops[Math.floor(Math.random() * ops.length)];
    
    if (mode === 1) {
        a = Math.floor(Math.random() * 10);
        b = Math.floor(Math.random() * 10);
    } else {
        a = Math.floor(Math.random() * 90) + 10;
        b = Math.floor(Math.random() * 90) + 10;
    }
    
    if (op === '-' && a < b) [a, b] = [b, a];
    res = op === '+' ? a + b : a - b;
    return { txt: `${a} ${op} ${b} = ?`, val: res };
}

function nextTurn(pId) {
    const p = pId === 1 ? game.p1 : game.p2;
    p.q = genQ(game.mode);
    p.timer = CONFIG.qTime;
    p.ans = '';
    updateDOM(pId);
}

function updateDOM(pId) {
    const p = pId === 1 ? game.p1 : game.p2;
    document.getElementById(`p${pId}-q`).innerText = p.q.txt;
    document.getElementById(`p${pId}-ans`).innerText = p.ans;
}

// --- INPUT ---
window.input = function(pId, n) {
    if (!game.active) return;
    const p = pId === 1 ? game.p1 : game.p2;
    if (p.ans.length < 3) {
        p.ans += n;
        document.getElementById(`p${pId}-ans`).innerText = p.ans;
    }
};

window.del = function(pId) {
    const p = pId === 1 ? game.p1 : game.p2;
    p.ans = '';
    document.getElementById(`p${pId}-ans`).innerText = '';
};

window.submit = function(pId) {
    if (!game.active) return;
    const p = pId === 1 ? game.p1 : game.p2;
    if (p.ans === '') return;
    
    if (parseInt(p.ans) === p.q.val) {
        // Đúng: Kéo về (p1: -1, p2: +1)
        updateBalance(pId === 1 ? -1 : 1);
    } else {
        // Sai: Bị kéo đi (p1: +1, p2: -1)
        updateBalance(pId === 1 ? 1 : -1);
    }
    nextTurn(pId);
};

function updateBalance(dir) {
    game.balance += dir;
    // Hiệu ứng giật dây
    ropePos += dir * 50; 
    
    if (game.balance <= -CONFIG.winScore) endGame(1);
    else if (game.balance >= CONFIG.winScore) endGame(2);
}

// --- DRAWING ---
function drawStickman(ctx, x, y, color, isP1) {
    const scale = 1.3;
    ctx.save();
    ctx.translate(x, y);
    if (isP1) ctx.scale(-1, 1);
    ctx.scale(scale, scale);

    // Tính toán góc nghiêng dựa trên thế trận
    let lean = 0;
    if ((isP1 && game.balance < 0) || (!isP1 && game.balance > 0)) lean = -20 * Math.PI/180; // Đang thắng -> Ngả sau
    else if (game.balance !== 0) lean = 15 * Math.PI/180; // Đang thua -> Chúi trước

    // Animation
    let legMove = Math.sin(Date.now() / 150) * 8;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Chân
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(15, 45); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-10 + legMove, 45); ctx.stroke();

    // Thân
    ctx.save();
    ctx.rotate(lean);
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0, -45); ctx.stroke();
    // Đầu
    ctx.beginPath(); ctx.arc(0, -60, 12, 0, Math.PI*2); ctx.fill();
    // Tay
    ctx.beginPath(); ctx.moveTo(0, -40); ctx.lineTo(-25, -15); ctx.stroke();
    ctx.restore();

    ctx.restore();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const cy = canvas.height * 0.65; // Mặt đất
    const cx = canvas.width / 2;
    
    // Lerp rope position
    let targetX = cx + (game.balance * (canvas.width * 0.06));
    ropePos += (targetX - ropePos) * 0.1;

    // Vạch đích
    ctx.strokeStyle = 'white'; ctx.lineWidth = 4; ctx.setLineDash([10, 10]);
    ctx.beginPath(); ctx.moveTo(cx - 150, cy-40); ctx.lineTo(cx - 150, cy+40); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 150, cy-40); ctx.lineTo(cx + 150, cy+40); ctx.stroke();
    ctx.setLineDash([]);

    // Dây thừng
    ctx.beginPath();
    ctx.moveTo(ropePos - 800, cy - 40);
    ctx.quadraticCurveTo(ropePos, cy - 20, ropePos + 800, cy - 40);
    ctx.lineWidth = 10; ctx.strokeStyle = '#d35400'; ctx.stroke();

    // Nút thắt
    ctx.fillStyle = '#c0392b';
    ctx.beginPath(); ctx.arc(ropePos, cy - 30, 8, 0, Math.PI*2); ctx.fill();

    // Người
    drawStickman(ctx, ropePos - 100, cy, game.p1.color, true);
    drawStickman(ctx, ropePos + 100, cy, game.p2.color, false);
}

function loop() {
    if (!game.active) return;
    draw();
    animFrame = requestAnimationFrame(loop);
}

// --- TIMERS ---
setInterval(() => {
    if (!game.active) return;
    
    // Main Timer
    game.time--;
    let m = Math.floor(game.time / 60);
    let s = game.time % 60;
    document.getElementById('main-timer').innerText = `${m}:${s<10?'0'+s:s}`;
    if (game.time <= 0) endGame(0);

    // Switch mode 30s
    if (game.time % 30 === 0) game.mode = game.mode === 1 ? 2 : 1;

}, 1000);

// Smooth bar update (10fps)
setInterval(() => {
    if (!game.active) return;
    [1, 2].forEach(id => {
        const p = id === 1 ? game.p1 : game.p2;
        p.timer -= 0.1;
        document.getElementById(`p${id}-timer-bar`).style.width = (p.timer / CONFIG.qTime * 100) + '%';
        
        if (p.timer <= 0) {
            updateBalance(id === 1 ? 1 : -1); // Phạt thua
            nextTurn(id);
        }
    });
}, 100);


// --- CORE ---
window.startGame = function() {
    toggleFullScreen(); // Fullscreen khi bắt đầu
    resize();
    
    game.active = true;
    game.time = CONFIG.duration;
    game.balance = 0;
    game.mode = 1;
    ropePos = canvas.width / 2;
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    
    nextTurn(1);
    nextTurn(2);
    
    if (animFrame) cancelAnimationFrame(animFrame);
    loop();
    
    // Play BG music if available
    try { document.getElementById('bgm').play(); } catch(e){}
};

function endGame(winner) {
    game.active = false;
    cancelAnimationFrame(animFrame);
    
    const screen = document.getElementById('end-screen');
    const msg = document.getElementById('winner-msg');
    
    screen.classList.remove('hidden');
    if (winner === 1) {
        msg.innerText = "ĐỘI ĐỎ THẮNG!";
        msg.style.color = game.p1.color;
    } else if (winner === 2) {
        msg.innerText = "ĐỘI XANH THẮNG!";
        msg.style.color = game.p2.color;
    } else {
        msg.innerText = "HẾT GIỜ!";
        msg.style.color = "white";
    }
}

window.onload = resize;
