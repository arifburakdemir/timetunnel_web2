export class BackgroundControl {
    constructor(root) {
        this.root = root;
        this.useBackground = true;
        this.backgroundColor = '#ffffff';
        this.initialize();
    }

    initialize() {
        // Set default values when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupEventListeners();
                this.sendInitialSettings();
            });
        } else {
            this.setupEventListeners();
            this.sendInitialSettings();
        }
    }

    setupEventListeners() {
        // Get DOM elements
        const useBackgroundCheckbox = document.getElementById('use-background-checkbox');
        const colorPickerContainer = document.getElementById('color-picker-container');
        const colorPicker = document.getElementById('background-color-picker');
        const updateButton = document.querySelector('.update-bg-btn');

        if (useBackgroundCheckbox) {
            useBackgroundCheckbox.addEventListener('change', (event) => {
                this.toggleBackgroundColorPicker(event.target.checked);
            });
        }

        if (updateButton) {
            updateButton.addEventListener('click', () => {
                this.updateBackgroundColor();
            });
        }
    }

    toggleBackgroundColorPicker(isChecked) {
        const colorPickerContainer = document.getElementById('color-picker-container');
        
        this.useBackground = isChecked;
        
        if (isChecked) {
            // Use background image
            if (colorPickerContainer) {
                colorPickerContainer.style.display = 'none';
            }
            this.sendBackgroundSettingsToWall(true, '#ffffff');
        } else {
            // Use solid color
            if (colorPickerContainer) {
                colorPickerContainer.style.display = 'block';
            }
            const colorPicker = document.getElementById('background-color-picker');
            if (colorPicker) {
                this.backgroundColor = colorPicker.value;
                this.sendBackgroundSettingsToWall(false, this.backgroundColor);
            }
        }
    }

    updateBackgroundColor() {
        const colorPicker = document.getElementById('background-color-picker');
        if (colorPicker) {
            this.backgroundColor = colorPicker.value;
            this.sendBackgroundSettingsToWall(false, this.backgroundColor);
        }
    }

    sendBackgroundSettingsToWall(useBackground, color) {
        if (window.wallRef && !window.wallRef.closed) {
            window.wallRef.postMessage({
                action: 'setColor',
                data: {
                    useBackground: useBackground,
                    colorHex: this.cleanHex(color)
                }
            }, '*');
        }
    }


    cleanHex(hex) {
        return hex
            .trim()                         // baş/son boşlukları temizle
            .replace(/ /g, "")              // normal boşlukları sil
            .replace(/\uFEFF/g, "")         // BOM karakteri
            .replace(/\u200B/g, "")         // zero-width space
            .replace(/[＃]/g, "#")           // unicode farklı # karakteri
            .toUpperCase();                 // tamamen büyük harf
    }

    sendInitialSettings() {
        // Set default values
        const useBackgroundCheckbox = document.getElementById('use-background-checkbox');
        
        if (useBackgroundCheckbox) {
            // By default, use background image (checkbox checked)
            useBackgroundCheckbox.checked = true;
            // Hide color picker container initially
            const colorPickerContainer = document.getElementById('color-picker-container');
            if (colorPickerContainer) {
                colorPickerContainer.style.display = 'none';
            }
            
            // Send initial settings to wall
            this.sendBackgroundSettingsToWall(true, '#ffffff');
        }
    }
}