# app.py
import os
import base64
import uuid
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_login import LoginManager, UserMixin, login_user, logout_user, current_user, login_required
from flask_bcrypt import Bcrypt
import json

# --- App Configuration ---
app = Flask(__name__)
app.config['SECRET_KEY'] = 'a_very_secret_key_for_production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
UPLOAD_FOLDER = os.path.join(app.static_folder, 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# --- Initializations ---
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
socketio = SocketIO(app, max_http_buffer_size=10 * 1024 * 1024) # Increase buffer for file uploads
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# --- Ensure upload folder exists ---
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# --- (Question Database remains the same) ---
QUESTIONS = [
    {"id": 0, "text": "Which movie genre could you watch forever?", "options": ["Sci-Fi", "Comedy", "Thriller/Horror", "Romance", "Documentary"]},
    {"id": 1, "text": "A perfect evening is...", "options": ["A quiet night in with a book", "Out with friends at a party", "Trying a new restaurant", "Playing video games"]},
    {"id": 2, "text": "When you're stressed, you tend to:", "options": ["Listen to music", "Exercise or go for a walk", "Talk it out with someone", "Need some alone time"]},
    {"id": 3, "text": "What's your preferred vacation style?", "options": ["Action-packed adventure", "Relaxing on a beach", "Exploring a new city", "A quiet retreat in nature"]},
    {"id": 4, "text": "What quality do you value most in others?", "options": ["Honesty", "Kindness", "Humor", "Intelligence"]},
    {"id": 5, "text": "Pick a creative outlet:", "options": ["Playing an instrument", "Cooking or baking", "Drawing or painting", "Writing"]},
    {"id": 6, "text": "Are you more of a planner or a spontaneous person?", "options": ["I plan everything", "I go with the flow", "A bit of both"]},
    {"id": 7, "text": "What's your love language for receiving affection?", "options": ["Words of Affirmation", "Acts of Service", "Receiving Gifts", "Quality Time", "Physical Touch"]},
    {"id": 8, "text": "Cats or Dogs?", "options": ["Dogs, for sure", "Cats, definitely", "Both are great!", "Neither, thanks"]},
    {"id": 9, "text": "An ideal conversation is...", "options": ["Light, funny, and full of jokes", "Deep, thoughtful, and philosophical", "An exchange of new ideas", "Comfortable and easy-going"]},
    {"id": 10, "text": "What do you do when you first wake up?", "options": ["Check my phone", "Hit the snooze button", "Meditate or stretch", "Get up immediately"]},
    {"id": 11, "text": "What is most important for your future?", "options": ["Career success", "Family and relationships", "Travel and experiences", "Personal growth"]}
]

# --- Database Models ---
matches = db.Table('matches',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('matched_user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True)
)

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    bio = db.Column(db.Text, nullable=True, default="No bio yet.")
    answers = db.Column(db.Text, nullable=True)
    is_searching = db.Column(db.Boolean, default=False)
    matched = db.relationship('User', secondary=matches,
        primaryjoin=(matches.c.user_id == id),
        secondaryjoin=(matches.c.matched_user_id == id),
        backref=db.backref('matchers', lazy='dynamic'), lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# MODIFIED: Message model to handle different types
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message_type = db.Column(db.String(10), nullable=False, default='text') # 'text', 'image', 'audio'
    content = db.Column(db.Text, nullable=False) # For text or file URL
    status = db.Column(db.String(20), default='sent')

class RevealRequest(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    receiver_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

# --- (Standard Routes like register, login, profile, etc. remain the same) ---
@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated: return redirect(url_for('home'))
    if request.method == 'POST':
        user = User.query.filter_by(email=request.form['email']).first()
        if user:
            flash('Email address already exists.')
            return redirect(url_for('register'))
        new_user = User(name=request.form['name'], email=request.form['email'])
        new_user.set_password(request.form['password'])
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! Please log in.')
        return redirect(url_for('login'))
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated: return redirect(url_for('home'))
    if request.method == 'POST':
        user = User.query.filter_by(email=request.form['email']).first()
        if user and user.check_password(request.form['password']):
            login_user(user, remember=True)
            return redirect(url_for('home'))
        else:
            flash('Invalid email or password.')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/')
@login_required
def home():
    matches = current_user.matched.all()
    return render_template('home.html', matches=matches)

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        current_user.name = request.form.get('name')
        current_user.bio = request.form.get('bio')
        db.session.commit()
        flash('Profile updated successfully.')
        return redirect(url_for('profile'))
    return render_template('profile.html', user=current_user)

@app.route('/start_matching')
@login_required
def start_matching():
    if not current_user.answers:
        return redirect(url_for('questionnaire'))
    
    waiting_user = User.query.filter(User.is_searching==True, User.id != current_user.id, User.answers != None).first()
    if waiting_user:
        current_user.matched.append(waiting_user)
        waiting_user.matched.append(current_user)
        current_user.is_searching = False
        waiting_user.is_searching = False
        db.session.commit()
        
        room_id = f"chat_{min(current_user.id, waiting_user.id)}_{max(current_user.id, waiting_user.id)}"
        socketio.emit('match_found', {'room': room_id, 'partner_id': waiting_user.id}, to=str(current_user.id))
        socketio.emit('match_found', {'room': room_id, 'partner_id': current_user.id}, to=str(waiting_user.id))
        return redirect(url_for('chat', match_id=waiting_user.id))
    else:
        current_user.is_searching = True
        db.session.commit()
        return render_template('waiting.html')

@app.route('/questionnaire')
@login_required
def questionnaire():
    return render_template('questionnaire.html', total_questions=len(QUESTIONS))

@app.route('/get_question/<int:question_id>')
@login_required
def get_question(question_id):
    if 0 <= question_id < len(QUESTIONS):
        return jsonify(QUESTIONS[question_id])
    return jsonify({"error": "Not found"}), 404

@app.route('/submit_answers', methods=['POST'])
@login_required
def submit_answers():
    data = request.json
    current_user.answers = json.dumps(data['answers'])
    db.session.commit()
    return jsonify({"status": "success"})

@app.route('/chat/<int:match_id>')
@login_required
def chat(match_id):
    match = User.query.get_or_404(match_id)
    room_id = f"chat_{min(current_user.id, match_id)}_{max(current_user.id, match_id)}"
    messages = Message.query.filter(
        ((Message.sender_id == current_user.id) & (Message.receiver_id == match_id)) |
        ((Message.sender_id == match_id) & (Message.receiver_id == current_user.id))
    ).order_by(Message.id.asc()).all()
    
    req_by_me = RevealRequest.query.filter_by(requester_id=current_user.id, receiver_id=match_id).first()
    req_by_other = RevealRequest.query.filter_by(requester_id=match_id, receiver_id=current_user.id).first()
    is_revealed = req_by_me and req_by_other

    return render_template('chat.html', match=match, room_id=room_id, messages=messages, is_revealed=is_revealed, req_by_me=req_by_me)

# --- SocketIO Events ---
@socketio.on('join')
def on_join(data):
    join_room(str(current_user.id))
    if 'room' in data:
        join_room(data['room'])
        emit('status', {'msg': f'{current_user.name} has entered the chat.'}, to=data['room'])

@socketio.on('text')
def on_text(data):
    msg = Message(sender_id=current_user.id, receiver_id=data['receiver_id'], content=data['msg'], message_type='text')
    db.session.add(msg)
    db.session.commit()
    emit('message', {'msg': msg.content, 'user': current_user.name, 'sender_id': current_user.id, 'type': 'text'}, to=data['room'])

@socketio.on('typing')
def on_typing(data):
    emit('typing', {'user': current_user.name}, to=data['room'], include_self=False)

@socketio.on('stop_typing')
def on_stop_typing(data):
    emit('stop_typing', to=data['room'], include_self=False)

@socketio.on('request_reveal')
def on_request_reveal(data):
    my_request = RevealRequest(requester_id=current_user.id, receiver_id=data['receiver_id'])
    db.session.add(my_request)
    db.session.commit()
    other_request = RevealRequest.query.filter_by(requester_id=data['receiver_id'], receiver_id=current_user.id).first()
    if other_request:
        emit('reveal_profiles', {}, to=data['room'])
    else:
        emit('reveal_requested', {'requester_name': current_user.name}, to=data['room'], include_self=False)

# --- NEW: SocketIO Events for Multimedia ---
@socketio.on('image')
def on_image(data):
    try:
        # Decode the Base64 string
        image_data = base64.b64decode(data['image_data'].split(',')[1])
        filename = f"{uuid.uuid4()}.png"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        with open(filepath, 'wb') as f:
            f.write(image_data)
        
        file_url = url_for('static', filename=f'uploads/{filename}')
        
        # Save to database
        msg = Message(sender_id=current_user.id, receiver_id=data['receiver_id'], content=file_url, message_type='image')
        db.session.add(msg)
        db.session.commit()
        
        emit('message', {'msg': file_url, 'user': current_user.name, 'sender_id': current_user.id, 'type': 'image'}, to=data['room'])
    except Exception as e:
        print(f"Error handling image: {e}")

@socketio.on('audio')
def on_audio(data):
    try:
        audio_data = base64.b64decode(data['audio_data'].split(',')[1])
        filename = f"{uuid.uuid4()}.webm"
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        with open(filepath, 'wb') as f:
            f.write(audio_data)
            
        file_url = url_for('static', filename=f'uploads/{filename}')
        
        msg = Message(sender_id=current_user.id, receiver_id=data['receiver_id'], content=file_url, message_type='audio')
        db.session.add(msg)
        db.session.commit()
        
        emit('message', {'msg': file_url, 'user': current_user.name, 'sender_id': current_user.id, 'type': 'audio'}, to=data['room'])
    except Exception as e:
        print(f"Error handling audio: {e}")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    socketio.run(app, debug=True)
