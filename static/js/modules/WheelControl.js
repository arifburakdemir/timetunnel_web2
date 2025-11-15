export class WheelControl {
    constructor(root) {
        this.root = root;
    }

    async spinWheel() {
        console.log('[WEB] WheelControl : spinWheel : Çark çevirme başlatılıyor');

        try {
            const response = await fetch('/api/wheel-spin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stage: this.root.currentStage, user_id: 'reji' })
            });
            
            const result = await response.json();
            if (result.success) {
                this.root.wheelResult = result.result;
                document.getElementById('wheel-result').textContent = `Tarih: ${result.result}`;
                document.getElementById('get-question-btn').style.display = 'block';
                // Wheel spun successfully - notification removed

                console.log('[WEB] WheelControl : spinWheel : Unity aktif - Unity çarkı kullanılıyor');
                this.root.sendToWall('spinUnityWheel', {
                    result: result.result,
                    stage: this.root.currentStage,
                    targetDate: result.result,
                    spinId: result.spin_id
                });
            }

        } catch (error) {
            console.error('[WEB] Çark çevirme hatası:', error);
        }
    }

    // Aktif etaba göre çark getir
    bringActiveStageWheel() {
        
        var delay = 0;
        console.log("Stage Showed : " + this.root.stageShowed);
        if(this.root.stageShowed)
            delay = 1.5;

        if (this.currentStage === 0) {
            this.showNotification('Lütfen önce bir etap başlatın', 'warning');
            return;
        }
        
        // Çarkı Çevir butonunu etkinleştir
        const spinWheelBtn = document.getElementById('spin-wheel-btn');
        if (spinWheelBtn) {
            spinWheelBtn.disabled = false;
        }
        
        const stageIndex = this.root.currentStage - 1;
        this.bringWheelToFront(stageIndex, delay);
        // Removed non-error notification
    }

    bringWheelToFront(wheelType, delay) {
        const stageNumber = wheelType + 1;
        // Wheel brought to front - notification removed
        this.root.sendToWall('showUnityWheel', { wheelType ,delay});
    }

}


