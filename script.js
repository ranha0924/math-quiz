/* ========================================
   수학 공식 퀴즈 - 메인 스크립트
   ======================================== */

/* 상태 변수 */
let grade;      // 현재 선택된 학년 (high1, high2, high3)
let questions;  // 현재 퀴즈에 출제된 문제 배열
let index;      // 현재 문제 번호 (0부터 시작)
let score;      // 맞은 문제 수

/* DOM 요소 선택 헬퍼 함수 */
const $ = id => document.getElementById(id);

/* ----------------------------------------
   배열 섞기 (Fisher-Yates 알고리즘)
   - 배열을 무작위로 섞어서 반환
   ---------------------------------------- */
const shuffle = arr => {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

/* ----------------------------------------
   퀴즈 시작
   - 학년 버튼 클릭 시 호출
   - 문제를 섞어서 10개 선택 후 퀴즈 시작
   ---------------------------------------- */
function startQuiz(g) {
    grade = g;
    index = 0;
    score = 0;

    // questions.js의 Q 객체에서 해당 학년 문제를 가져와 섞고 10개 선택
    questions = shuffle([...Q[g].q]).slice(0, 10);

    // 학년 이름 표시 및 화면 전환
    $('grade-title').textContent = Q[g].name;
    $('selection-screen').style.display = 'none';
    $('quiz-screen').style.display = 'block';

    showQuestion();
}

/* ----------------------------------------
   문제 표시
   - 현재 index의 문제를 화면에 표시
   - 문제 데이터 구조: [카테고리, 문제, 선택지배열, 정답인덱스]
   ---------------------------------------- */
function showQuestion() {
    // 구조 분해로 문제 데이터 추출
    const [category, question, options, answer] = questions[index];

    // 진행률, 카테고리, 문제 텍스트 업데이트
    $('progress').textContent = `${index + 1} / ${questions.length}`;
    $('question-title').textContent = category;
    $('question-text').textContent = question;

    // 선택지 버튼 생성 (innerHTML로 동적 생성)
    $('options').innerHTML = options.map((opt, i) =>
        `<button class="option-btn" onclick="checkAnswer(${i},${answer})">${opt}</button>`
    ).join('');
}

/* ----------------------------------------
   정답 확인
   - 선택지 클릭 시 호출
   - 정답/오답 표시 후 다음 문제로 이동
   ---------------------------------------- */
function checkAnswer(selected, answer) {
    const btns = document.querySelectorAll('.option-btn');

    // 모든 버튼 비활성화 및 정답/오답 표시
    btns.forEach((btn, i) => {
        btn.disabled = true;
        if (i === answer) btn.classList.add('correct');      // 정답: 초록색
        else if (i === selected) btn.classList.add('wrong'); // 오답: 빨간색
    });

    // 정답이면 점수 증가
    if (selected === answer) score++;

    // 1.5초 후 다음 문제 또는 결과 화면
    setTimeout(() => ++index < questions.length ? showQuestion() : showResult(), 1500);
}

/* ----------------------------------------
   결과 화면 표시
   - 퀴즈 종료 후 점수와 메시지 표시
   ---------------------------------------- */
function showResult() {
    $('quiz-screen').style.display = 'none';
    $('result-screen').style.display = 'block';

    // 정답률 계산
    const percent = Math.round(score / questions.length * 100);

    // 점수 및 결과 텍스트 표시
    $('result-score').textContent = percent + '%';
    $('result-text').textContent = `${questions.length}문제 중 ${score}문제 정답!`;

    // 점수에 따른 메시지
    $('result-message').textContent =
        percent === 100 ? '완벽!' :
        percent >= 80 ? '훌륭해요!' :
        percent >= 60 ? '좋아요!' :
        percent >= 40 ? '복습 필요!' : '힘내세요!';
}

/* ----------------------------------------
   처음으로 돌아가기
   - 학년 선택 화면으로 복귀
   ---------------------------------------- */
function goBack() {
    $('selection-screen').style.display = 'block';
    $('quiz-screen').style.display = 'none';
    $('result-screen').style.display = 'none';
}
