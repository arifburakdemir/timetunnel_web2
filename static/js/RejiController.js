// RejiController - orchestrates sub-modules and exposes the public API

import { Contestant } from './modules/Contestant.js';
import { StageControl } from './modules/StageControl.js';
import { WheelControl } from './modules/WheelControl.js';
import { QuestionControl } from './modules/QuestionControl.js';
import { RightWrongControl } from './modules/RightWrongControl.js';
import { SelectTrueControl } from './modules/SelectTrueControl.js';
import { BackgroundControl } from './modules/BackgroundControl.js';

export class RejiController {
    constructor() {
        // Core state
        this.contestants = [];
        this.currentStage = 0;
        this.stageShowed = false;
        this.currentQuestion = null;
        this.selectedOption = -1;  // Changed from null to -1 to indicate no selection
        this.questionLocked = false;
        this.timer = null;
        this.timeRemaining = 0;
        this.wheelResult = null;
        this.stage2SelectedOption = null;
        this.trueFalseSelections = {};
        this.isTimeOut = false; 

        // Stage 3
        this.stage3CurrentPlayer = 0;
        this.stage3PlayerSelections = {};

        // Sub-modules
        this.contestant = new Contestant(this);
        this.stage = new StageControl(this);
        this.wheel = new WheelControl(this);
        this.question = new QuestionControl(this);
        this.rightWrong = new RightWrongControl(this);
        this.selectTrue = new SelectTrueControl(this);
        this.background = new BackgroundControl(this);

        // Public API compatibility (proxy methods used by HTML onclicks)
        this.addContestant = () => this.contestant.addContestant();
        this.loadContestants = () => this.contestant.loadContestants();
        this.displayContestants = () => this.contestant.displayContestants();
        this.adjustPoints = (id, mult) => this.contestant.adjustPoints(id, mult);
        this.eliminateContestant = (id) => this.contestant.eliminateContestant(id);
        this.deleteContestant = (id) => this.contestant.deleteContestant(id);
        this.removePhoto = () => this.contestant.clearPhotoPreview();//Fotoğraf kaldırma fonksiyonu

        this.showLogo = () => this.stage.showLogo();
        this.startEleminateStage = () => this.stage.startEleminateStage();
        this.startStage = (s) => this.stage.startStage(s,false);
        this.showWaitingScreen = () => this.stage.showWaitingScreen();
        this.updateStageDisplay = () => this.stage.updateStageDisplay();
        this.clearAllStageStyles = () => this.stage.clearAllStageStyles();
        this.showScoreboard = () => this.stage.showScoreboard();
        this.hideScoreboard = () => this.stage.hideScoreboard();
        this.resetGame = () => this.stage.resetGame();

        this.spinWheel = () => this.wheel.spinWheel();
        this.bringActiveStageWheel = () => this.wheel.bringActiveStageWheel();

        this.loadQuestionForDate = () => this.question.loadQuestionForDate();
        this.processQuestionData = (q) => this.question.processQuestionData(q);
        this.displayQuestion = () => this.question.displayQuestion();
        this.selectOption = (i) => this.question.selectOption(i);
        this.showResult = () => this.question.showResult();
        this.lockAnswerAt = () => this.question.lockAnswerAt();
        this.nextQuestion = () => this.question.nextQuestion();
        this.startTimer = (s) => this.question.startTimer(s);
        this.updateTimerDisplay = () => this.question.updateTimerDisplay();
        this.sendToWall = (a, d) => this.question.sendToWall(a, d);
        this.showNotification = (m, t = 'info') => this.question.showNotification(m, t);
        this.updateUnityStatusIndicator = (c) => this.question.updateUnityStatusIndicator(c);
        this.createNotificationToast = (m, t) => this.question.createNotificationToast(m, t);
        this.handleUnityGameState = (d) => this.question.handleUnityGameState(d);
        this.handleUnityWheelState = (d) => this.question.handleUnityWheelState(d);
        this.handleUnityQuestionState = (d) => this.question.handleUnityQuestionState(d);
        this.handleUnityTimerState = (d) => this.question.handleUnityTimerState(d);
        this.handleUnityButtonClick = (d) => this.question.handleUnityButtonClick(d);

        this.showStage2Question = (qd) => this.rightWrong.showStage2Question(qd);
        this.setStage2OptionState = (i, s) => this.rightWrong.setStage2OptionState(i, s);
        this.resetStage2Options = () => this.rightWrong.resetStage2Options();
        this.selectStage2Option = (i) => this.rightWrong.selectStage2Option(i);
        this.markStage2True = () => this.rightWrong.markStage2True();
        this.markStage2False = () => this.rightWrong.markStage2False();
        this.updateRejiStage2Visual = (i, s) => this.rightWrong.updateRejiStage2Visual(i, s);
        this.showStage2Result = () => this.rightWrong.showStage2Result();
        this.stage2TimeUp = () => this.rightWrong.stage2TimeUp();
        this.selectTrueFalse = (optionIndex, isTrue) => this.rightWrong.selectTrueFalse(optionIndex, isTrue);

        this.prepareStage3Finalists = () => this.selectTrue.prepareStage3Finalists();
        this.selectStage3PlayerOption = (optionIndex) => this.selectTrue.selectStage3PlayerOption(optionIndex);
        this.showStage3Result = () => this.selectTrue.showStage3Result();

        // Initialize QuestionControl after all modules are ready
        this.question.init();
    }



    // Aktif etap göstergesini güncelle
    updateActiveStageDisplay() {
        const activeStageElement = document.getElementById('active-stage-display');
        if (activeStageElement) {
            const stageText = this.currentStage === 0 ? 'Etap başlatılmadı' : `${this.currentStage}. Etap`;
            activeStageElement.textContent = stageText;
        }
    }

    // Handle stage 3 player timeout
    async handleStage3PlayerTimeOut() {
        
        this.isTimeOut = true;
        this.selectedOption = undefined;
        this.selectTrue.handleStage3PlayerTimeout();
    }
}