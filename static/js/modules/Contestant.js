export class Contestant {
    constructor(root) {
        this.root = root;
        this.selectedPhotoBase64 = null;
        this.initPhotoUpload();
    }

    initPhotoUpload() {
        // Fotoğraf yükleme event listener'larını ekle
        document.addEventListener('DOMContentLoaded', () => {
            const photoInput = document.getElementById('contestant-photo');
            if (photoInput) {
                photoInput.addEventListener('change', (e) => this.handlePhotoSelect(e));
            }
        });
        
        // Sayfa yüklenmişse hemen bağla
        const photoInput = document.getElementById('contestant-photo');
        if (photoInput) {
            photoInput.addEventListener('change', (e) => this.handlePhotoSelect(e));
        }
    }

    handlePhotoSelect(event) {
        const file = event.target.files[0];
        if (!file) {
            this.clearPhotoPreview();
            return;
        }

        // Dosya boyutu kontrolü (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.root.showNotification('Fotoğraf boyutu 5MB\'dan küçük olmalıdır', 'error');
            this.clearPhotoPreview();
            return;
        }

        // Dosya tipini kontrol et
        if (!file.type.startsWith('image/')) {
            this.root.showNotification('Lütfen sadece resim dosyaları seçin', 'error');
            this.clearPhotoPreview();
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.selectedPhotoBase64 = e.target.result;
            this.showPhotoPreview(e.target.result);
        };
        reader.onerror = () => {
            this.root.showNotification('Fotoğraf okuma hatası', 'error');
            this.clearPhotoPreview();
        };
        reader.readAsDataURL(file);
    }

    showPhotoPreview(base64Data) {
        const preview = document.getElementById('photo-preview');
        const previewImage = document.getElementById('preview-image');
        
        if (preview && previewImage) {
            previewImage.src = base64Data;
            preview.style.display = 'block';
        }
    }

    clearPhotoPreview() {
        const preview = document.getElementById('photo-preview');
        const previewImage = document.getElementById('preview-image');
        const photoInput = document.getElementById('contestant-photo');
        
        if (preview) preview.style.display = 'none';
        if (previewImage) previewImage.src = '';
        if (photoInput) photoInput.value = '';
        this.selectedPhotoBase64 = null;
    }

    async addContestant() {
        const nameInput = document.getElementById('contestant-name');
        if (!nameInput) {
            console.error('[WEB] Contestant : addContestant : Hata : input=contestant-name bulunamadı');
            return;
        }

        const name = nameInput.value.trim();

        if (!name) {
            this.root.showNotification('Lütfen yarışmacı adı girin', 'error');
            nameInput.focus();
            return;
        }

        try {
            console.log(`[WEB] Contestant : addContestant : name=${name}`);
            
            // Yarışmacı verisini hazırla
            const contestantData = {
                name: name,
                photo: this.selectedPhotoBase64 // Base64 fotoğraf verisi
            };
            
            const response = await fetch('/api/contestants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(contestantData)
            });

            const result = await response.json();
            console.log(`[WEB] Contestant : addContestant : success=${result.success},id=${result.id ?? 'n/a'}`);

            if (result.success) {
                nameInput.value = '';
                this.clearPhotoPreview(); // Fotoğraf önizlemesini temizle
                await this.loadContestants();
                // Contestant added successfully - notification removed
                nameInput.focus();
            } else {
                this.root.showNotification(result.error || 'Yarışmacı eklenirken hata oluştu', 'error');
            }
        } catch (error) {
            console.error(`[WEB] Contestant : addContestant : Hata : error=${error}`);
            this.root.showNotification('Yarışmacı eklenirken hata oluştu', 'error');
        }
    }

    async loadContestants() {
        try {
            const response = await fetch('/api/contestants');
            
            if (!response.ok) {
                // HTTP hata kodu kontrolü
                const errorData = await response.json();
                if (errorData.schema_error) {
                    this.root.showNotification('Veritabanı şema hatası! Uygulama yeniden başlatılıyor...', 'error');
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                    return;
                }
                throw new Error(`HTTP ${response.status}: ${errorData.error || 'Bilinmeyen hata'}`);
            }
            
            this.root.contestants = await response.json();
            this.displayContestants();
        } catch (error) {
            console.error(`[WEB] Contestant : loadContestants : Hata : error=${error}`);
            
            // Şema hatası kontrolü
            if (error.message.includes('no such column') || error.message.includes('schema')) {
                this.root.showNotification('Veritabanı şema hatası tespit edildi. Sayfa yenileniyor...', 'error');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                this.root.showNotification('Yarışmacı listesi yüklenirken hata oluştu', 'error');
            }
        }
    }

    displayContestants() {
        const container = document.getElementById('contestants-management-list');
        const countElement = document.getElementById('contestant-count');

        if (!container) return;

        container.innerHTML = '';

        if (countElement) {
            countElement.textContent = this.root.contestants.length;
        }

        this.root.contestants.forEach(contestant => {
            const div = document.createElement('div');
            div.className = `contestant-management-item ${contestant.eliminated ? 'eliminated' : ''}`;
            
            // Fotoğraf HTML'i oluştur
            const photoHtml = contestant.photo ? 
                `<div class="contestant-photo"><img src="${contestant.photo}" alt="${contestant.name}" /></div>` : 
                '';
            
            div.innerHTML = `
                <div class="contestant-info">
                    ${photoHtml}
                    <div class="contestant-details">
                        <div class="contestant-name">${contestant.name}</div>
                        <div class="contestant-score">${contestant.score}</div>
                    </div>
                </div>
                <div class="contestant-controls">
                    <button class="point-btn" onclick="rejiController.adjustPoints(${contestant.id}, 1)">Puan Ekle</button>
                    <button class="delete-btn" onclick="rejiController.deleteContestant(${contestant.id})">Sil</button>
                    <button class="eliminate-btn" onclick="rejiController.eliminateContestant(${contestant.id})">Ele</button>
                </div>
            `;
            container.appendChild(div);
        });
    }

    async adjustPoints(contestantId, multiplier) {
        const pointAmountInput = document.getElementById('point-amount');
        const pointAmount = parseInt(pointAmountInput.value) || 0;
        // Artık multiplier kullanmıyoruz, direkt puan miktarını kullanıyoruz
        const points = pointAmount;

        const contestant = this.root.contestants.find(c => c.id == contestantId);
        if (!contestant) {
            console.error(`[WEB] Contestant : adjustPoints : Hata : contestantId=${contestantId} bulunamadı`);
            this.root.showNotification('Yarışmacı bulunamadı', 'error');
            return;
        }

        // Puan miktarı 0 ise işlem yapma
        if (points === 0) {
            this.root.showNotification('Puan miktarı 0 olamaz', 'warning');
            return;
        }

        try {
            const response = await fetch(`/api/contestants/${contestantId}/score`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points: points })
            });

            const result = await response.json();
            if (result.success) {
                await this.loadContestants();
                const action = points > 0 ? 'eklendi' : 'çıkarıldı';
                // Removed success notification for point adjustments
            }
        } catch (error) {
            console.error(`[WEB] Contestant : adjustPoints : Hata : error=${error}`);
            this.root.showNotification('Puan ayarlanırken hata oluştu', 'error');
        }
    }

    async eliminateContestant(contestantId) {
        const contestant = this.root.contestants.find(c => c.id == contestantId);
        if (!contestant) {
            console.error(`[WEB] Contestant : eliminateContestant : Hata : contestantId=${contestantId} bulunamadı`);
            this.root.showNotification('Yarışmacı bulunamadı', 'error');
            return;
        }

        if (!confirm(`${contestant.name} adlı yarışmacıyı elemek istediğinizden emin misiniz?`)) {
            return;
        }

        try {
            const response = await fetch(`/api/contestants/${contestantId}/eliminate`, { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                await this.loadContestants();
                // Contestant eliminated - notification removed
                if (window.wallRef && !window.wallRef.closed) {
                    window.wallRef.postMessage({ action: 'eliminate', data: { name: contestant.name, id: contestant.id } }, '*');
                }
            }
        } catch (error) {
            console.error(`[WEB] Contestant : eliminateContestant : Hata : error=${error}`);
            this.root.showNotification('Eleme işleminde hata oluştu', 'error');
        }
    }

    async deleteContestant(contestantId) {
        const contestant = this.root.contestants.find(c => c.id == contestantId);
        if (!contestant) {
            console.error(`[WEB] Contestant : deleteContestant : Hata : contestantId=${contestantId} bulunamadı`);
            this.root.showNotification('Yarışmacı bulunamadı', 'error');
            return;
        }

        if (!confirm(`${contestant.name} adlı yarışmacıyı tamamen silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/contestants/${contestantId}`, { method: 'DELETE' });
            const result = await response.json();
            if (result.success) {
                await this.loadContestants();
                // Removed success notification for deletion
                if (window.wallRef && !window.wallRef.closed) {
                    window.wallRef.postMessage({ action: 'delete', data: { name: contestant.name, id: contestant.id } }, '*');
                }
            } else {
                this.root.showNotification(result.error || 'Yarışmacı silinirken hata oluştu', 'error');
            }
        } catch (error) {
            console.error(`[WEB] Contestant : deleteContestant : Hata : error=${error}`);
            this.root.showNotification('Yarışmacı silinirken hata oluştu', 'error');
        }
    }
}


