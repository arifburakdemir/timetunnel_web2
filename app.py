from flask import Flask, render_template, request, jsonify, redirect, url_for, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os
import json
import random
import time
import sys
import threading
import webbrowser
from functools import wraps

# Function to get the base path for resources
def get_base_path():
    """Get base path for resources, handling PyInstaller bundled apps"""
    if getattr(sys, 'frozen', False):
        # Running in a PyInstaller bundle
        base = sys._MEIPASS
        print(f"PyInstaller detected. Using _MEIPASS: {base}")
        return base
    else:
        # Running in normal Python environment
        base = os.path.dirname(os.path.abspath(__file__))
        print(f"Normal Python environment. Using __file__ directory: {base}")
        return base

# Set up Flask with proper template and static folders for PyInstaller
base_path = get_base_path()
template_folder = os.path.join(base_path, 'templates')
static_folder = os.path.join(base_path, 'static')

print(f"Base path: {base_path}")
print(f"Template folder: {template_folder}")
print(f"Static folder: {static_folder}")
print(f"Template folder exists: {os.path.exists(template_folder)}")
print(f"Static folder exists: {os.path.exists(static_folder)}")

# List contents of base path
if os.path.exists(base_path):
    print(f"Contents of base path: {os.listdir(base_path)}")

app = Flask(__name__, 
           template_folder=template_folder,
           static_folder=static_folder)

# Retry decorator for database operations
def retry_on_database_lock(max_retries=3, delay=0.1):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    # Force clean session state
                    db.session.remove()
                    return func(*args, **kwargs)
                except Exception as e:
                    if "database is locked" in str(e).lower() and attempt < max_retries - 1:
                        print(f"Database lock detected, retrying... (attempt {attempt + 1})")
                        # Comprehensive cleanup
                        try:
                            db.session.rollback()
                            db.session.remove()
                            db.session.close()
                        except:
                            pass
                        time.sleep(delay * (2 ** attempt))  # Exponential backoff
                        continue
                    # Re-raise if not a lock error or max retries reached
                    raise
            return None
        return wrapper
    return decorator

# Database configuration
app.config['SECRET_KEY'] = 'your-secret-key-here'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///timetunnel.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# SQLite-specific engine configuration to prevent locks
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
    'connect_args': {
        'timeout': 30,
        'check_same_thread': False
    }
}

db = SQLAlchemy(app)

# Database Models
class WheelSpin(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    result = db.Column(db.String(100), nullable=False)
    user_id = db.Column(db.String(50))


class Contestant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, default=0)
    eliminated = db.Column(db.Boolean, default=False)
    active = db.Column(db.Boolean, default=True)
    photo = db.Column(db.Text)  # Base64 fotoğraf verisi

class GameState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    current_stage = db.Column(db.Integer, default=0)
    current_question_id = db.Column(db.Integer, default=0)
    used_questions = db.Column(db.Text, default='[]')  # JSON array of used question IDs
    stage2_option_states = db.Column(db.Text, default='{}')  # JSON object for stage 2 option states
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Routes
@app.route('/')
def index():
    return redirect(url_for('wall'))

@app.route('/wall')
def wall():
    return render_template('wall.html')

@app.route('/reji')
def reji():
    print(f"\n=== REJI ROUTE DEBUG ===")
    print(f"App template folder: {app.template_folder}")
    print(f"Template folder exists: {os.path.exists(app.template_folder) if app.template_folder else 'None'}")
    if app.template_folder and os.path.exists(app.template_folder):
        print(f"Templates available: {os.listdir(app.template_folder)}")
    print(f"Looking for reji.html in: {app.template_folder}")
    reji_template_path = os.path.join(app.template_folder, 'reji.html') if app.template_folder else None
    if reji_template_path:
        print(f"Full reji.html path: {reji_template_path}")
        print(f"reji.html exists: {os.path.exists(reji_template_path)}")
    print(f"=== END DEBUG ===")
    
    contestants = Contestant.query.all()
    return render_template('reji.html', contestants=contestants)




# Static file routes for Build and TemplateData
@app.route('/Build/<path:filename>')
def build_files(filename):
    build_path = os.path.join(base_path, 'build')  # Changed from 'Build' to 'build'
    print(f"\n=== BUILD FILE REQUEST ===")
    print(f"Requested file: {filename}")
    print(f"Build path: {build_path}")
    print(f"Build path exists: {os.path.exists(build_path)}")
    if os.path.exists(build_path):
        print(f"Files in Build: {os.listdir(build_path)}")
    full_file_path = os.path.join(build_path, filename)
    print(f"Full file path: {full_file_path}")
    print(f"File exists: {os.path.exists(full_file_path)}")
    print(f"=== END BUILD REQUEST ===")
    return send_from_directory(build_path, filename)

@app.route('/TemplateData/<path:filename>')
def template_data_files(filename):
    template_data_path = os.path.join(base_path, 'TemplateData')
    print(f"\n=== TEMPLATE DATA REQUEST ===")
    print(f"Requested file: {filename}")
    print(f"TemplateData path: {template_data_path}")
    print(f"TemplateData path exists: {os.path.exists(template_data_path)}")
    if os.path.exists(template_data_path):
        print(f"Files in TemplateData: {os.listdir(template_data_path)}")
    print(f"=== END TEMPLATE DATA REQUEST ===")
    return send_from_directory(template_data_path, filename)



# API Routes
@app.route('/api/contestants', methods=['GET', 'POST'])
def contestants():
    if request.method == 'POST':
        data = request.get_json()
        name = data.get('name')
        photo = data.get('photo')  # Base64 fotoğraf verisi
        if name:
            try:
                contestant = Contestant(name=name, photo=photo)
                db.session.add(contestant)
                db.session.commit()
                return jsonify({'success': True, 'id': contestant.id})
            except Exception as e:
                db.session.rollback()
                print(f"Contestant creation error: {e}")
                return jsonify({'success': False, 'error': f'Veritabanı hatası: {str(e)}'})
        return jsonify({'success': False, 'error': 'Name required'})
    else:
        try:
            contestants_list = Contestant.query.all()
            return jsonify([{
                'id': c.id,
                'name': c.name,
                'score': c.score,
                'eliminated': c.eliminated,
                'active': c.active,
                'photo': getattr(c, 'photo', None)  # photo kolonu yoksa None döndür
            } for c in contestants_list])
        except Exception as e:
            print(f"Contestants list error: {e}")
            if "no such column" in str(e).lower():
                return jsonify({
                    'error': 'Veritabanı şema hatası. Lütfen uygulamayı yeniden başlatın.',
                    'schema_error': True
                }), 500
            return jsonify({'error': f'Veritabanı hatası: {str(e)}'}), 500

@app.route('/api/contestants/<int:contestant_id>/score', methods=['POST'])
def update_score(contestant_id):
    data = request.get_json()
    points = data.get('points', 0)
    contestant = Contestant.query.get_or_404(contestant_id)
    contestant.score += points
    db.session.commit()
    return jsonify({'success': True, 'new_score': contestant.score})

@app.route('/api/contestants/<int:contestant_id>/eliminate', methods=['POST'])
def eliminate_contestant(contestant_id):
    contestant = Contestant.query.get_or_404(contestant_id)
    contestant.eliminated = True
    contestant.active = False
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/contestants/<int:contestant_id>', methods=['DELETE'])
def delete_contestant(contestant_id):
    """Yarışmacıyı tamamen sil"""
    try:
        contestant = Contestant.query.get_or_404(contestant_id)
        contestant_name = contestant.name  # Silmeden önce adını sakla
        
        db.session.delete(contestant)
        db.session.commit()
        
        return jsonify({
            'success': True, 
            'message': f'{contestant_name} başarıyla silindi',
            'deleted_id': contestant_id
        })
    except Exception as e:
        db.session.rollback()
        print(f"Contestant deletion error: {e}")
        return jsonify({
            'success': False, 
            'error': f'Yarışmacı silinirken hata oluştu: {str(e)}'
        }), 500

# Soru yönetimi fonksiyonları
def load_questions(stage=1):
    """JSON dosyasından soruları yükle"""
    try:
        # Use base_path for PyInstaller compatibility
        filename = os.path.join(base_path, f'etap{stage}_50soru.json')
        print(f"Soru dosyası arıyor: {filename}")
        
        if not os.path.exists(filename):
            print(f"Dosya bulunamadı: {filename}")
            return []
        
        print(f"Dosya bulundu, okunuyor: {filename}")
        with open(filename, 'r', encoding='utf-8') as f:
            questions = json.load(f)
        print(f"Toplam {len(questions)} soru yüklendi")
        return questions
    except Exception as e:
        print(f"Soru yükleme hatası: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_random_question(stage=1):
    """Rastgele bir soru getir (daha önce kullanılmamış)"""
    questions = load_questions(stage)
    if not questions:
        return None
    
    # Oyun durumunu al
    game_state = GameState.query.first()
    if not game_state:
        game_state = GameState()
        db.session.add(game_state)
        db.session.commit()
    
    # Mevcut etap bilgisini güncelle
    game_state.current_stage = stage
    
    # Kullanılmış soruları al (etap bazlı)
    used_questions_data = json.loads(game_state.used_questions) if game_state.used_questions else {}
    stage_key = f"stage_{stage}"
    used_questions = used_questions_data.get(stage_key, [])
    
    # Kullanılmamış soruları filtrele
    available_questions = [q for q in questions if q['id'] not in used_questions]
    
    if not available_questions:
        # Tüm sorular kullanıldı, listeyi sıfırla
        used_questions = []
        available_questions = questions
    
    # Rastgele soru seç
    question = random.choice(available_questions)
    
    # Kullanılmış sorular listesine ekle (etap bazlı)
    used_questions.append(question['id'])
    used_questions_data[stage_key] = used_questions
    game_state.used_questions = json.dumps(used_questions_data)
    game_state.current_question_id = question['id']
    db.session.commit()
    
    return question

@app.route('/api/questions/<int:stage>')
def get_question(stage):
    """Belirtilen etap için rastgele soru getir"""
    question = get_random_question(stage)
    if question:
        return jsonify({
            'success': True,
            'question': question
        })
    else:
        return jsonify({
            'success': False,
            'error': f'{stage}. etap için soru bulunamadı'
        })

@app.route('/api/questions/<int:stage>/<date>')
def get_question_by_date(stage, date):
    """Belirtilen tarihe ait soru getir"""
    questions = load_questions(stage)
    if not questions:
        return jsonify({
            'success': False,
            'error': f'{stage}. etap için soru dosyası bulunamadı'
        })
    
    # Tarihe göre soru ara
    matching_questions = [q for q in questions if q['tarih'] == date]
    
    if not matching_questions:
        return jsonify({
            'success': False,
            'error': f'{date} tarihine ait soru bulunamadı'
        })
    
    # Eğer birden fazla soru varsa rastgele seç
    question = random.choice(matching_questions)
    
    return jsonify({
        'success': True,
        'question': question,
        'date': date
    })

@app.route('/api/wheel-spin', methods=['POST'])
@retry_on_database_lock(max_retries=3, delay=0.1)
def wheel_spin():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'JSON verisi alınamadı'}), 400
        
        stage = data.get('stage', 1)
        user_id = data.get('user_id', 'anonymous')
        
        # Tek transaction içinde her şeyi yap
        game_state = GameState.query.first()
        if not game_state:
            game_state = GameState()
            db.session.add(game_state)
        game_state.current_stage = stage
        
        # JSON dosyasından rastgele tarih al
        questions = load_questions(stage)
        if questions:
            random_question = random.choice(questions)
            result = random_question['tarih']
        else:
            result = f'{stage}. Etap Test Sonucu'
        
        # Aynı transaction'da wheel spin ekle
        new_spin = WheelSpin(result=result, user_id=user_id)
        db.session.add(new_spin)
        
        # Tek commit
        db.session.commit()
        
        return jsonify({'success': True, 'spin_id': new_spin.id, 'result': result, 'stage': stage})
    
    except Exception as e:
        db.session.rollback()  # Hata durumunda rollback
        print(f"Wheel spin hatası: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/reset-game', methods=['POST'])
def reset_game():
    """Oyunu tamamen sıfırla - tüm yarışmacıları ve oyun durumunu sil"""
    try:
        # Tüm yarışmacıları sil
        Contestant.query.delete()
        
        # Oyun durumunu sıfırla
        GameState.query.delete()
        
        # Çark sonuçlarını sil (isteğe bağlı)
        WheelSpin.query.delete()
        
        # Değişiklikleri kaydet
        db.session.commit()
        
        return jsonify({'success': True, 'message': 'Oyun tamamen sıfırlandı'})
    except Exception as e:
        db.session.rollback()
        print(f"Oyun sıfırlama hatası: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/stage2/option-state', methods=['GET', 'POST'])
def stage2_option_state():
    """2. etap şık durumlarını al/güncelle"""
    game_state = GameState.query.first()
    if not game_state:
        game_state = GameState()
        db.session.add(game_state)
        db.session.commit()
    
    if request.method == 'POST':
        data = request.get_json()
        option_index = data.get('optionIndex')
        state = data.get('state')  # 'D', 'Y', veya 'def'
        
        if option_index is None or state is None:
            return jsonify({'success': False, 'error': 'optionIndex ve state gerekli'})
        
        # Mevcut durumları al
        option_states = json.loads(game_state.stage2_option_states) if game_state.stage2_option_states else {}
        
        # Durumu güncelle
        option_states[str(option_index)] = state
        
        # Veritabanına kaydet
        game_state.stage2_option_states = json.dumps(option_states)
        db.session.commit()
        
        return jsonify({'success': True, 'optionIndex': option_index, 'state': state})
    
    else:
        # GET - Mevcut durumları getir
        option_states = json.loads(game_state.stage2_option_states) if game_state.stage2_option_states else {}
        return jsonify({'success': True, 'optionStates': option_states})

@app.route('/api/stage2/reset-options', methods=['POST'])
def reset_stage2_options():
    """2. etap şık durumlarını sıfırla"""
    game_state = GameState.query.first()
    if not game_state:
        game_state = GameState()
        db.session.add(game_state)
        db.session.commit()  # Commit the new GameState first
    
    game_state.stage2_option_states = '{}'
    db.session.commit()
    
    return jsonify({'success': True, 'message': '2. etap şık durumları sıfırlandı'})


def open_browser():
    """Automatically open browser to Reji panel"""
    time.sleep(1.5)  # Wait for Flask to start
    webbrowser.open('http://127.0.0.1:5000/reji')

if __name__ == '__main__':
    with app.app_context():
        try:
            # Force clean startup state
            try:
                db.session.remove()
                db.session.close()
            except:
                pass
            
            # Test veritabanı bağlantısı ve şema uyumlu olup olmadığını kontrol et
            db.create_all()
            
            # Contestant tablosunun photo kolonu olup olmadığını test et
            try:
                test_query = db.session.execute(db.text("SELECT photo FROM contestant LIMIT 1"))
                test_query.close()  # CRITICAL: Close the query result
                db.session.commit()  # CRITICAL: Commit the transaction
                print("Veritabanı şeması güncel!")
            except Exception as schema_error:
                if ("no such column: contestant.photo" in str(schema_error).lower() or 
                    "no such column: photo" in str(schema_error).lower() or
                    ("no such column" in str(schema_error).lower() and "photo" in str(schema_error).lower())):
                    print("\n⚠️  VERITABANI ŞEMA HATASI TESPİT EDİLDİ!")
                    print(f"Hata: {schema_error}")
                    print("Photo kolonu mevcut değil. Veritabanı yeniden oluşturuluyor...")
                    
                    # Veritabanı dosyasını sil ve yeniden oluştur
                    import os
                    
                    # Olası veritabanı dosya yolları
                    db_paths = [
                        'instance/timetunnel.db',
                        'timetunnel.db',
                        'instance/timetunnel.sqlite',
                        'timetunnel.sqlite'
                    ]
                    
                    for db_path in db_paths:
                        if os.path.exists(db_path):
                            try:
                                os.remove(db_path)
                                print(f"✅ Eski veritabanı dosyası silindi: {db_path}")
                            except Exception as delete_error:
                                print(f"❌ Silinirken hata: {db_path} - {delete_error}")
                    
                    # Session'ı kapat ve yeni veritabanını oluştur
                    try:
                        db.session.rollback()  # Rollback any pending transactions
                        db.session.close()
                        db.session.remove()
                    except:
                        pass
                    
                    # Yeni veritabanını oluştur
                    db.drop_all()
                    db.create_all()
                    print("✅ Yeni veritabanı başarıyla oluşturuldu!")
                    print("ℹ️  Not: Tüm eski veriler silindi. Yarışmacıları yeniden eklemeniz gerekiyor.")
                else:
                    # Başka bir veritabanı hatası
                    print(f"❌ Beklenmeyen veritabanı hatası: {schema_error}")
                    raise
            
            print("Veritabanı hazır!")
            print("🚀 Reji Paneli otomatik olarak açılacak...")
            
            # Only open browser when running as executable (PyInstaller)
            if getattr(sys, 'frozen', False):
                # Start browser opening in a separate thread
                threading.Timer(1.5, open_browser).start()
            
        except Exception as e:
            print(f"❌ Veritabanı başlatma hatası: {e}")
            print("Uygulama başlatılamadı. Lütfen veritabanı ayarlarını kontrol edin.")
            sys.exit(1)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
