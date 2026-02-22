const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- CẤU HÌNH GAME ---
const GAME_CONFIG = {
    duration: 300, // 5 phút
    qTime: 10,     // 10s mỗi câu
    winDiff: 5     // Chênh lệch 5 để thắng
};

let state = {
    playing: false,
    globalTime: GAME_CONFIG.duration,
    balance: 0, // -5 (P1 Win) ... 0 ... +5 (P2 Win)
    digitMode: 1, // 1 chữ số hoặc 2 chữ số
    p1: { ans: '', timer: 0, q: {}, color: '#e74c3c' },
    p2: { ans: '', timer: 0, q: {}, color: '#3498db' }
};

let animId;
let ropeX = 0; // Vị trí tâm dây thừng

// --- LOGIC TOÁN HỌC ---
function genMath(type) {
    let a, b, op, res;
    const ops = ['+', '-'];
    op = ops[Math.floor(Math.random() * ops.length)];
    
    if (type === 1) { // 1 chữ số
        a = Math.floor(Math.random() * 10);
        b = Math.floor(Math.random() * 10);
    } else { // 2 chữ số
        a = Math.floor(Math.random() * 90) + 10;
        b = Math.floor(Math.random() * 90) + 10;
    }
    
    if (op === '-' && a < b) [a, b] = [b, a]; // Không âm
    res = op === '+' ? a + b : a - b;
    return { txt: `${a} ${op} ${b} = ?`, val: res };
}

function newRound(pIdx) {
    const p = pIdx === 1 ? state.p1 : state.p2;
    // Đồng bộ loại câu hỏi: Random lúc tạo mới nhưng áp dụng quy tắc chung?
    // Yêu cầu: "mỗi bên khác nhau, nhưng cùng loại". 
    // Logic: Random loại mỗi khi tạo câu hỏi mới? Hay random theo thời gian?
    // Để công bằng: Random loại mỗi khi P1 hoặc P2 trả lời xong, áp dụng cho lượt tiếp theo của người đó.
    
    // Ở đây tôi chọn cách: Cứ mỗi 30s đổi loại 1 lần cho cả 2
    
    p.q = genMath(state.digitMode);
    p.timer = GAME_CONFIG.qTime;
    p.ans = '';
    
    updateUI(pIdx);
}

function updateUI(pIdx) {
    const p = pIdx === 1 ? state.p1 : state.p2;
    document.getElementById(`p${pIdx}-q`).innerText = p.q.txt;
    document.getElementById(`p${pIdx}-ans`).innerText = p.ans;
}

// --- LOGIC NHẬP LIỆU ---
window.input = function(pIdx, num) {
    if (!state.playing) return;
    const p = pIdx === 1 ? state.p1 : state.p2;
    if (p.ans.length < 3) {
        p.ans += num;
        document.getElementById(`p${pIdx}-ans`).innerText = p.ans;
    }
};

window.del = function(pIdx) {
    const p = pIdx === 1 ? state.p1 : state.p2;
    p.ans = '';
    document.getElementById(`p${pIdx}-ans`).innerText = '';
};

window.submit = function(pIdx) {
    if (!state.playing) return;
    const p = pIdx === 1 ? state.p1 : state.p2;
    if (p.ans === '') return;
    
    const val = parseInt(p.ans);
    if (val === p.q.val) {
        // Đúng: Kéo về phía mình
        moveRope(pIdx, 1);
    } else {
        // Sai: Bị kéo đi
        moveRope(pIdx, -1);
    }
    
    newRound(pIdx);
};

function moveRope(pIdx, dir) {
    // P1 đúng (dir=1) -> balance giảm (-1)
    // P2 đúng (dir=1) -> balance tăng (+1)
    let amount = (pIdx === 1) ? -dir : dir;
    state.balance += amount;
    
    // Hiệu ứng rung dây
    ropeX += (amount * 50); 
    
    checkWin();
}

function checkWin() {
    if (state.balance <= -GAME_CONFIG.winDiff) endGame(1);
    else if (state.balance >= GAME_CONFIG.winDiff) endGame(2);
}

// --- GAME LOOP & RENDER (PHẦN QUAN TRỌNG NHẤT) ---
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);

// Vẽ Nhân Vật (Có khớp xương chuyển động)
function drawCharacter(ctx, x, y, color, isLeft, force) {
    const scale = 1.2;
    ctx.save();
    ctx.translate(x, y);
    if (isLeft) ctx.scale(-1, 1); // Lật P1
    ctx.scale(scale, scale);

    // Tính góc nghiêng dựa trên lực kéo
    // force < 0: Đang thắng (ngả ra sau)
    // force > 0: Đang thua (chúi về trước)
    let lean = 0;
    if ((isLeft && state.balance < 0) || (!isLeft && state.balance > 0)) lean = -25 * (Math.PI/180); // Thắng
    else if (state.balance !== 0) lean = 15 * (Math.PI/180); // Thua
    
    // Animation chân (đi bộ tại chỗ khi kéo)
    let legAnim = Math.sin(Date.now() / 150) * 10;

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 1. Chân sau (Cố định)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(20, 50); ctx.stroke();
    // 2. Chân trước (Chuyển động)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-10 + legAnim, 50); ctx.stroke();

    // 3. Thân (Nghiêng)
    ctx.save();
    ctx.rotate(lean);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -50); ctx.stroke(); // Xương sống

    // 4. Đầu
    ctx.beginPath(); ctx.arc(0, -65, 12, 0, Math.PI*2); ctx.fill();

    // 5. Tay (Cầm dây)
    ctx.beginPath(); ctx.moveTo(0, -45); ctx.lineTo(-30, -20); ctx.stroke();
    ctx.restore();

    ctx.restore();
}

function drawRope(ctx, centerX, centerY) {
    ctx.beginPath();
    // Dây thừng dài vô tận, vẽ cong nhẹ tạo độ chùng
    // Tâm dây thừng di chuyển theo balance
    let targetX = (canvas.width/2) + (state.balance * (canvas.width * 0.08));
    
    // Hiệu ứng Lerp để dây di chuyển mượt
    ropeX += (targetX - ropeX) * 0.1;
    
    ctx.moveTo(ropeX - 1000, centerY);
    // Vẽ đường cong Bezier nhẹ ở giữa
    ctx.quadraticCurveTo(ropeX, centerY + 20, ropeX + 1000, centerY);
    
    ctx.lineWidth = 12;
    ctx.strokeStyle = '#d35400'; // Màu dây thừng nâu
    ctx.stroke();
    
    // Vẽ chi tiết xoắn thừng
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.stroke();

    // Vẽ Nút thắt (Khăn đỏ)
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    // Vị trí y thấp hơn một chút do độ võng
    ctx.arc(ropeX, centerY + 10, 10, 0, Math.PI*2); 
    ctx.fill();
    // Đuôi khăn
    ctx.beginPath(); ctx.moveTo(ropeX, centerY+10); ctx.lineTo(ropeX-10, centerY+40); ctx.lineTo(ropeX+10, centerY+40); ctx.fill();
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerY = canvas.height * 0.65; // Mặt đất nằm ở 65% màn hình (40% trong CSS gradient)
    
    // Vẽ vạch đích
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 10]);
    // Vạch trái
    ctx.beginPath(); ctx.moveTo(canvas.width*0.2, centerY-50); ctx.lineTo(canvas.width*0.2, centerY+50); ctx.stroke();
    // Vạch phải
    ctx.beginPath(); ctx.moveTo(canvas.width*0.8, centerY-50); ctx.lineTo(canvas.width*0.8, centerY+50); ctx.stroke();
    ctx.setLineDash([]);

    // Vẽ Dây
    drawRope(ctx, canvas.width/2, centerY - 45); // Dây nằm ngang tay nhân vật

    // Vẽ Người (Vị trí phụ thuộc vào dây)
    // P1 (Trái)
    drawCharacter(ctx, ropeX - 120, centerY, state.p1.color, true);
    // P2 (Phải)
    drawCharacter(ctx, ropeX + 120, centerY, state.p2.color, false);

    // Vẽ Mặt đất (bóng đổ nhân vật)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.ellipse(ropeX - 120, centerY, 30, 5, 0, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(ropeX + 120, centerY, 30, 5, 0, 0, Math.PI*2); ctx.fill();
}

function gameLoop() {
    if (!state.playing) return;
    render();
    animId = requestAnimationFrame(gameLoop);
}

// --- QUẢN LÝ THỜI GIAN ---
setInterval(() => {
    if (!state.playing) return;

    // Timer tổng
    state.globalTime--;
    let m = Math.floor(state.globalTime / 60);
    let s = state.globalTime % 60;
    document.getElementById('main-timer').innerText = `${m}:${s<10?'0'+s:s}`;
    
    if (state.globalTime <= 0) endGame(0); // Hết giờ
    
    // Timer từng người
    [1, 2].forEach(idx => {
        const p = idx === 1 ? state.p1 : state.p2;
        p.timer -= 0.1; // Chạy nhanh hơn 1s (gọi hàm 100ms 1 lần thì đúng hơn, ở đây demo logic)
    });
    
    // Đổi mode 1 chữ số / 2 chữ số mỗi 60s
    if (state.globalTime % 60 === 0) {
        state.digitMode = state.digitMode === 1 ? 2 : 1;
    }

}, 1000);

// Timer cho thanh năng lượng (mượt mà)
setInterval(() => {
    if (!state.playing) return;
    [1, 2].forEach(idx => {
        const p = idx === 1 ? state.p1 : state.p2;
        p.timer -= 0.1;
        const pct = (p.timer / GAME_CONFIG.qTime) * 100;
        document.getElementById(`p${idx}-timer-fill`).style.width = pct + '%';
        
        if (p.timer <= 0) {
            // Hết giờ câu hỏi -> Trừ điểm -> Đổi câu
            moveRope(idx, -1);
            newRound(idx);
        }
    });
}, 100);

// --- MAIN FUNCTIONS ---
window.startGame = function() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('end-screen').classList.add('hidden');
    resize();
    
    state.playing = true;
    state.globalTime = GAME_CONFIG.duration;
    state.balance = 0;
    ropeX = canvas.width / 2;
    state.digitMode = 1;
    
    newRound(1);
    newRound(2);
    
    // Play Music
    try { document.getElementById('bgm').play(); } catch(e){}
    
    if (animId) cancelAnimationFrame(animId);
    gameLoop();
};

function endGame(winner) {
    state.playing = false;
    cancelAnimationFrame(animId);
    
    const endScreen = document.getElementById('end-screen');
    const msg = document.getElementById('winner-msg');
    
    if (winner === 1) {
        msg.innerText = "ĐỘI ĐỎ THẮNG!";
        msg.style.color = state.p1.color;
    } else if (winner === 2) {
        msg.innerText = "ĐỘI XANH THẮNG!";
        msg.style.color = state.p2.color;
    } else {
        msg.innerText = state.balance < 0 ? "ĐỎ THẮNG (HẾT GIỜ)" : "XANH THẮNG (HẾT GIỜ)";
        if (state.balance === 0) msg.innerText = "HÒA NHAU!";
    }
    
    endScreen.classList.remove('hidden');
}

window.onload = resize;
