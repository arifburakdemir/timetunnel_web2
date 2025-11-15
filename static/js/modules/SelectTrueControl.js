export class SelectTrueControl {
    constructor(root) {
        this.root = root;
        this.isSorted = false;
    }

    prepareStage3Finalists() {

        if(this.isSorted)
            return;

        const activeContestants = this.root.contestants.filter(c => !c.eliminated);
        activeContestants.sort((a, b) => b.score - a.score);
        this.root.contestants = activeContestants.slice(0, 2);
        if (this.root.contestants.length < 2) {
            this.root.showNotification('3. etap için en az 2 yarışmacı gerekli!', 'error');
            return;
        }
        this.isSorted = true;
        
        this.root.stage3PlayerSelections = {};
        console.log('[WEB] SelectTrueControl : prepareStage3Finalists : stage3Finalists=' + JSON.stringify(this.root.contestants));
    }

    selectStage3PlayerOption(optionIndex) {
        // Check if option is disabled (was wrong in previous attempt)
        const selectedItem = document.querySelector(`.stage3-item[data-option="${optionIndex}"]`);
        
        // Allow selection even if disabled when time is out
        if (this.root.isTimeOut) {
            // During timeout, allow selecting any option
            this.root.selectedOption = optionIndex;
            this.root.sendToWall('selectStage3Option', { optionIndex});
            
            document.querySelectorAll('.stage3-item').forEach(item => {
                item.classList.remove('selected', 'disabled', 'wrong');
                // Reset opacity in case it was changed
                item.style.opacity = '1';
            });
            if (selectedItem) selectedItem.classList.add('selected');
            return;
        }
        
        // Normal behavior - don't allow selection of disabled options
        if (selectedItem && selectedItem.classList.contains('disabled')) {
            return; // Don't allow selection of disabled options
        }
        
        this.root.selectedOption = optionIndex;
        this.root.sendToWall('selectStage3Option', { optionIndex});
        
        document.querySelectorAll('.stage3-item').forEach(item => item.classList.remove('selected'));
        if (selectedItem) selectedItem.classList.add('selected');
    }

    async Stage3AddPoint() {
        
        const currentPlayerIndex = this.root.stage3CurrentPlayer;
        const currentPlayer = this.root.contestants[currentPlayerIndex];
        
        const newScore = currentPlayer.score + 10;

        console.log("Test::api/contestants::" , currentPlayer);
        try {
            // Update player's score in the database
            const response = await fetch(`/api/contestants/${currentPlayer.id}/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: 10 })
            });
            
            const result = await response.json();
            if (result.success) {
                // Update the local contestant data instead of reloading all contestants
                currentPlayer.score = newScore;
                console.log("Test::result.success::" + currentPlayer.id + "_" + newScore);
                
                // Update the display with the new score
                this.root.displayContestants();

                this.root.sendToWall('updateStage3UpdatePlayerScore', {
                    contestants: this.root.contestants
                });

            } else {
                console.error('[WEB] RejiController : handleStage3PlayerTimeOut : Failed to update score', result.error);
                this.showNotification('Puan güncellenirken hata oluştu', 'error');
            }
        } catch (error) {
            console.error('[WEB] RejiController : handleStage3PlayerTimeOut : Error updating score', error);
            this.showNotification('Puan güncellenirken hata oluştu', 'error');
        }
    }

    showStage3Result() {

         // Check if it's a timeout scenario
        if (this.root.isTimeOut) {
            // During timeout, use the selected option
            const selectedOption = this.root.selectedOption;
            if (selectedOption === undefined) {
                this.root.showNotification('Önce bir şık seçilmeli!', 'error');
                return;
            }
            const isCorrect = selectedOption === this.root.currentQuestion.correct;
            
            // Send message to wall with the selected option
            this.root.sendToWall('showStage3Result', { selectedIndex: selectedOption, isCorrect: isCorrect });
            
            // Visual feedback on reji panel for timeout
            document.querySelectorAll('.stage3-item').forEach(item => {
                item.classList.remove('selected');
            });

            if(isCorrect)
                this.Stage3AddPoint();
            
        } else 
        {
            const selectedOption = this.root.selectedOption;
            if (selectedOption === undefined) {
                this.root.showNotification('Önce bir şık seçilmeli!', 'error');
                return;
            }
            const isCorrect = selectedOption === this.root.currentQuestion.correct;

            // Visual feedback on reji panel
            const selectedItem = document.querySelector(`.stage3-item[data-option="${selectedOption}"]`);
            if (selectedItem) {
                selectedItem.classList.remove('selected');
                if (isCorrect) {
                    selectedItem.classList.add('correct');
                } else {
                    selectedItem.classList.add('wrong', 'disabled');
                }
            }

            this.root.sendToWall('showStage3Result', {selectedIndex:this.root.selectedOption,isCorrect:isCorrect});
        }
    }

    // Handle stage 3 player timeout and move to next player
    handleStage3PlayerTimeout() {

        console.log("Test::handleStage3PlayerTimeOut____________________");
        console.log("Test::Current::" + this.root.stage3CurrentPlayer);
        this.root.stage3CurrentPlayer = (this.root.stage3CurrentPlayer + 1) % this.root.contestants.length;
        console.log("Test::New::" , this.root.stage3CurrentPlayer);

        console.log('[WEB] SelectTrueControl : handleStage3PlayerTimeout : Current player timed out');
        
        // Enable pointer events on all stage3 items during timeout and remove disabled class
        document.querySelectorAll('.stage3-item').forEach(item => {
            item.classList.remove('disabled');
            item.style.pointerEvents = 'auto';
            item.style.opacity = '1';
        });
        
    }
    
}