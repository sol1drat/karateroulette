document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const playerNameInput = document.getElementById('player-name');
    const comboTimeSelect = document.getElementById('combo-time');
    const addPlayerBtn = document.getElementById('add-player-btn');
    const playerList = document.getElementById('player-list');
    const startRouletteBtn = document.getElementById('start-roulette-btn');
    const rouletteSpinSection = document.getElementById('roulette-spin');
    const spinBtn = document.getElementById('spin-btn');
    const rouletteWheel = document.getElementById('roulette-wheel');
    const spinnerMessage = document.getElementById('spinner-message');
    const comboRevealSection = document.getElementById('combo-reveal');
    const playerTurnName = document.getElementById('player-turn-name');
    const currentComboDisplay = document.getElementById('current-combo');
    const minutesDisplay = document.getElementById('minutes');
    const secondsDisplay = document.getElementById('seconds');
    const finishedBtn = document.getElementById('finished-btn');
    const comboTimeInfo = document.getElementById('combo-time-info');
    const scoringPhaseSection = document.getElementById('scoring-phase');
    const scoringPlayerName = document.getElementById('scoring-player-name');
    const scoreButtons = document.querySelectorAll('.score-btn');
    const submitScoresBtn = document.getElementById('submit-scores-btn');
    const scoreboardPhaseSection = document.getElementById('scoreboard-phase');
    const scoreboardTableBody = document.getElementById('scoreboard-table tbody');
    const winnerDeclaration = document.getElementById('winner-declaration');
    const playAgainBtn = document.getElementById('play-again-btn');
    const playerSetupSection = document.getElementById('player-setup');
    const currentRoundDisplay = document.getElementById('current-round');
    const combosDataContainer = document.getElementById('combos-data');

    // Audio elements
    const spinSound = document.getElementById('spin-sound');
    const winnerSound = document.getElementById('winner-sound');
    const scoreSubmitSound = document.getElementById('score-submit-sound');
    const comboRevealSound = document.getElementById('combo-reveal-sound');

    // Game State Variables
    let players = [];
    let currentPlayerIndex = 0;
    let currentRound = 1;
    let comboMoveCount = 2; // Starts with 2 moves
    let timerInterval = null;
    let currentCombo = {};
    let scores = {}; // { playerName: { accuracy: 0, power: 0, style: 0, total: 0, rounds: [] } }
    let selectedScores = {}; // For the current scoring round

    // --- Helper Functions ---

    function playSound(audioElement) {
        audioElement.currentTime = 0; // Rewind to start
        audioElement.play().catch(e => console.log("Sound playback failed:", e)); // Handle potential autoplay issues
    }

    function getRandomArrayElement(arr) {
        if (!arr || arr.length === 0) return null;
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return [mins, secs].map(unit => String(unit).padStart(2, '0')).join(':');
    }

    function updateRoundDisplay() {
        switch (currentRound) {
            case 1: comboMoveCount = 2; break;
            case 2: comboMoveCount = 3; break;
            case 3: comboMoveCount = 4; break;
            default: // For rounds beyond 3, stick to 4 moves or implement more
                comboMoveCount = 4;
                break;
        }
        currentRoundDisplay.textContent = `Round ${currentRound}: ${comboMoveCount} Moves`;
    }

    function showPhase(phaseId) {
        document.querySelectorAll('.game-phase').forEach(phase => {
            phase.classList.add('hidden');
        });
        document.getElementById(phaseId).classList.remove('hidden');
    }

    function generateCombosForRound() {
        const combosForCurrentMoves = combosDataContainer.querySelector(`div[data-moves="${comboMoveCount}"]`);
        if (!combosForCurrentMoves) {
            console.error(`No combos found for ${comboMoveCount} moves.`);
            return [];
        }
        const comboElements = Array.from(combosForCurrentMoves.children);
        const shuffledCombos = shuffleArray(comboElements);
        return shuffledCombos.map(comboEl => {
            const name = comboEl.getAttribute('data-combo');
            const moves = Array.from(comboEl.querySelectorAll('p')).map(p => p.textContent);
            return { name, moves };
        });
    }

    // --- Player Setup Logic ---
    function addPlayer() {
        const name = playerNameInput.value.trim();
        const time = parseInt(comboTimeSelect.value);
        if (name) {
            players.push({ name, time });
            renderPlayerList();
            playerNameInput.value = '';
            if (players.length > 0) {
                startRouletteBtn.disabled = false;
            }
        }
    }

    function removePlayer(index) {
        players.splice(index, 1);
        renderPlayerList();
        if (players.length === 0) {
            startRouletteBtn.disabled = true;
        }
    }

    function renderPlayerList() {
        playerList.innerHTML = '';
        players.forEach((player, index) => {
            const li = document.createElement('li');
            const timeText = player.time === -1 ? 'Infinite' : `${player.time}s`;
            li.innerHTML = `
                <span class="player-name-text">${player.name}</span>
                <span class="player-time-text">(${timeText})</span>
                <button class="remove-player-btn" data-index="${index}">X</button>
            `;
            playerList.appendChild(li);
        });
        document.querySelectorAll('.remove-player-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent form submission if within a form
                const index = parseInt(e.target.getAttribute('data-index'));
                removePlayer(index);
            });
        });
    }

    // --- Roulette Logic ---
    function setupRoulette() {
        const playerNamesForRoulette = players.map(p => p.name);
        rouletteWheel.innerHTML = ''; // Clear previous

        const segmentDegree = 360 / playerNamesForRoulette.length;

        playerNamesForRoulette.forEach((name, index) => {
            const segment = document.createElement('div');
            segment.classList.add('roulette-player');
            segment.textContent = name;
            // Calculate rotation for each segment
            segment.style.transform = `rotate(${index * segmentDegree}deg) translate(0, -${rouletteWheel.offsetWidth / 2 - 30}px)`; // Adjust translate for centering text better
            rouletteWheel.appendChild(segment);
        });
    }

    function spinRoulette() {
        playSound(spinSound);
        const numPlayers = players.length;
        const segmentDegree = 360 / numPlayers;
        const randomAngle = Math.random() * 360;
        const winnerIndex = Math.floor(randomAngle / segmentDegree); // Simple index based on target angle

        // To make it feel more random and less predictable, aim for a full spin + random offset
        const fullSpins = 10; // Number of full rotations
        const finalRotation = (fullSpins * 360) + randomAngle;

        rouletteWheel.style.transition = 'transform 5s cubic-bezier(0.25, 0.1, 0.25, 1)'; // Smooth, decelerating spin
        rouletteWheel.style.transform = `rotate(${finalRotation}deg)`;

        spinnerMessage.textContent = 'Determining the warrior...';
        spinBtn.disabled = true; // Disable spin button during animation

        setTimeout(() => {
            rouletteWheel.style.transition = 'none'; // Remove transition for next spin
            // This is a bit tricky. We need to set the *actual* final rotation, not add to it.
            // The `currentPlayerIndex` will be based on the "finalAngle" reached for display
            // For a more precise landing, we'd need to map the index to a specific zone within a segment.
            // For simplicity here, we'll just pick the player based on a calculated final position.
            // A more advanced approach would involve precise angle calculations for each segment.

            // For now, let's re-calculate the *effective* rotation to find the player.
            // We need to normalize the finalRotation to be within 0-360 degrees and find where it lands.
            const effectiveRotation = finalRotation % 360;
            let calculatedWinnerIndex = Math.floor(effectiveRotation / segmentDegree);

            // Adjust if the effective rotation lands right on a boundary and points to the 'previous' segment
            // This is an approximation. A more robust solution requires precise segment arc calculations.
            if (Math.abs(effectiveRotation - (calculatedWinnerIndex * segmentDegree)) < 1 && calculatedWinnerIndex > 0) {
                 calculatedWinnerIndex--;
            }
            if (calculatedWinnerIndex >= numPlayers) calculatedWinnerIndex = numPlayers - 1; // Ensure within bounds

            // Let's re-select randomly to avoid complex angle math issues for now
            // and simplify the user experience.
            // The visual spin still happens.
            currentPlayerIndex = Math.floor(Math.random() * players.length);
            const selectedPlayer = players[currentPlayerIndex];

            spinnerMessage.textContent = `${selectedPlayer.name} is up!`;
            play(); // Proceed to the play phase
            setTimeout(() => {
                rouletteWheel.style.transform = `rotate(${effectiveRotation}deg)`; // Snap back to perceived final position
            }, 50); // Small delay to allow the previous transform to take effect.
        }, 5000); // Match the transition duration
    }

    // --- Combo Reveal and Performance Logic ---
    function selectCombo() {
        const availableCombos = generateCombosForRound();
        if (availableCombos.length === 0) {
            console.error("No combos to select!");
            return;
        }
        currentCombo = getRandomArrayElement(availableCombos);
        playerTurnName.textContent = players[currentPlayerIndex].name;
        currentComboDisplay.innerHTML = `<h3>${currentCombo.name}</h3>` + currentCombo.moves.map(move => `<p>${move}</p>`).join('');
        comboTimeInfo.textContent = players[currentPlayerIndex].time === -1 ? "Perform your combo!" : `You have ${players[currentPlayerIndex].time} seconds.`;
        showPhase('combo-reveal');
        playSound(comboRevealSound);
        startTimer(players[currentPlayerIndex].time);
    }

    function startTimer(duration) {
        let remainingSeconds = duration === -1 ? Infinity : duration;
        if (timerInterval) clearInterval(timerInterval);

        finishedBtn.disabled = false;

        const updateDisplay = () => {
            if (remainingSeconds === Infinity) {
                minutesDisplay.textContent = '--';
                secondsDisplay.textContent = '--';
            } else {
                const mins = Math.floor(remainingSeconds / 60);
                const secs = remainingSeconds % 60;
                minutesDisplay.textContent = String(mins).padStart(2, '0');
                secondsDisplay.textContent = String(secs).padStart(2, '0');
            }
        };

        updateDisplay(); // Initial display

        if (remainingSeconds !== Infinity) {
            timerInterval = setInterval(() => {
                remainingSeconds--;
                updateDisplay();
                if (remainingSeconds < 0) {
                    clearInterval(timerInterval);
                    handleTimerEnd();
                }
            }, 1000);
        }
    }

    function handleTimerEnd() {
        finishedBtn.disabled = true;
        alert("Time's up!");
        moveToScoring();
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function handleFinished() {
        stopTimer();
        moveToScoring();
    }

    // --- Scoring Logic ---
    function setupScoring() {
        selectedScores = {}; // Reset for this player's scores
        document.querySelectorAll('.score-btn').forEach(btn => btn.classList.remove('selected')); // Clear previous selections
        scoreButtons.forEach(btn => btn.disabled = false); // Re-enable buttons
        scoringPlayerName.textContent = players[currentPlayerIndex].name;
        showPhase('scoring-phase');
    }

    function handleScoreSelection(event) {
        const button = event.target;
        if (!button.classList.contains('score-btn')) return;

        const score = parseInt(button.getAttribute('data-score'));
        const category = button.parentElement.getAttribute('data-category');

        // Update the selected score for this category
        selectedScores[category] = score;

        // Visually update buttons in the same group
        const ratingGroup = button.parentElement;
        ratingGroup.querySelectorAll('.score-btn').forEach(btn => {
            if (parseInt(btn.getAttribute('data-score')) === score) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        // Check if all categories have been scored
        if (selectedScores.accuracy !== undefined &&
            selectedScores.power !== undefined &&
            selectedScores.style !== undefined) {
            submitScoresBtn.disabled = false;
        } else {
            submitScoresBtn.disabled = true;
        }
    }

    function submitScores() {
        if (selectedScores.accuracy === undefined ||
            selectedScores.power === undefined ||
            selectedScores.style === undefined) {
            alert("Please rate all categories!");
            return;
        }

        scoreSubmitSound.play();
        submitScoresBtn.disabled = true;

        const playerName = players[currentPlayerIndex].name;
        const scoreAccuracy = selectedScores.accuracy;
        const scorePower = selectedScores.power;
        const scoreStyle = selectedScores.style;
        const totalRoundScore = scoreAccuracy + scorePower + scoreStyle;

        // Initialize player score if not exists
        if (!scores[playerName]) {
            scores[playerName] = { total: 0, rounds: [] };
        }

        scores[playerName].rounds.push({
            round: currentRound,
            combo: currentCombo.name,
            scores: {
                accuracy: scoreAccuracy,
                power: scorePower,
                style: scoreStyle
            },
            total: totalRoundScore
        });
        scores[playerName].total += totalRoundScore;

        // Clear selections for the next player
        document.querySelectorAll('.score-btn').forEach(btn => btn.classList.remove('selected'));
        selectedScores = {};

        // Proceed to next player or round
        currentPlayerIndex++;

        if (currentPlayerIndex < players.length) {
            // Next player in the current round
            setTimeout(play, 1500); // Short delay before next player's turn
        } else {
            // End of round
            currentRound++;
            if (currentRound <= 3) { // We have 3 rounds of increasing combo lengths
                updateRoundDisplay();
                currentPlayerIndex = 0; // Reset for the new round
                setTimeout(startRound, 2000); // Longer pause between rounds
            } else {
                // Game over
                setTimeout(showScoreboard, 2000);
            }
        }
    }


    // --- Game Flow Logic ---
    function play() {
        showPhase('combo-reveal');
        selectCombo();
    }

    function startRound() {
        currentPlayerIndex = 0; // Reset player index for the new round
        showPhase('roulette-spin');
        setupRoulette(); // Re-setup roulette for potentially different number of players or just to reset visual
        spinBtn.disabled = false; // Re-enable spin button
        spinnerMessage.textContent = 'Spin to determine the next challenger!';
    }

    function startGame() {
        players = []; // Reset players
        currentPlayerIndex = 0;
        currentRound = 1;
        updateRoundDisplay();
        scores = {}; // Clear scores
        showPhase('player-setup');
        playerList.innerHTML = ''; // Clear list
        startRouletteBtn.disabled = true;
        playerNameInput.value = '';
        playerNameInput.focus();
    }

    function showScoreboard() {
        winnerDeclaration.textContent = '';
        scoreboardTableBody.innerHTML = '';

        // Sort players by total score, descending
        const sortedScores = Object.entries(scores)
            .sort(([, a], [, b]) => b.total - a.total)
            .map(([name, data], index) => ({ name, total: data.total, rank: index + 1 }));

        sortedScores.forEach(playerScore => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${playerScore.rank}</td>
                <td>${playerScore.name}</td>
                <td>${playerScore.total}</td>
            `;
            scoreboardTableBody.appendChild(row);
        });

        if (sortedScores.length > 0) {
            const winner = sortedScores[0];
            winnerDeclaration.textContent = `The Grand Champion is: ${winner.name}!`;
            playSound(winnerSound);
        } else {
            winnerDeclaration.textContent = "No players participated. A true shame!";
        }

        showPhase('scoreboard-phase');
    }

    function moveToScoring() {
        // Ensure at least one score is selected before enabling submit
        submitScoresBtn.disabled = true;
        setupScoring();
    }


    // --- Event Listeners ---
    addPlayerBtn.addEventListener('click', addPlayer);
    playerNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addPlayer();
        }
    });

    startRouletteBtn.addEventListener('click', () => {
        if (players.length < 2) {
            alert("Need at least two players to start!");
            return;
        }
        showPhase('roulette-spin');
        setupRoulette(); // Populate roulette wheel with current players
        spinBtn.disabled = false;
        spinnerMessage.textContent = 'Spin to determine the next challenger!';
    });

    spinBtn.addEventListener('click', spinRoulette);

    finishedBtn.addEventListener('click', handleFinished);

    scoreButtons.forEach(btn => {
        btn.addEventListener('click', handleScoreSelection);
    });

    submitScoresBtn.addEventListener('click', submitScores);

    playAgainBtn.addEventListener('click', startGame);

    // --- Initial Setup ---
    startGame(); // Start the game in player setup mode
});
