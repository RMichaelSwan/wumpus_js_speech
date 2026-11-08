/**
 * Web Worker for running local Transformers.js Whisper offline
 */

let pipeline = null;
let transcriber = null;
let isLoading = false;

self.onmessage = async (e) => {
    const { type, data } = e.data;

    if (type === 'init') {
        if (transcriber) {
            self.postMessage({ type: 'ready' });
            return;
        }
        if (isLoading) return;

        isLoading = true;
        try {
            // Import vendored Transformers.js
            importScripts('../../vendor/transformers/transformers.min.js');

            const { pipeline: hfPipeline, env } = self.transformers;
            // Allow remote models on first load, cached in browser IndexedDB/CacheStorage for offline
            env.allowRemoteModels = true;

            self.postMessage({ type: 'status', message: 'Loading offline Whisper model...' });

            transcriber = await hfPipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
                quantized: true,
                progress_callback: (progress) => {
                    self.postMessage({ type: 'progress', data: progress });
                }
            });

            isLoading = false;
            self.postMessage({ type: 'ready' });
        } catch (err) {
            isLoading = false;
            self.postMessage({ type: 'error', error: err.message || err.toString() });
        }
    }

    if (type === 'transcribe') {
        if (!transcriber) {
            self.postMessage({ type: 'error', error: 'Model not initialized' });
            return;
        }

        try {
            const { audio } = data; // Float32Array at 16kHz
            const output = await transcriber(audio, {
                chunk_length_s: 30,
                stride_length_s: 5,
                language: 'english',
                task: 'transcribe'
            });

            self.postMessage({ type: 'result', text: output.text || '' });
        } catch (err) {
            self.postMessage({ type: 'error', error: err.message || err.toString() });
        }
    }
};
