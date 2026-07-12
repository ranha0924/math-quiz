/* ============================================================
   유형별 퀴즈 - 메인 스크립트
   ============================================================ */
const $ = id => document.getElementById(id);

/* 상태 */
let currentType;   // 'all' | 'wrong' | 유형 키
let questions;     // 출제된 문제 배열
let index;         // 현재 문제 번호
let score;         // 맞은 개수

/* 배열 섞기 (Fisher-Yates) */
const shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/* ============================================================
   수식 렌더링 (KaTeX + 폴백)
   ============================================================ */
const hasKatex = () => typeof window.renderMathInElement === 'function';

/* KaTeX 미로드 시 $...$ 를 유니코드로 근사 변환 */
function fallbackMath(s) {
    return s
        .replace(/\\dfrac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
        .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '$1/$2')
        .replace(/\^2/g, '²').replace(/\^3/g, '³')
        .replace(/\\le\b/g, '≤').replace(/\\ge\b/g, '≥').replace(/\\ne\b/g, '≠')
        .replace(/\\pm\b/g, '±').replace(/\\cdot\b/g, '·').replace(/\\times\b/g, '×')
        .replace(/\\alpha\b/g, 'α').replace(/\\beta\b/g, 'β')
        .replace(/\\,/g, ' ').replace(/\\ /g, ' ')
        .replace(/\$/g, '')
        .replace(/\s+/g, ' ').trim();
}

/* 요소 안의 $...$ 를 KaTeX로 렌더 (없으면 폴백은 삽입 시 처리) */
function renderMath(el) {
    if (hasKatex()) {
        try {
            renderMathInElement(el, { delimiters: [{ left: '$', right: '$', display: false }], throwOnError: false });
        } catch (e) { /* 무시 */ }
    }
}
/* 수식 텍스트를 안전하게 표시할 문자열로 (KaTeX면 원본, 아니면 폴백) */
const mx = s => hasKatex() ? s : fallbackMath(s);

/* ============================================================
   오답노트 (localStorage)
   ============================================================ */
const WRONG_KEY = 'qf_wrong';
let _wrongMem = null;   // localStorage 불가 환경(file://) 폴백

function getWrong() {
    try { return JSON.parse(localStorage.getItem(WRONG_KEY) || '[]'); }
    catch (e) { return _wrongMem || []; }
}
function saveWrong(arr) {
    try { localStorage.setItem(WRONG_KEY, JSON.stringify(arr)); }
    catch (e) { _wrongMem = arr; }
}
function addWrong(row) {
    const notes = getWrong();
    if (!notes.some(r => r[1] === row[1])) { notes.push(row); saveWrong(notes); }
}
function removeWrong(text) {
    saveWrong(getWrong().filter(r => r[1] !== text));
}
function clearWrong() {
    if (window.confirm && !window.confirm('오답노트를 모두 비울까요?')) return;
    saveWrong([]); renderTypes();
}

/* ============================================================
   그래프 읽기 - 미니 포물선 렌더
   ============================================================ */
function drawMiniParabola(canvas, a, b, c) {
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth || 300, H = 220;
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const XR = 4.6, YT = 6, YB = 6;                 // 보이는 범위
    const cx = W / 2, cy = H * YT / (YT + YB);
    const ppx = W / (2 * XR), ppy = H / (YT + YB);
    const wx = x => cx + x * ppx, wy = y => cy - y * ppy;

    ctx.clearRect(0, 0, W, H);
    // 격자
    ctx.strokeStyle = '#EFE6D0'; ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(wx(i), 0); ctx.lineTo(wx(i), H); ctx.stroke(); }
    for (let j = -6; j <= 6; j += 2) { ctx.beginPath(); ctx.moveTo(0, wy(j)); ctx.lineTo(W, wy(j)); ctx.stroke(); }
    // 축
    ctx.strokeStyle = '#B7A98C'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    // 포물선
    ctx.strokeStyle = '#C1614A'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
    ctx.beginPath();
    let started = false;
    for (let px = 0; px <= W; px++) {
        const x = (px - cx) / ppx, y = a * x * x + b * x + c, py = wy(y);
        if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    }
    ctx.stroke();
    // 점 찍기 헬퍼
    const dot = (x, y, color) => {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(wx(x), wy(y), 4, 0, 7); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    };
    // x절편
    const D = b * b - 4 * a * c;
    if (D >= 0) {
        const s = Math.sqrt(D);
        const roots = D === 0 ? [-b / (2 * a)] : [(-b - s) / (2 * a), (-b + s) / (2 * a)];
        roots.forEach(r => dot(r, 0, '#3A7D7B'));
    }
    // y절편
    dot(0, c, '#6E7A45');
}

/* ============================================================
   유형 선택 카드
   ============================================================ */
function renderTypes() {
    let html = '';

    // 오답노트 배너 (있을 때만)
    const wrong = getWrong();
    if (wrong.length) {
        html += `
        <button class="type-banner wrong" onclick="startQuiz('wrong')">
            <span class="tb-star">✕</span>
            <span class="tb-body">
                <span class="tb-name">오답노트</span>
                <span class="tb-desc">틀린 ${wrong.length}문제만 다시 풀기 · <button class="mini-clear" onclick="event.stopPropagation();clearWrong()">비우기</button></span>
            </span>
            <span class="tb-arrow">→</span>
        </button>`;
    }

    // 전체 랜덤 배너
    const total = Q.order.reduce((s, id) => s + Q.types[id].q.length, 0);
    html += `
        <button class="type-banner" onclick="startQuiz('all')">
            <span class="tb-star">★</span>
            <span class="tb-body">
                <span class="tb-name">전체 랜덤</span>
                <span class="tb-desc">모든 유형에서 골고루 10문제 · 총 ${total}문제</span>
            </span>
            <span class="tb-arrow">→</span>
        </button>`;

    // 유형 목록 (번호 인덱스)
    html += '<div class="type-list">';
    html += Q.order.map((id, i) => {
        const t = Q.types[id];
        const num = String(i + 1).padStart(2, '0');
        return `
        <button class="type-row" onclick="startQuiz('${id}')">
            <span class="tr-num">${num}</span>
            <span class="tr-body">
                <span class="tr-name">${t.name}</span>
                <span class="tr-desc">${t.desc} · ${t.q.length}문제</span>
            </span>
            <span class="tr-icon">${t.icon}</span>
        </button>`;
    }).join('');
    html += '</div>';

    $('type-grid').innerHTML = html;
}

/* ============================================================
   퀴즈
   ============================================================ */
function startQuiz(type) {
    let pool, title;
    if (type === 'all') {
        pool = Q.order.flatMap(id => Q.types[id].q);
        title = '전체 랜덤';
    } else if (type === 'wrong') {
        pool = getWrong();
        title = '오답노트';
        if (!pool.length) return;
    } else {
        pool = [...Q.types[type].q];
        title = Q.types[type].name;
    }

    currentType = type;
    index = 0;
    score = 0;
    const n = type === 'all' ? 10 : type === 'wrong' ? Math.min(20, pool.length) : Math.min(8, pool.length);
    questions = shuffle([...pool]).slice(0, n);

    $('type-title').textContent = title;
    show('quiz-screen');
    showQuestion();
}

function showQuestion() {
    const row = questions[index];
    const cat = row[0], question = row[1], options = row[2], answer = row[3], graph = row[4];

    $('progress').innerHTML = `<b>${index + 1}</b> / ${questions.length}`;
    $('bar').style.width = ((index + 1) / questions.length * 100) + '%';
    $('question-cat').textContent = cat;

    // 그래프 읽기: 미니 포물선
    const gc = $('q-graph');
    if (graph) { gc.classList.remove('hidden'); drawMiniParabola(gc, graph.a, graph.b, graph.c); }
    else gc.classList.add('hidden');

    // 문제 텍스트
    $('question-text').textContent = mx(question);

    // 선택지 (DOM 생성 → '<' 안전, 이후 KaTeX 렌더)
    const box = $('options');
    box.innerHTML = '';
    options.forEach((opt, i) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = mx(opt);
        btn.addEventListener('click', () => checkAnswer(i, answer));
        box.appendChild(btn);
    });

    // KaTeX 렌더
    renderMath($('question-text'));
    renderMath(box);
}

function checkAnswer(selected, answer) {
    const row = questions[index];
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === answer) btn.classList.add('correct');
        else if (i === selected) btn.classList.add('wrong');
    });

    if (selected === answer) {
        score++;
        if (currentType === 'wrong') removeWrong(row[1]);   // 오답노트에서 정복 → 제거
    } else {
        addWrong(row);                                       // 틀린 문제 저장
    }

    setTimeout(() => {
        if (++index < questions.length) showQuestion();
        else showResult();
    }, 1100);
}

function showResult() {
    show('result-screen');
    const percent = Math.round(score / questions.length * 100);
    $('result-score').textContent = percent + '%';
    $('result-text').textContent = `${questions.length}문제 중 ${score}문제 정답`;
    $('result-message').textContent =
        percent === 100 ? '완벽해요! 🎉' :
        percent >= 80 ? '훌륭해요!' :
        percent >= 60 ? '좋아요, 조금만 더!' :
        percent >= 40 ? '복습이 필요해요.' : '개념부터 다시 볼까요?';
}

/* ============================================================
   화면 전환
   ============================================================ */
function show(id) {
    ['type-screen', 'quiz-screen', 'result-screen'].forEach(s =>
        $(s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
}
function goTypes() { renderTypes(); show('type-screen'); }   // 오답노트 개수 갱신
function retry() { startQuiz(currentType); }

/* 초기화 */
renderTypes();
