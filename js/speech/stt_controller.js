/**
 * STT Controller managing Web Speech API and Local Whisper-tiny Web Worker
 */
export class STTController {
    constructor(options = {}) {
        this.onResult = options.onResult || (() => {});
        this.onStatus = options.onStatus || (() => {});
        this.onListeningChange = options.onListeningChange || (() => {});
        this.onError = options.onError || (() => {});

        this.engine = 'web_speech'; // 'web_speech' or 'whisper_offline'
        this.isListening = false;
        this.isSupported = false;

        // Native Web Speech
        this.recognition = null;
        this._setupWebSpeech();

        // Local Whisper Worker
        this.worker = null;
        this.workerReady = false;
        this.audioContext = null;
        this.mediaStream = null;
        this.audioProcessor = null;
        this.audioChunks = [];
    }

    _setupWebSpeech() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            this.recognition = new SpeechRec();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.onListeningChange(true);
                this.onStatus('Listening (Web Speech)...');
            };

            this.recognition.onresult = (e) => {
                const text = e.results[0][0].transcript;
                this.onResult(text);
            };

            this.recognition.onerror = (e) => {
                this.isListening = false;
                this.onListeningChange(false);
                if (e.error !== 'no-speech') {
                    this.onError(`Speech error: ${e.error}`);
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.onListeningChange(false);
            };

            this.isSupported = true;
        }
    }

    initWhisperWorker(onProgress) {
        if (this.worker) return;

        this.onStatus('Initializing offline Whisper worker...');
        this.worker = new Worker('js/speech/whisper_worker.js');

        this.worker.onmessage = (e) => {
            const { type, text, message, data, error } = e.data;

            if (type === 'status') {
                this.onStatus(message);
            } else if (type === 'progress') {
                if (onProgress && data.status === 'progress') {
                    onProgress(Math.round(data.progress || 0));
                }
            } else if (type === 'ready') {
                this.workerReady = true;
                this.engine = 'whisper_offline';
                this.onStatus('Local Whisper Ready (Offline)');
            } else if (type === 'result') {
                this.onResult(text);
                this.isListening = false;
                this.onListeningChange(false);
                this.onStatus('Transcribed');
            } else if (type === 'error') {
                this.onError(`Whisper Worker error: ${error}`);
                this.isListening = false;
                this.onListeningChange(false);
            }
        };

        this.worker.postMessage({ type: 'init' });
    }

    setEngine(engine, onProgress) {
        this.engine = engine;
        if (engine === 'whisper_offline') {
            if (!this.workerReady) {
                this.initWhisperWorker(onProgress);
            } else {
                this.onStatus('Local Whisper Ready (Offline)');
            }
        } else if (engine === 'web_speech') {
            this.onStatus(this.recognition ? 'Web Speech API Ready' : 'Web Speech unsupported (try Local Whisper)');
        }
    }

    async toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            await this.startListening();
        }
    }

    async startListening() {
        if (this.engine === 'web_speech') {
            if (this.recognition) {
                try {
                    this.recognition.start();
                } catch (err) {
                    // already started or permission error
                }
            } else {
                this.onError('Web Speech API is not supported in this browser. You can switch to Local Whisper in the speech dropdown, or type commands.');
            }
        } else if (this.engine === 'whisper_offline') {
            if (!this.workerReady) {
                this.onStatus('Local Whisper model is still loading... please wait.');
                this.initWhisperWorker();
                return;
            }
            await this._startWhisperRecording();
        }
    }

    stopListening() {
        if (this.engine === 'web_speech' && this.recognition) {
            this.recognition.stop();
        } else if (this.engine === 'whisper_offline') {
            this._stopWhisperRecording();
        }
        this.isListening = false;
        this.onListeningChange(false);
    }

    async _startWhisperRecording() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, sampleRate: 16000 }
            });

            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);

            this.audioChunks = [];
            // ScriptProcessor for extracting PCM Float32
            this.audioProcessor = this.audioContext.createScriptProcessor(4096, 1, 1);
            this.audioProcessor.onaudioprocess = (e) => {
                if (this.isListening) {
                    const channelData = e.inputBuffer.getChannelData(0);
                    this.audioChunks.push(new Float32Array(channelData));
                }
            };

            source.connect(this.audioProcessor);
            this.audioProcessor.connect(this.audioContext.destination);

            this.isListening = true;
            this.onListeningChange(true);
            this.onStatus('Listening (Whisper Offline)...');
        } catch (err) {
            this.onError(`Microphone access error: ${err.message}`);
        }
    }

    _stopWhisperRecording() {
        if (!this.isListening) return;
        this.isListening = false;
        this.onListeningChange(false);
        this.onStatus('Transcribing with local model...');

        // Disconnect audio
        if (this.audioProcessor) {
            this.audioProcessor.disconnect();
            this.audioProcessor = null;
        }
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(t => t.stop());
            this.mediaStream = null;
        }
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        // Concatenate audio buffers into single Float32Array
        let totalLength = 0;
        for (const chunk of this.audioChunks) {
            totalLength += chunk.length;
        }
        const mergedAudio = new Float32Array(totalLength);
        let offset = 0;
        for (const chunk of this.audioChunks) {
            mergedAudio.set(chunk, offset);
            offset += chunk.length;
        }

        if (this.worker && mergedAudio.length > 0) {
            this.worker.postMessage({
                type: 'transcribe',
                data: { audio: mergedAudio }
            });
        }
    }
}
