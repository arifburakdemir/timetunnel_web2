import { RejiController } from './RejiController.js';

window.wallRef = null;
window.unityReady = false;

// Global instance
let rejiController;

// Message bus from Wall/Unity
window.addEventListener('message', function (event) {
    if (!event.data) return;

    const { type, action, data } = event.data;
    if (type === 'registerWall') { window.wallRef = event.source; return; }
    if (type === 'unityReady') { window.unityReady = true; if (window.rejiController) { window.rejiController.updateUnityStatusIndicator(true); } return; }
    if (type === 'wheelResult') { if (window.rejiController) { } return; }
    if (type === 'unity_game_state') { if (window.rejiController) { window.rejiController.handleUnityGameState(data); } return; }
    if (action === 'stage2TimeUp') { if (window.rejiController) { window.rejiController.stage2TimeUp(); } return; }
    if (action === 'stopStage3Timer') { if (window.rejiController) { window.rejiController.stopTimer(); window.rejiController.questionLocked = true; } return; }
    if (action === 'stage3PlayerTimeOut') { if (window.rejiController) { window.rejiController.handleStage3PlayerTimeOut(); } return; }
    if (type === 'unity_button_click') { if (window.rejiController) { window.rejiController.handleUnityButtonClick(data); } return; }
});

document.addEventListener('DOMContentLoaded', () => {
    rejiController = new RejiController();
    window.rejiController = rejiController;
});

// Expose global helpers for inline onclick handlers
window.addContestant = function () { rejiController?.addContestant(); };

window.showLogo = () => rejiController?.showLogo();
window.startStage = function (stage) { rejiController?.startStage(stage); };
window.startEleminateStage = function () { rejiController?.startEleminateStage(); };
window.showWaitingScreen = function () { rejiController?.showWaitingScreen(); };
window.spinWheel = function () { rejiController?.spinWheel(); };
window.bringActiveStageWheel = function () { rejiController?.bringActiveStageWheel(); };
window.loadQuestionForDate = function () { rejiController?.loadQuestionForDate(); };
window.showResult = function () { rejiController?.showResult(); };
window.lockAnswerAt = function () { rejiController?.lockAnswerAt(); };
window.nextQuestion = function () { rejiController?.nextQuestion(); };
window.resetGame = function () { rejiController?.resetGame?.(); };
window.bringWheelToFront = function (wheelType,delay) { rejiController?.bringWheelToFront(wheelType,delay); };
window.showScoreboard = function () { rejiController?.showScoreboard?.(); };
window.hideScoreboard = function () { rejiController?.hideScoreboard?.(); };
window.selectTrueFalse = function (optionIndex, isTrue) { rejiController?.selectTrueFalse(optionIndex, isTrue); };
window.selectStage3PlayerOption = function (optionIndex) {
    rejiController.selectStage3PlayerOption(optionIndex);
};

// Background control functions
window.toggleBackgroundColorPicker = function() {
    // This function is now handled by the BackgroundControl module
    // We keep it for backward compatibility with HTML onclick attributes
};

window.updateBackgroundColor = function() {
    // This function is now handled by the BackgroundControl module
    // We keep it for backward compatibility with HTML onclick attributes
};

window.checkUnityStatus = function () {
    if (rejiController) {
        const status = window.unityReady ? 'Bağlı' : 'Bağlı Değil';
        // Unity status notification removed - only errors should show notifications
    }
    return { unityReady: window.unityReady, wallConnected: window.wallRef && !window.wallRef.closed };
};

window.animateElimination = function (contestantIdOrName) {
    const players = document.querySelectorAll('.scoreboard-player');
    let found = false;
    players.forEach(player => {
        const nameDiv = player.querySelector('.scoreboard-player-name');
        const playerId = player.getAttribute('data-id');
        if ((nameDiv && nameDiv.textContent.trim() == contestantIdOrName) || (playerId && playerId == contestantIdOrName)) {
            found = true;
            player.classList.add('eliminated');
            player.querySelectorAll('.scoreboard-png-wrapper').forEach(wrap => {
                wrap.classList.remove('elim-animate');
                void wrap.offsetWidth;
                wrap.classList.add('elim-animate');
            });
        }
    });
};