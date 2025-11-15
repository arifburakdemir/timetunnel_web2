export class RightWrongControl {
    constructor(root) {
        this.root = root;
    }

    showStage2Question(questionData) {
        this.root.trueFalseSelections = {};
        this.root.sendToWall('showStage2Question', questionData);
        // Stage 2 question showing - notification removed

        if (this.root.currentStage === 2) {
            const stage2Options = document.getElementById('stage2-options');
            const stage2Instructions = document.getElementById('stage2-instructions');
            if (stage2Options && stage2Instructions) {
                for (let i = 0; i < 6; i++) {
                    const optionText = document.getElementById(`option-text-${i}`);
                    if (optionText && questionData.secenekler && questionData.secenekler[i]) {
                        optionText.textContent = questionData.secenekler[i].metin;
                    }
                    this.updateRejiStage2Visual(i, 'def');
                }
                stage2Options.style.display = 'block';
                stage2Instructions.style.display = 'block';
                this.root.stage2SelectedOption = null;
                document.querySelectorAll('.stage2-item').forEach(item => item.classList.remove('selected'));
            }
        }
    }

    selectTrueFalse(optionIndex, isTrue) {
        if (this.root.questionLocked) return;
        const stageItem = document.querySelector(`[data-option="${optionIndex}"]`);
        const trueBtns = stageItem.querySelectorAll('.true-btn');
        const falseBtns = stageItem.querySelectorAll('.false-btn');
        const indicator = document.getElementById(`tf-indicator-${optionIndex}`);
        trueBtns.forEach(btn => btn.classList.remove('selected'));
        falseBtns.forEach(btn => btn.classList.remove('selected'));
        if (isTrue) {
            trueBtns.forEach(btn => btn.classList.add('selected'));
            indicator.textContent = '';
            indicator.className = 'tf-indicator true';
        } else {
            falseBtns.forEach(btn => btn.classList.add('selected'));
            indicator.textContent = '';
            indicator.className = 'tf-indicator false';
        }
        if (!this.root.trueFalseSelections) this.root.trueFalseSelections = {};
        this.root.trueFalseSelections[optionIndex] = isTrue;
        this.setStage2OptionState(optionIndex, isTrue);
        const selection = isTrue ? 'Doğru' : 'Yanlış';
        console.log(`[WEB] RightWrongControl : selectTrueFalse : index=${optionIndex},answer=${isTrue}`);
        // Option selection - notification removed
    }
    
    async setStage2OptionState(optionIndex, state) {
        try {
            const response = await fetch('/api/stage2/option-state', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ optionIndex, state })
            });
            const result = await response.json();
            if (result.success) {
                //{"index":0,"answer":false}
                this.root.sendToWall('setStage2OptionState', { index: optionIndex, answer: state });
                console.log("[WEB]_________________________setStage2OptionState")
            } else {
                this.root.showNotification('Şık durumu güncellenemedi', 'error');
            }
        } catch (error) {
            console.error('[WEB] Şık durumu güncelleme hatası:', error);
            this.root.showNotification('Şık durumu güncelleme hatası', 'error');
        }
    }

    async resetStage2Options() {
        try {
            const response = await fetch('/api/stage2/reset-options', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                this.root.trueFalseSelections = {};
                for (let i = 0; i < 6; i++) this.updateRejiStage2Visual(i, 'def');
                // Stage 2 options reset - notification removed
            } else {
                this.root.showNotification('Şık durumları sıfırlanamadı', 'error');
            }
        } catch (error) {
            this.root.showNotification('Şık durumları sıfırlama hatası', 'error');
        }
    }

    selectStage2Option(optionIndex) {
        this.root.stage2SelectedOption = optionIndex;
        document.querySelectorAll('.stage2-item').forEach(item => item.classList.remove('selected'));
        const selectedItem = document.querySelector(`[data-option="${optionIndex}"]`);
        if (selectedItem) selectedItem.classList.add('selected');
    }

    markStage2True() {
        if (this.root.stage2SelectedOption !== null) {
            if (!this.root.trueFalseSelections) this.root.trueFalseSelections = {};
            this.root.trueFalseSelections[this.root.stage2SelectedOption] = true;
            this.updateRejiStage2Visual(this.root.stage2SelectedOption, 'D');
            this.setStage2OptionState(this.root.stage2SelectedOption, 'D');
            this.root.sendToWall('setStage2OptionState', { optionIndex: this.root.stage2SelectedOption, state: 'D' });
            console.log(`[WEB] RightWrongControl : markStage2True : optionIndex=${this.root.stage2SelectedOption},state=D`);
        }
    }

    markStage2False() {
        if (this.root.stage2SelectedOption !== null) {
            if (!this.root.trueFalseSelections) this.root.trueFalseSelections = {};
            this.root.trueFalseSelections[this.root.stage2SelectedOption] = false;
            this.updateRejiStage2Visual(this.root.stage2SelectedOption, 'Y');
            this.setStage2OptionState(this.root.stage2SelectedOption, 'Y');
            this.root.sendToWall('setStage2OptionState', { optionIndex: this.root.stage2SelectedOption, state: 'Y' });
            console.log(`[WEB] RightWrongControl : markStage2False : optionIndex=${this.root.stage2SelectedOption},state=Y`);
        }
    }

    updateRejiStage2Visual(optionIndex, state) {
        const stageItem = document.querySelector(`[data-option="${optionIndex}"]`);
        if (stageItem) {
            stageItem.classList.remove('state-D', 'state-Y', 'state-def');
            stageItem.classList.add(`state-${state}`);
            const indicator = stageItem.querySelector('.tf-indicator');
            if (indicator) {
                indicator.className = 'tf-indicator';
                if (state === 'D') indicator.classList.add('true');
                else if (state === 'Y') indicator.classList.add('false');
            }
        }
    }

    showStage2Result() {
        if (!this.root.currentQuestion || !this.root.currentQuestion.secenekler) {
            this.root.showNotification('Önce bir soru yükleyin!', 'error');
            return;
        }
        if (!this.root.trueFalseSelections) this.root.trueFalseSelections = {};
        const results = [];
        for (let i = 0; i < 6; i++) {
            const option = this.root.currentQuestion.secenekler[i];
            if (!option) continue;
            const userSelection = this.root.trueFalseSelections[i];
            let correctAnswer;
            if (typeof option === 'object' && option.dogru_mu) correctAnswer = (option.dogru_mu === 'D'); else continue;
            let isCorrect = false;
            let userAnswer = null;
            if (userSelection === true) { userAnswer = true; isCorrect = (correctAnswer === true); }
            else if (userSelection === false) { userAnswer = false; isCorrect = (correctAnswer === false); }

            if(userAnswer == null) userAnswer = !correctAnswer;
            results.push({ index: i, playerAnswer : userAnswer, correctAnswer, isCorrect, wasAnswered: userSelection !== undefined });
            const stageItem = document.querySelector(`[data-option="${i}"]`);
            if (stageItem) {
                stageItem.classList.remove('correct', 'wrong', 'selected');
                if (userSelection !== undefined) stageItem.classList.add(isCorrect ? 'correct' : 'wrong');
            }
        }
        console.log(`[WEB] RightWrongControl : showStage2Result : answered=${results.filter(r=>r.wasAnswered).length},correct=${results.filter(r=>r.isCorrect).length}`);


        this.root.sendToWall('showStage2Result', { results });

        const answeredCount = results.filter(r => r.wasAnswered).length;
        const correctCount = results.filter(r => r.isCorrect).length;
        const totalOptions = 6;
        if (answeredCount === totalOptions) {
            this.root.stopTimer();
            this.root.questionLocked = true;
            // All options answered or partial result - notification removed
        } else {
            // Partial result showing - notification removed
        }
    }

    stage2TimeUp() {
        this.root.stopTimer();
        this.root.questionLocked = true;
        // Stage 2 time up - notification removed
    }
}


