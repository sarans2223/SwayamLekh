import React, { useEffect, useRef, useState, useCallback } from 'react';
import '../styles/realtimeSTT.css';
import { RealtimeSTTManager } from '../utils/realtimeSTTManager';

/**
 * RealtimeSTT Component
 * Provides live speech-to-text transcription with waveform visualization
 * Features: VAD, noise detection, confidence display, multilingual support
 */
export function RealtimeSTT({ 
  onTranscript, 
  onCommand,
  language = 'en-IN',
  showWaveform = true,
  autoStart = false 
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [volume, setVolume] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [vadActive, setVadActive] = useState(false);
  const [error, setError] = useState(null);
  const [deviceStatus, setDeviceStatus] = useState('idle');

  const sttManagerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Initialize STT Manager
  useEffect(() => {
    const initializeSTT = async () => {
      try {
        const manager = new RealtimeSTTManager({
          language,
          onTranscript: (text, conf) => {
            setTranscript(text);
            setConfidence(conf);
            if (onTranscript) onTranscript(text, conf);
          },
          onInterim: (text) => {
            setInterimTranscript(text);
          },
          onCommand: (cmd) => {
            if (onCommand) onCommand(cmd);
          },
          onVolumeChange: (vol) => {
            setVolume(vol);
          },
          onNoiseChange: (noise) => {
            setNoiseLevel(noise);
          },
          onVADChange: (isActive) => {
            setVadActive(isActive);
          },
          onError: (err) => {
            setError(err.message);
            console.error('[STT Error]', err);
          },
          onStatusChange: (status) => {
            setDeviceStatus(status);
          },
        });

        sttManagerRef.current = manager;

        if (autoStart) {
          await manager.start();
          setIsListening(true);
        }
      } catch (err) {
        setError(`Failed to initialize STT: ${err.message}`);
        console.error('STT Initialization Error:', err);
      }
    };

    initializeSTT();

    return () => {
      if (sttManagerRef.current) {
        sttManagerRef.current.stop();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [language, onTranscript, onCommand]);

  // Start listening
  const handleStart = useCallback(async () => {
    try {
      setError(null);
      setTranscript('');
      setInterimTranscript('');
      setConfidence(0);
      await sttManagerRef.current?.start();
      setIsListening(true);
      drawWaveform(); // Start animation
    } catch (err) {
      setError(`Failed to start recording: ${err.message}`);
    }
  }, []);

  // Stop listening
  const handleStop = useCallback(async () => {
    try {
      await sttManagerRef.current?.stop();
      setIsListening(false);
      setVadActive(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    } catch (err) {
      setError(`Failed to stop recording: ${err.message}`);
    }
  }, []);

  // Clear transcript
  const handleClear = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
  }, []);

  // Waveform animation
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isListening) return;

    const analyzer = sttManagerRef.current?.getAnalyzer();
    if (!analyzer) {
      animationFrameRef.current = requestAnimationFrame(drawWaveform);
      return;
    }

    const ctx = canvas.getContext('2d');
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    analyzer.getByteFrequencyData(dataArray);

    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw frequency bars
    ctx.fillStyle = vadActive ? '#2ecc71' : '#3498db';
    const barWidth = (canvas.width / dataArray.length) * 2.5;
    let x = 0;

    for (let i = 0; i < dataArray.length; i += 2) {
      const barHeight = (dataArray[i] / 255) * canvas.height;
      ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
      x += barWidth + 1;
    }

    // Draw centerline
    ctx.strokeStyle = '#95a5a6';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationFrameRef.current = requestAnimationFrame(drawWaveform);
  }, [isListening, vadActive]);

  return (
    <div className="realtime-stt-container">
      <div className="stt-header">
        <h2>🎤 Real-time Speech-to-Text</h2>
        <span className={`device-status ${deviceStatus}`}>{deviceStatus}</span>
      </div>

      {/* Waveform Visualization */}
      {showWaveform && (
        <div className="waveform-container">
          <canvas
            ref={canvasRef}
            width={500}
            height={120}
            className="waveform-canvas"
          />
        </div>
      )}

      {/* Status Indicators */}
      <div className="status-indicators">
        <div className="indicator">
          <span>🔊 Volume:</span>
          <div className="level-bar">
            <div className="level-fill" style={{ width: `${volume * 100}%` }} />
          </div>
          <span>{Math.round(volume * 100)}%</span>
        </div>

        <div className="indicator">
          <span>🔴 Noise:</span>
          <div className="level-bar">
            <div className={`level-fill ${noiseLevel > 0.5 ? 'warning' : ''}`} 
                 style={{ width: `${noiseLevel * 100}%` }} />
          </div>
          <span>{Math.round(noiseLevel * 100)}%</span>
        </div>

        <div className="indicator">
          <span>🎯 Confidence:</span>
          <div className="level-bar">
            <div className={`level-fill ${confidence < 0.6 ? 'low' : ''}`} 
                 style={{ width: `${confidence * 100}%` }} />
          </div>
          <span>{Math.round(confidence * 100)}%</span>
        </div>
      </div>

      {/* VAD & Volume Warnings */}
      <div className="warnings">
        {vadActive && <div className="badge vad-active">🎙️ Speaking Detected</div>}
        {volume < 0.1 && <div className="badge warning">📢 Speak louder</div>}
        {noiseLevel > 0.5 && <div className="badge error">📡 Noise detected</div>}
      </div>

      {/* Transcript Display */}
      <div className="transcript-display">
        <div className="final-transcript">
          <strong>Final:</strong> {transcript || '(waiting for speech...)'}
        </div>
        {interimTranscript && (
          <div className="interim-transcript">
            <strong>Interim:</strong> <em>{interimTranscript}</em>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          ⚠️ {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {/* Controls */}
      <div className="stt-controls">
        <button
          className={`btn btn-primary ${isListening ? 'active' : ''}`}
          onClick={handleStart}
          disabled={isListening}
        >
          🎙️ Start Recording
        </button>
        <button
          className={`btn btn-danger ${!isListening ? 'disabled' : ''}`}
          onClick={handleStop}
          disabled={!isListening}
        >
          ⏹️ Stop Recording
        </button>
        <button className="btn btn-secondary" onClick={handleClear}>
          🗑️ Clear
        </button>
      </div>

      {/* Debug Info */}
      <div className="debug-info">
        <small>
          Status: {deviceStatus} | VAD: {vadActive ? 'ON' : 'OFF'} | Volume: {volume.toFixed(2)}
        </small>
      </div>
    </div>
  );
}

export default RealtimeSTT;
