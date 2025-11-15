export class QuestionControl {
    constructor(root) {
        this.root = root;
        // Global reference
        window.rejiController = this.root;
        this.setupOpenWall();
    }

    async init() {
        await this.root.loadContestants();
        this.root.updateStageDisplay();
        this.root.updateUnityStatusIndicator(window.unityReady);
        const nameInput = document.getElementById('contestant-name');
        if (nameInput) {
            nameInput.setAttribute('tabindex', '0');
            setTimeout(() => { nameInput.focus(); }, 500);
        }
    }

    setupOpenWall() {
        const bind = () => {
            var openWallBtn = document.getElementById('open-wall-btn');
            if (openWallBtn && !openWallBtn.dataset.bound) {
                openWallBtn.addEventListener('click', function () {
                    window.wallRef = window.open('http://127.0.0.1:5000/wall', 'wallScreen');
                });
                openWallBtn.dataset.bound = 'true';
            }
        };
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', bind);
        } else {
            bind();
        }
    }


    async loadQuestionForDate() {
        if (this.root.currentStage === 0) {
            this.root.showNotification('Önce bir etap başlatın', 'error');
            return;
        }
        if (!this.root.wheelResult) {
            this.root.showNotification('Önce çarkı çevirin', 'error');
            return;
        }
        try {
            const response = await fetch(`/api/questions/${this.root.currentStage}/${this.root.wheelResult}`);
            const result = await response.json();
            if (result.success) {
                console.log(`[WEB] QuestionControl : loadQuestionForDate : stage=${this.root.currentStage},date=${this.root.wheelResult},id=${result.question?.id}`);
                const question = result.question;
                this.sendToWall('hideUnityWheel', {});
                this.processQuestionData(question);
                this.displayQuestion();
                
                // Question-controls bölümünü göster
                const questionControls = document.getElementById('question-controls');
                if (questionControls) {
                    questionControls.style.display = 'block';
                }
                
                // Çarkı Çevir butonunu devre dışı bırak
                const spinWheelBtn = document.getElementById('spin-wheel-btn');
                if (spinWheelBtn) {
                    spinWheelBtn.disabled = true;
                }
                
                // Question loaded successfully - notification removed
                document.getElementById('get-question-btn').style.display = 'none';
            } else {
                this.root.showNotification(result.error, 'error');
            }
        } catch (error) {
            console.error(`[WEB] QuestionControl : loadQuestionForDate : Hata : error=${error}`);
            this.root.showNotification('Tarihli soru yüklenirken hata oluştu', 'error');
        }
    }

    processQuestionData(question) {
        if (this.root.currentStage === 1) {
            this.root.currentQuestion = {
                id: question.id,
                text: question.soru_metni,
                options: [question.secenek_a, question.secenek_b, question.secenek_c, question.secenek_d],
                correct: question.dogru_cevap === 'A' ? 0 : question.dogru_cevap === 'B' ? 1 : question.dogru_cevap === 'C' ? 2 : 3,
                points: question.puan,
                hint: question.ipucu,
                tarih: question.tarih
            };
        } else if (this.root.currentStage === 2) {
            this.root.currentQuestion = {
                id: question.id,
                soru_metni: question.soru_metni,
                text: question.soru_metni,
                secenekler: question.secenekler || [],
                correct: 0,
                puan: question.puan,
                points: question.puan,
                ipucu: question.ipucu,
                hint: question.ipucu,
                tarih: question.tarih
            };
            this.root.resetStage2Options();
        } else if (this.root.currentStage === 3) {
            this.root.currentQuestion = {
                id: question.id,
                soru_metni: question.soru_metni,
                text: question.soru_metni,
                secenek_a: question.secenek_a,
                secenek_b: question.secenek_b,
                secenek_c: question.secenek_c,
                secenek_d: question.secenek_d,
                secenek_e: question.secenek_e,
                secenek_f: question.secenek_f,
                secenek_g: question.secenek_g,
                correct: question.dogru_cevap === 'A' ? 0 :
                         question.dogru_cevap === 'B' ? 1 :
                         question.dogru_cevap === 'C' ? 2 :
                         question.dogru_cevap === 'D' ? 3 :
                         question.dogru_cevap === 'E' ? 4 :
                         question.dogru_cevap === 'F' ? 5 : 6,
                puan: question.puan,
                points: question.puan,
                ipucu: question.ipucu,
                hint: question.ipucu,
                tarih: question.tarih
            };
        }
    }

    displayQuestion() {
        if (!this.root.currentQuestion) return;
        document.getElementById('current-question').textContent = this.root.currentQuestion.text;
        const questionInfo = `Soru #${this.root.currentQuestion.id || '?'} - ${this.root.currentQuestion.points || 0} puan`;
        document.getElementById('question-info').textContent = questionInfo;

        if (this.root.currentQuestion.hint) {
            document.getElementById('hint-text').textContent = this.root.currentQuestion.hint;
            document.getElementById('question-hint').style.display = 'block';
        } else {
            document.getElementById('question-hint').style.display = 'none';
        }

        const stage1Options = document.getElementById('question-options');
        const stage2Options = document.getElementById('stage2-options');
        const stage3Options = document.getElementById('stage3-options');

        this.root.stageShowed = false;
        // Reset isTimeOut flag when displaying a new question
        this.root.isTimeOut = false;

        if (this.root.currentStage === 2) {
            stage1Options.style.display = 'none';
            stage2Options.style.display = 'block';

            this.root.trueFalseSelections = {};

            for (let i = 0; i < 6; i++) {
                const optionText = document.getElementById(`option-text-${i}`);
                const indicator = document.getElementById(`tf-indicator-${i}`);
                if (this.root.currentQuestion.secenekler && this.root.currentQuestion.secenekler[i]) {
                    const optionData = this.root.currentQuestion.secenekler[i];
                    const displayText = typeof optionData === 'string' ? optionData : optionData.metin;
                    optionText.textContent = displayText;
                    indicator.textContent = '';
                    indicator.className = 'tf-indicator';
                } else {
                    optionText.textContent = `Seçenek ${String.fromCharCode(65 + i)}`;
                    indicator.textContent = '';
                    indicator.className = 'tf-indicator';
                }
            }

            this.root.trueFalseSelections = {};
            document.querySelectorAll('.tf-btn').forEach(btn => btn.classList.remove('selected'));
            document.querySelectorAll('.stage2-item').forEach(item => item.classList.remove('correct', 'wrong'));

            this.root.resetStage2Options();
            this.root.stage2SelectedOption = null;
            this.root.stage3SelectedOption = null;

            // Set selectedOption to -1 for every 2nd stage question display
            this.root.selectedOption = -1;

            const wallOptions = this.root.currentQuestion.secenekler ? this.root.currentQuestion.secenekler.map(option => (typeof option === 'string' ? option : option.metin)) : [];

            //{"question":"......","statements":["......","......","......","......","......","......"]}
            
            setTimeout(() => {
                this.sendToWall('showStage2Question', {
                    question: this.root.currentQuestion.soru_metni || this.root.currentQuestion.text,
                    statements: wallOptions,
                    correct: this.root.currentQuestion.correct,
                    points: this.root.currentQuestion.puan || this.root.currentQuestion.points,
                    countDown: 10
                });
            }, 2000);


        } else if (this.root.currentStage === 3) {
            stage1Options.style.display = 'none';
            stage2Options.style.display = 'none';
            stage3Options.style.display = 'block';

            for (let i = 0; i < 7; i++) {
                const optionText = document.getElementById(`stage3-option-text-${i}`);
                if (optionText) {
                    const options = [
                        this.root.currentQuestion.secenek_a,
                        this.root.currentQuestion.secenek_b,
                        this.root.currentQuestion.secenek_c,
                        this.root.currentQuestion.secenek_d,
                        this.root.currentQuestion.secenek_e,
                        this.root.currentQuestion.secenek_f,
                        this.root.currentQuestion.secenek_g
                    ];
                    optionText.textContent = options[i] || `Seçenek ${String.fromCharCode(65 + i)}`;
                }
            }

            this.root.selectedOption = -1;
            this.root.stage3PlayerSelections = {};
            document.querySelectorAll('.stage3-item').forEach(item => item.classList.remove('correct', 'wrong', 'selected', 'disabled'));

            this.root.prepareStage3Finalists();

            const wall3Options = [
                this.root.currentQuestion.secenek_a,
                this.root.currentQuestion.secenek_b,
                this.root.currentQuestion.secenek_c,
                this.root.currentQuestion.secenek_d,
                this.root.currentQuestion.secenek_e,
                this.root.currentQuestion.secenek_f,
                this.root.currentQuestion.secenek_g
            ];

            setTimeout(() => {
                this.sendToWall('showStage3Question', {
                    text: this.root.currentQuestion.soru_metni || this.root.currentQuestion.text,
                    options: wall3Options,
                    contestants: this.root.contestants,
                    curPlayerIndex : this.root.stage3CurrentPlayer
                });
            }, 2000);
        } else {
            stage1Options.style.display = 'grid';
            stage2Options.style.display = 'none';
            const stage3 = document.getElementById('stage3-options');
            if (stage3) stage3.style.display = 'none';
            const optionsContainer = document.getElementById('question-options');
            optionsContainer.innerHTML = '';
            this.root.currentQuestion.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.textContent = `${String.fromCharCode(65 + index)}) ${option}`;
                button.onclick = () => this.selectOption(index);
                optionsContainer.appendChild(button);
            });
            setTimeout(() => {
                this.sendToWall('showQuestion', { question: this.root.currentQuestion.text, answers: this.root.currentQuestion.options, countDown: 25 });
            }, 2000);
        }

        // For stages other than 2, set selectedOption to -1 (not null)
        if (this.root.currentStage !== 2) {
            this.root.selectedOption = -1;
        }
    }

    selectOption(optionIndex) {
        
        document.querySelectorAll('.option-btn').forEach(btn => btn.classList.remove('selected'));
        document.querySelectorAll('.option-btn')[optionIndex].classList.add('selected');
        this.root.selectedOption = optionIndex;
        //this.sendToWall('selectOption', { option: optionIndex });
        const optionLetter = String.fromCharCode(65 + optionIndex);
        console.log(`[WEB] QuestionControl : selectOption : option=${optionIndex}(${optionLetter})`);
        
            this.lockAnswerAt();
    }


    lockAnswerAt() {
        // Seçili şık olmalı - now checking for -1 instead of null
        if (this.root.selectedOption === -1) {
            this.root.showNotification('Önce bir şık seçin', 'error');
            return;
        }
        
        // Görsel olarak kilitli olduğunu göster
        const lockBtn = document.querySelector('.lock-btn');
        if (lockBtn) {
            lockBtn.textContent = 'Soru Kilitli';
            lockBtn.disabled = true;
            lockBtn.style.opacity = '0.6';
        }
        
        // Butonları devre dışı bırak (Stage 1 dışında)
        if (this.root.currentStage !== 1) {
            document.querySelectorAll('.option-btn, .tf-btn').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = '0.6';
            });
        }
        
        const optionLetter = String.fromCharCode(65 + this.root.selectedOption);
        // Question locked successfully - notification removed
        console.log(`[WEB] QuestionControl : lockAnswerAt : Seçili şık kilitlendi - option=${this.root.selectedOption}(${optionLetter})`);
        
        // Wall'a kilitleme bilgisini seçili şık index'i ile gönder
        this.sendToWall('lockAnswerAt', { optionIndex: this.root.selectedOption });
    }

    showResult() {
        if (this.root.currentStage === 2) this.root.showStage2Result();
        else if (this.root.currentStage === 3) this.root.showStage3Result();
        else this.showStage1Result();
    }

    showStage1Result() {
        // Removed the check for selectedOption to allow showing results even if no option is selected
        
        // If no option is selected, use -1 as the selected option
        const selectedOption = this.root.selectedOption !== -1 ? this.root.selectedOption : -1;
        const isCorrect = selectedOption === this.root.currentQuestion.correct;
        const resultText = isCorrect ? 'DOĞRU!' : 'YANLIŞ!';
        const correctAnswer = String.fromCharCode(65 + this.root.currentQuestion.correct);
        const points = this.root.currentQuestion.points || 0;
        console.log(`[WEB] QuestionControl : showStage1Result : selected=${selectedOption},correct=${this.root.currentQuestion.correct},isCorrect=${isCorrect}`);
        // Removed result notification - users can see the visual feedback
        document.querySelectorAll('.option-btn').forEach((btn, index) => {
            btn.classList.remove('selected', 'correct', 'wrong');
            btn.style.background = '';
            btn.style.color = '';
            if (index === this.root.currentQuestion.correct) btn.classList.add('correct');
            else if (index === selectedOption) btn.classList.add('wrong');
        });
        // Send -1 if no option was selected
        this.sendToWall('showResult', { selectedAnswer: selectedOption, correctAnswer: this.root.currentQuestion.correct });
        if (isCorrect && this.root.contestants.length > 0) {
            // Contestant selection prompt removed
        }
    }

    nextQuestion() {
        // Sadece soruları gizle
        if (this.root.currentStage === 2) this.sendToWall('hideStage2Question', {});
        else if (this.root.currentStage === 3) this.sendToWall('hideStage3Question', {});
        else this.sendToWall('hideQuestion', {});

        // Question-controls bölümünü gizle
        const questionControls = document.getElementById('question-controls');
        if (questionControls) {
            questionControls.style.display = 'none';
        }
        
        // Soruyu getir butonunu gizle - wheel result'ı da temizle
        const getQuestionBtn = document.getElementById('get-question-btn');
        if (getQuestionBtn) {
            getQuestionBtn.style.display = 'none';
        }
        
        // Wheel result'ı temizle ki buton tekrar görünmesin
        this.root.wheelResult = null;
        document.getElementById('wheel-result').textContent = 'Sonuç: -';
        
        // Lock butonunu sıfırla
        const lockBtn = document.querySelector('.lock-btn');
        if (lockBtn) {
            lockBtn.textContent = 'Soruyu Kitle';
            lockBtn.disabled = false;
            lockBtn.style.opacity = '1';
        }
        
        // Butonları yeniden etkinleştir
        document.querySelectorAll('.option-btn, .tf-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
        });

        // Question hidden - notification removed
    }


    sendToWall(action, data) {
        window.wallRef?.postMessage({ action, data }, '*');
    }

    handleUnityGameState(data) {
        if (data.wheelState) this.handleUnityWheelState(data.wheelState);
        if (data.questionState) this.handleUnityQuestionState(data.questionState);
    }

    handleUnityWheelState(wheelState) {
        if (wheelState.isSpinning) {
            // Unity wheel spinning - notification removed
        } else if (wheelState.result) {
            this.root.wheelResult = wheelState.result;
            document.getElementById('wheel-result').textContent = `Tarih: ${wheelState.result}`;
            // Unity wheel result - notification removed
        }
    }


    showNotification(message, type = 'info') {
        console.log(`[WEB] QuestionControl : createNotificationToast : [${type.toUpperCase()}] ${message}`);
        this.createNotificationToast(message, type);
    }

    updateUnityStatusIndicator(connected) {
        let indicator = document.querySelector('.unity-status');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'unity-status';
            document.body.appendChild(indicator);
        }
        if (connected && window.unityReady) {
            indicator.className = 'unity-status connected';
            indicator.textContent = 'Unity Bağlı';
        } else {
            indicator.className = 'unity-status disconnected';
            indicator.textContent = 'Unity Bağlı Değil';
        }
        clearTimeout(this.statusTimeout);
        indicator.style.opacity = '1';
        this.statusTimeout = setTimeout(() => { indicator.style.opacity = '0.3'; }, 5000);
    }

    createNotificationToast(message, type) {
        const existingToasts = document.querySelectorAll('.notification-toast');
        existingToasts.forEach(toast => toast.remove());
        const toast = document.createElement('div');
        toast.className = `notification-toast notification-${type}`;
        const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        toast.innerHTML = `${icon} ${message}`;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 300);
        }, 3000);
    }
}


