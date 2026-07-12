/* ============================================================
   유형별 퀴즈 - 메인 스크립트
   ============================================================ */
const $ = id => document.getElementById(id);

/* 상태 */
let currentType;   // 현재 유형 id ('all' 또는 유형 키)
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

/* ----------------------------------------
   유형 선택 카드 생성
   ---------------------------------------- */
function renderTypes() {
    const total = Q.order.reduce((s, id) => s + Q.types[id].q.length, 0);
    let html = `
        <button class="type-card all" onclick="startQuiz('all')">
            <span class="t-icon">★</span>
            <span>
                <span class="t-name">전체 랜덤</span>
                <span class="t-desc">모든 유형에서 골고루 출제</span>
                <span class="t-count">${total}문제 중 10문제</span>
            </span>
        </button>`;
    html += Q.order.map(id => {
        const t = Q.types[id];
        return `
        <button class="type-card" onclick="startQuiz('${id}')">
            <span class="t-icon">${t.icon}</span>
            <span>
                <span class="t-name">${t.name}</span>
                <span class="t-desc">${t.desc}</span>
                <span class="t-count">${t.q.length}문제</span>
            </span>
        </button>`;
    }).join('');
    $('type-grid').innerHTML = html;
}

/* ----------------------------------------
   퀴즈 시작
   ---------------------------------------- */
function startQuiz(type) {
    currentType = type;
    index = 0;
    score = 0;

    // 문제 풀 구성
    let pool, title;
    if (type === 'all') {
        pool = Q.order.flatMap(id => Q.types[id].q);
        title = '전체 랜덤';
    } else {
        pool = [...Q.types[type].q];
        title = Q.types[type].name;
    }
    const n = type === 'all' ? 10 : Math.min(8, pool.length);
    questions = shuffle([...pool]).slice(0, n);

    $('type-title').textContent = title;
    show('quiz-screen');
    showQuestion();
}

/* ----------------------------------------
   문제 표시
   ---------------------------------------- */
function showQuestion() {
    const [cat, question, options] = questions[index];
    const answer = questions[index][3];

    $('progress').innerHTML = `<b>${index + 1}</b> / ${questions.length}`;
    $('bar').style.width = ((index + 1) / questions.length * 100) + '%';
    $('question-cat').textContent = cat;
    $('question-text').textContent = question;

    $('options').innerHTML = options.map((opt, i) =>
        `<button class="option-btn" onclick="checkAnswer(${i},${answer})">${opt}</button>`
    ).join('');
}

/* ----------------------------------------
   정답 확인
   ---------------------------------------- */
function checkAnswer(selected, answer) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === answer) btn.classList.add('correct');
        else if (i === selected) btn.classList.add('wrong');
    });
    if (selected === answer) score++;

    setTimeout(() => {
        if (++index < questions.length) showQuestion();
        else showResult();
    }, 1100);
}

/* ----------------------------------------
   결과 화면
   ---------------------------------------- */
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

/* ----------------------------------------
   화면 전환 헬퍼
   ---------------------------------------- */
function show(id) {
    ['type-screen', 'quiz-screen', 'result-screen'].forEach(s =>
        $(s).classList.toggle('hidden', s !== id));
    window.scrollTo(0, 0);
}
function goTypes() { show('type-screen'); }
function retry() { startQuiz(currentType); }

/* 초기화 */
renderTypes();
