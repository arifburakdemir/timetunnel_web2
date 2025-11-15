export class StageControl {
    constructor(root) {
        this.root = root;
    }

    startEleminateStage()
    {
        console.log(`[WEB] StageControl : startEleminateStage :`);
        this.startStage(this.root.currentStage,true);
    }


    showLogo() {
        console.log(`[WEB] StageControl : showLogo :`);
        this.root.sendToWall('showLogo', {});
    }

    startStage(stage,isEleminate) {
        console.log(`[WEB] StageControl : startStage : isEleminate=${isEleminate}`);
        this.root.currentStage = stage;
        this.root.stageShowed = true;
        this.root.isTimeOut = false;
        console.log(`[WEB] StageControl : startStage : currentStage=${this.root.currentStage}`);
        this.updateStageDisplay();
        
        // Yeni aktif etap göstergesini de güncelle
        this.root.updateActiveStageDisplay();

        this.clearAllStageStyles();
        
        // Question-controls'u gizle
        const questionControls = document.getElementById('question-controls');
        if (questionControls) {
            questionControls.style.display = 'none';
        }
        
        // Wheel sonuçlarını sıfırla
        this.root.wheelResult = null;
        document.getElementById('wheel-result').textContent = 'Sonuç: -';
        
        // Soruyu getir butonunu gizle
        const getQuestionBtn = document.getElementById('get-question-btn');
        if (getQuestionBtn) {
            getQuestionBtn.style.display = 'none';
        }
        
        // Çarkı Çevir butonunu devre dışı bırak (etap başlatıldığında çark getir butonuna basana kadar)
        const spinWheelBtn = document.getElementById('spin-wheel-btn');
        if (spinWheelBtn) {
            spinWheelBtn.disabled = true;
        }

        if(isEleminate)
            this.root.sendToWall('showEliminateStage');
        else
            this.root.sendToWall('showStageTransition', { stage: stage });
        // Stage started successfully - notification removed

        const stage2Instructions = document.getElementById('stage2-instructions');
        if (stage2Instructions) {
            stage2Instructions.style.display = stage === 2 ? 'block' : 'none';
        }

        if (stage === 2) {
            this.root.resetStage2Options();
        }
    }

    showWaitingScreen() {
        // Waiting screen showing - notification removed
        this.root.sendToWall('waiting', {});
    }

    updateStageDisplay() {
        const stageText = this.root.currentStage === 0 ? 'Başlamadı' : `${this.root.currentStage}. Etap`;
        document.getElementById('current-stage').textContent = stageText;
    }

    clearAllStageStyles() {
        console.log('[WEB] StageControl : clearAllStageStyles : Temizleme başlıyor');

        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.classList.remove('selected', 'correct', 'wrong');
            btn.style.background = '';
            btn.style.color = '';
        });

        document.querySelectorAll('.stage2-item').forEach(item => {
            item.classList.remove('correct', 'wrong', 'selected', 'state-D', 'state-Y', 'state-def');
        });

        document.querySelectorAll('.tf-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        document.querySelectorAll('.tf-indicator').forEach(indicator => {
            indicator.textContent = '';
            indicator.className = 'tf-indicator';
        });

        this.root.trueFalseSelections = {};

        if (this.root.currentStage === 2) {
            this.root.sendToWall('resetStage2Options', {});
        }

        document.querySelectorAll('.stage3-item').forEach(item => {
            item.classList.remove('correct', 'wrong', 'selected', 'disabled');
        });

        console.log('[WEB] StageControl : clearAllStageStyles : Temizleme tamam');
    }

    async resetGame() {
        if (!confirm('Oyunu sıfırlamak istediğinizden emin misiniz? Tüm yarışmacılar ve veriler silinecek!')) return;
        try {
            const response = await fetch('/api/reset-game', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
            const result = await response.json();
            if (result.success) {
                this.root.currentStage = 0;
                this.root.currentQuestion = null;
                this.root.selectedOption = -1;
                this.root.questionLocked = false;
                this.root.contestants = [];
                this.root.isTimeOut = false; 
                this.root.displayContestants();
                this.updateStageDisplay();
                this.root.updateActiveStageDisplay(); // Aktif etap göstergesini de sıfırla
                
                // Refresh the page after a short delay to ensure all changes are applied
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
                
            } else {
                this.root.showNotification('Oyun sıfırlama hatası: ' + result.error, 'error');
            }
        } catch (error) {
            console.error(`[WEB] StageControl : resetGame : Hata : error=${error}`);
            this.root.showNotification('Oyun sıfırlama hatası', 'error');
        }
    }

    async showScoreboard() {
        try {
            console.log("[WEB] StageControl : showScoreboard");
            await this.root.loadContestants();
            let contestantsToShow = this.root.contestants;
            if (this.root.currentStage === 2) {
                contestantsToShow = this.root.contestants.filter(c => !c.eliminated);
            }
            this.root.sendToWall('showScoreboard', { contestants: contestantsToShow, stage: this.root.currentStage });
            const remainingCount = contestantsToShow.length;
            const stageText = this.root.currentStage === 2 ? `2. Etap puan durumu - ${remainingCount} kalan yarışmacı` : `${this.root.currentStage}. Etap puan durumu`;
            // Scoreboard showing - notification removed
        } catch (error) {
            console.error(`[WEB] StageControl : showScoreboard : Hata : error=${error}`);
            this.root.showNotification('Puan durumu gösterme hatası', 'error');
        }
    }

    hideScoreboard() {
        this.root.sendToWall('hideScoreboard', {});
        // Scoreboard hidden - notification removed
    }
}


