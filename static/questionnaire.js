// static/questionnaire.js
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.questionnaire-container');
    if (!container) return;

    const totalQuestions = parseInt(container.dataset.totalQuestions, 10);
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const prevBtn = document.getElementById('prev-question');
    const nextBtn = document.getElementById('next-question');

    let currentQuestionIndex = 0;
    const userAnswers = {};

    // --- Audio Handling ---
    const backgroundMusic = new Audio('/static/background_music.mp3');
    const popSound = new Audio('/static/bubble_pop.mp3');
    backgroundMusic.loop = true;
    backgroundMusic.volume = 0.25;
    popSound.volume = 0.5;
    backgroundMusic.play().catch(e => console.log("Browser prevented audio autoplay. Click to enable."));
    // A single click anywhere on the page will attempt to start the music again.
    document.body.addEventListener('click', () => {
        if (backgroundMusic.paused) {
            backgroundMusic.play();
        }
    }, { once: true });

    // --- Question Flow ---
    async function fetchAndDisplayQuestion(index) {
        const response = await fetch(`/get_question/${index}`);
        const question = await response.json();
        
        questionText.textContent = question.text;
        optionsContainer.innerHTML = '';
        const previousSelections = userAnswers[index] || [];

        question.options.forEach(option => {
            const bubble = document.createElement('div');
            bubble.classList.add('answer-bubble');
            bubble.textContent = option;
            if (previousSelections.includes(option)) {
                bubble.classList.add('selected');
            }
            bubble.addEventListener('click', () => handleAnswerSelection(bubble, option));
            optionsContainer.appendChild(bubble);
        });

        prevBtn.style.visibility = index === 0 ? 'hidden' : 'visible';
        nextBtn.textContent = index === totalQuestions - 1 ? 'Submit & Find Match' : '→';
    }

    function handleAnswerSelection(bubble, answer) {
        popSound.currentTime = 0;
        popSound.play();
        bubble.classList.toggle('selected');

        if (!userAnswers[currentQuestionIndex]) userAnswers[currentQuestionIndex] = [];
        const answerIndex = userAnswers[currentQuestionIndex].indexOf(answer);
        if (answerIndex > -1) {
            userAnswers[currentQuestionIndex].splice(answerIndex, 1);
        } else {
            userAnswers[currentQuestionIndex].push(answer);
        }
    }

    async function submitAnswersAndMatch() {
        nextBtn.disabled = true;
        nextBtn.textContent = 'Submitting...';
        await fetch('/submit_answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ answers: userAnswers }),
        });
        window.location.href = '/start_matching';
    }

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < totalQuestions - 1) {
            currentQuestionIndex++;
            fetchAndDisplayQuestion(currentQuestionIndex);
        } else {
            submitAnswersAndMatch();
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            fetchAndDisplayQuestion(currentQuestionIndex);
        }
    });

    fetchAndDisplayQuestion(0);

    // --- Canvas Background Animation ---
    const canvas = document.getElementById('background-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    let hearts = [];
    const numHearts = 30;

    class Heart {
        constructor(isStatic = false) {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.size = Math.random() * 20 + 10;
            this.isStatic = isStatic;
            this.vx = isStatic ? 0 : (Math.random() - 0.5) * 0.5;
            this.vy = isStatic ? 0 : (Math.random() - 0.5) * 0.5;
            this.opacity = isStatic ? 0.3 : 0.15;
        }
        draw() {
            ctx.save();
            ctx.beginPath();
            const topCurveHeight = this.size * 0.3;
            ctx.moveTo(this.x, this.y + topCurveHeight);
            ctx.bezierCurveTo(this.x, this.y, this.x - this.size / 2, this.y, this.x - this.size / 2, this.y + topCurveHeight);
            ctx.bezierCurveTo(this.x - this.size / 2, this.y + (this.size + topCurveHeight) / 2, this.x, this.y + (this.size + topCurveHeight) / 2, this.x, this.y + this.size);
            ctx.bezierCurveTo(this.x, this.y + (this.size + topCurveHeight) / 2, this.x + this.size / 2, this.y + (this.size + topCurveHeight) / 2, this.x + this.size / 2, this.y + topCurveHeight);
            ctx.bezierCurveTo(this.x + this.size / 2, this.y, this.x, this.y, this.x, this.y + topCurveHeight);
            ctx.closePath();
            ctx.fillStyle = `rgba(224, 74, 149, ${this.opacity})`;
            ctx.fill();
            ctx.restore();
        }
        update() {
            if (this.isStatic) return;
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }

    function initHearts() {
        for (let i = 0; i < numHearts; i++) hearts.push(new Heart(i < 5));
    }

    function checkCollisions() {
        for (let i = 0; i < hearts.length; i++) {
            for (let j = i + 1; j < hearts.length; j++) {
                const h1 = hearts[i], h2 = hearts[j];
                const dx = h1.x - h2.x, dy = h1.y - h2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                if (distance < (h1.size / 1.5 + h2.size / 1.5)) {
                    if (h1.isStatic) { h2.vx *= -1; h2.vy *= -1; }
                    else if (h2.isStatic) { h1.vx *= -1; h1.vy *= -1; }
                    else { [h1.vx, h2.vx] = [h2.vx, h1.vx]; [h1.vy, h2.vy] = [h2.vy, h1.vy]; }
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        hearts.forEach(heart => { heart.update(); heart.draw(); });
        checkCollisions();
        requestAnimationFrame(animate);
    }

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    initHearts();
    animate();
});
