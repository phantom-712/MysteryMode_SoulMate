// static/chat.js
document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.querySelector('.chat-container');
    if (!chatContainer) return;

    // --- DOM Elements & State ---
    const socket = io();
    const roomId = chatContainer.dataset.roomId;
    const receiverId = chatContainer.dataset.receiverId;
    const senderId = chatContainer.dataset.senderId;

    const messageInput = document.getElementById('message-input');
    const messageForm = document.getElementById('message-form');
    const chatBox = document.getElementById('chat-box');
    const audioOverlay = document.getElementById('audio-overlay');
    const startChatBtn = document.getElementById('start-chat-btn');
    
    // Multimedia buttons
    const emojiBtn = document.getElementById('emoji-btn');
    const emojiPickerContainer = document.getElementById('emoji-picker-container');
    const imageBtn = document.getElementById('image-btn');
    const imageInput = document.getElementById('image-input');
    const voiceBtn = document.getElementById('voice-btn');

    // Audio elements
    const sentSound = document.getElementById('message-sent-sound');
    const receivedSound = document.getElementById('message-received-sound');
    sentSound.volume = 0.5;
    receivedSound.volume = 0.5;

    // --- Audio Initialization ---
    function initializeAudio() {
        sessionStorage.setItem('audioUnlocked', 'true');
        audioOverlay.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }
    startChatBtn.addEventListener('click', initializeAudio);
    if (sessionStorage.getItem('audioUnlocked') === 'true') {
        audioOverlay.classList.add('hidden');
        chatContainer.classList.remove('hidden');
    }

    // --- SocketIO Connection ---
    socket.on('connect', () => socket.emit('join', { room: roomId }));

    // --- Receiving Messages ---
    socket.on('message', function(data) {
        const isSentByUser = data.sender_id == senderId;
        appendMessage(data, isSentByUser ? 'sent' : 'received');
        if (!isSentByUser) {
            receivedSound.currentTime = 0;
            receivedSound.play().catch(e => console.error("Error playing received sound:", e));
        }
    });

    function appendMessage(data, type) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', type);
        
        if (data.type === 'text') {
            const contentP = document.createElement('p');
            contentP.textContent = data.msg;
            messageDiv.appendChild(contentP);
        } else if (data.type === 'image') {
            const img = document.createElement('img');
            img.src = data.msg;
            img.classList.add('chat-image');
            messageDiv.appendChild(img);
        } else if (data.type === 'audio') {
            const audio = document.createElement('audio');
            audio.controls = true;
            audio.src = data.msg;
            messageDiv.appendChild(audio);
        }

        const statusSpan = document.createElement('span');
        statusSpan.classList.add('status-tick');
        statusSpan.innerHTML = '✓';
        messageDiv.appendChild(statusSpan);
        chatBox.appendChild(messageDiv);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    // --- Sending Messages ---
    messageForm.addEventListener('submit', function(e) {
        e.preventDefault();
        let msg = messageInput.value.trim();
        if (msg) {
            sentSound.currentTime = 0;
            sentSound.play().catch(e => console.error("Error playing sent sound:", e));
            socket.emit('text', { msg: msg, room: roomId, receiver_id: receiverId });
            messageInput.value = '';
        }
    });

    // --- Emoji Picker ---
    const emojiPicker = document.querySelector('emoji-picker');
    emojiBtn.addEventListener('click', () => {
        emojiPickerContainer.classList.toggle('hidden');
    });
    emojiPicker.addEventListener('emoji-click', event => {
        messageInput.value += event.detail.unicode;
    });

    // --- Image Upload ---
    imageBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', event => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                socket.emit('image', { 
                    image_data: e.target.result, 
                    room: roomId, 
                    receiver_id: receiverId 
                });
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Voice Recording ---
    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    voiceBtn.addEventListener('click', async () => {
        if (isRecording) {
            // Stop recording
            mediaRecorder.stop();
            voiceBtn.classList.remove('recording');
            isRecording = false;
        } else {
            // Start recording
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                mediaRecorder.start();
                voiceBtn.classList.add('recording');
                isRecording = true;

                mediaRecorder.addEventListener("dataavailable", event => {
                    audioChunks.push(event.data);
                });

                mediaRecorder.addEventListener("stop", () => {
                    const audioBlob = new Blob(audioChunks);
                    const reader = new FileReader();
                    reader.readAsDataURL(audioBlob);
                    reader.onloadend = function() {
                        const base64data = reader.result;
                        socket.emit('audio', { 
                            audio_data: base64data, 
                            room: roomId, 
                            receiver_id: receiverId 
                        });
                        audioChunks = [];
                    };
                    // Stop microphone track
                    stream.getTracks().forEach(track => track.stop());
                });

            } catch (err) {
                console.error("Error accessing microphone:", err);
                alert("Microphone access is required for voice messages.");
            }
        }
    });
    
    // --- (Typing Indicators and Reveal Logic remain the same) ---
    let typingTimer;
    messageInput.addEventListener('input', () => {
        clearTimeout(typingTimer);
        socket.emit('typing', { room: roomId });
        typingTimer = setTimeout(() => socket.emit('stop_typing', { room: roomId }), 2000);
    });
    socket.on('typing', data => {
        document.getElementById('typing-indicator').textContent = `${data.user} is typing...`;
        document.getElementById('typing-indicator').classList.remove('hidden');
    });
    socket.on('stop_typing', () => document.getElementById('typing-indicator').classList.add('hidden'));
    const revealBtn = document.getElementById('reveal-btn');
    if (revealBtn) {
        revealBtn.addEventListener('click', function() {
            socket.emit('request_reveal', { room: roomId, receiver_id: receiverId });
            revealBtn.disabled = true;
            revealBtn.textContent = 'Request Sent';
        });
    }
    socket.on('reveal_requested', data => {
        if(document.getElementById('reveal-status')) document.getElementById('reveal-status').textContent = `${data.requester_name} is ready to reveal!`;
    });
    socket.on('reveal_profiles', () => {
        document.querySelector('.profile-info').classList.remove('blurred');
        if (revealBtn) revealBtn.style.display = 'none';
        if(document.getElementById('reveal-status')) document.getElementById('reveal-status').textContent = 'Profiles Revealed!';
    });
});
