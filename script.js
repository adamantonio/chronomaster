/*
    ChronoMaster - Analog Clock Game
    Logic for time generation, clock rendering, and score tracking.
*/

document.addEventListener('DOMContentLoaded', () => {
    // --- constants ---
    const TOTAL_QUESTIONS = 10;
    const STORAGE_KEY = 'chrono_scores_v1';

    // --- state ---
    let gameState = {
        startTime: 0,
        endTime: 0,
        questionsCorrect: 0,
        targetTime: { h: 0, m: 0 },
        isPlaying: false
    };

    // --- elements ---
    const els = {
        hourHand: document.getElementById('hour-hand'),
        minuteHand: document.getElementById('minute-hand'),
        timeInput: document.getElementById('time-input'),
        submitBtn: document.getElementById('submit-btn'),
        feedback: document.getElementById('feedback'),
        progress: document.getElementById('progress'),

        // Modal & Overlay
        modal: document.getElementById('modal'),
        modalContent: document.querySelector('.modal-content'),
        modalGameOver: document.getElementById('modal-game-over'),
        modalScoreboard: document.getElementById('modal-scoreboard'),
        closeModalBtn: document.getElementById('close-modal-btn'),

        finalTimeDisplay: document.getElementById('final-time-display'),
        scoreList: document.getElementById('score-list'),

        // Header
        viewScoreboardBtn: document.getElementById('view-scoreboard-btn'),

        // Countdown
        countdownOverlay: document.getElementById('countdown-overlay'),
        countdownNumber: document.querySelector('.countdown-number'),

        // Start Screen
        startOverlay: document.getElementById('start-overlay'),
        startBtn: document.getElementById('start-game-btn')
    };

    // --- init ---
    function init() {
        // Event listeners
        els.submitBtn.addEventListener('click', handleAnswer);
        els.timeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleAnswer();
        });

        // Scoreboard toggle
        els.viewScoreboardBtn.addEventListener('click', () => showModal('scoreboard'));
        els.closeModalBtn.addEventListener('click', hideModal);

        // Close modal on outside click
        els.modal.addEventListener('click', (e) => {
            if (e.target === els.modal) hideModal();
        });

        // Initial setup
        updateScoreboardDOM();

        // Start Button
        els.startBtn.addEventListener('click', startGame);

        // Auto start game logic REMOVED - wait for user to click start
    }

    // --- modal logic ---
    function showModal(type) {
        els.modal.classList.remove('hidden');

        // Hide all sections first
        els.modalGameOver.classList.add('hidden');
        els.modalScoreboard.classList.add('hidden');
        els.closeModalBtn.classList.add('hidden');

        if (type === 'gameover') {
            els.modalGameOver.classList.remove('hidden');
            els.modalScoreboard.classList.remove('hidden'); // Show scoreboard below result
            els.closeModalBtn.classList.remove('hidden'); // Allow closing via X
        } else if (type === 'scoreboard') {
            els.modalScoreboard.classList.remove('hidden');
            els.closeModalBtn.classList.remove('hidden');
        }
    }

    function hideModal() {
        els.modal.classList.add('hidden');
        // If game is over (not playing), show start screen again to allow replay
        if (!gameState.isPlaying) {
            els.startOverlay.classList.remove('hidden');
        }
    }

    // --- game logic ---
    function startGame() {
        hideModal();
        els.startOverlay.classList.add('hidden'); // Hide start screen if present

        gameState.isPlaying = false; // Pause while counting down
        startCountdown(() => {
            gameState.isPlaying = true;
            gameState.questionsCorrect = 0;
            gameState.startTime = Date.now();

            els.feedback.textContent = '';
            els.timeInput.value = '';
            els.timeInput.focus();

            updateProgress();
            nextQuestion();
        });
    }

    function startCountdown(onComplete) {
        els.countdownOverlay.classList.remove('hidden');
        let count = 3;
        els.countdownNumber.textContent = count;

        const timer = setInterval(() => {
            count--;
            if (count > 0) {
                els.countdownNumber.textContent = count;
            } else {
                clearInterval(timer);
                els.countdownOverlay.classList.add('hidden');
                if (onComplete) onComplete();
            }
        }, 1000);
    }

    function nextQuestion() {
        if (gameState.questionsCorrect >= TOTAL_QUESTIONS) {
            endGame();
            return;
        }

        // Generate random time
        const h = Math.floor(Math.random() * 12); // 0-11
        const m = Math.floor(Math.random() * 60);

        gameState.targetTime = { h, m };

        renderClock(h, m);
        els.timeInput.value = '';
        els.timeInput.focus();
    }

    function renderClock(h, m) {
        const minuteDeg = m * 6;
        const hourDeg = (h * 30) + (m * 0.5);

        els.minuteHand.style.transform = `rotate(${minuteDeg}deg)`;
        els.hourHand.style.transform = `rotate(${hourDeg}deg)`;
    }

    function handleAnswer() {
        if (!gameState.isPlaying) return;

        const input = els.timeInput.value.trim();
        const parts = input.match(/^(\d{1,2})[:.](\d{2})$/);

        if (!parts) {
            flashFeedback('Invalid format (HH:MM)', 'wrong');
            return;
        }

        let inputH = parseInt(parts[1], 10);
        const inputM = parseInt(parts[2], 10);

        // Basic logical checks
        if (inputH < 1 || inputH > 12) {
            flashFeedback('Hours must be 1-12', 'wrong');
            return;
        }
        if (inputM < 0 || inputM > 59) {
            flashFeedback('Minutes must be 0-59', 'wrong');
            return;
        }

        // Convert input validation
        if (inputH === 12) inputH = 0; // Normalize 12 to 0 for calculations

        // Calculate minutes from 12:00
        const inputTotalMins = (inputH * 60) + inputM;
        const targetTotalMins = (gameState.targetTime.h * 60) + gameState.targetTime.m;

        // Calculate difference with wrap-around support (total minutes in 12h clock = 720)
        let diff = Math.abs(inputTotalMins - targetTotalMins);

        // Handle wrap around (e.g. 11:59 vs 12:00 -> diff 719, actual distance 1 min)
        if (diff > 360) {
            diff = 720 - diff;
        }

        if (diff <= 1) {
            flashFeedback('Correct!', 'correct');
            gameState.questionsCorrect++;
            updateProgress();
            setTimeout(nextQuestion, 500);
        } else {
            flashFeedback('Try again', 'wrong');
            els.timeInput.select();
        }
    }

    function flashFeedback(msg, type) {
        els.feedback.textContent = msg;
        // Remove class then add it back to trigger animation re-flow
        els.feedback.className = 'feedback-msg';
        void els.feedback.offsetWidth; // Force reflow
        els.feedback.className = `feedback-msg ${type} show`;
    }

    function updateProgress() {
        els.progress.textContent = `${gameState.questionsCorrect} / ${TOTAL_QUESTIONS}`;
    }

    function endGame() {
        gameState.isPlaying = false;
        gameState.endTime = Date.now();

        const durationMs = gameState.endTime - gameState.startTime;

        // Format nicely
        const minutes = Math.floor(durationMs / 60000);
        const seconds = ((durationMs % 60000) / 1000).toFixed(0).padStart(2, '0');
        const timeString = `${minutes}:${seconds}.${Math.floor((durationMs % 1000) / 10)}`;

        els.finalTimeDisplay.textContent = timeString;

        saveScore(durationMs);
        updateScoreboardDOM();

        showModal('gameover');
    }

    // --- scoreboard --
    function saveScore(ms) {
        let scores = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        scores.push({
            date: new Date().toISOString(),
            time: ms
        });
        scores.sort((a, b) => a.time - b.time);
        scores = scores.slice(0, 5);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    }

    function updateScoreboardDOM() {
        const scores = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        if (scores.length === 0) {
            els.scoreList.innerHTML = '<li style="justify-content:center; opacity:0.5;">No scores yet</li>';
            return;
        }
        els.scoreList.innerHTML = scores.map((s, i) => {
            const min = Math.floor(s.time / 60000);
            const sec = ((s.time % 60000) / 1000).toFixed(1).padStart(4, '0');
            return `<li>
                <span>#${i + 1}</span>
                <span>${min}:${sec}s</span>
            </li>`;
        }).join('');
    }

    // RunDOM needs to be ready
    init();
});

