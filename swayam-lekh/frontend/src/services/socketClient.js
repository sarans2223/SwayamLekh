import { io } from 'socket.io-client';

// Vite exposes env vars via import.meta.env
const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

export function createStudentSocket({ register_no, student_name, handlers = {} }) {
  const socket = io(SERVER_URL, { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('[StudentClient] connected', socket.id);
  });

  socket.on('drawing_data', (data) => {
    console.log('[StudentClient] drawing_data', data);
    handlers.onDrawingData && handlers.onDrawingData(data);
  });

  socket.on('alert', (a) => {
    console.log('[StudentClient] alert', a);
    handlers.onAlert && handlers.onAlert(a);
  });

  socket.on('proctor_audio_start', (d) => {
    console.log('[StudentClient] proctor_audio_start', d);
    handlers.onProctorAudioStart && handlers.onProctorAudioStart(d);
  });

  socket.on('proctor_audio_stop', () => {
    console.log('[StudentClient] proctor_audio_stop');
    handlers.onProctorAudioStop && handlers.onProctorAudioStop();
    try {
      if (pc) {
        pc.getSenders().forEach(s => s.track && s.track.stop());
        pc.close();
        pc = null;
      }
    } catch (e) {
      console.warn('[StudentClient] error stopping pc', e);
    }
  });

  // WebRTC: receive offer from proctor, auto-answer with local audio
  let pc = null;
  socket.on('webrtc_offer', async (data) => {
    try {
      console.log('[StudentClient] webrtc_offer', data);
      const { from, sdp } = data || {};
      // ask user for permission to share mic+camera
      const allow = window.confirm('Proctor requests audio+video access. Allow?');
      if (!allow) {
        console.log('[StudentClient] user denied media');
        return;
      }

      pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc_ice', { to: from, candidate: e.candidate });
        }
      };

      pc.onconnectionstatechange = () => console.log('[StudentClient] pc state', pc.connectionState);

      // add local audio+video tracks
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      for (const track of stream.getTracks()) pc.addTrack(track, stream);

      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer', { to: from, sdp: pc.localDescription });
      // expose handlers
      handlers.onWebRTCStarted && handlers.onWebRTCStarted({ pc, stream, from });
    } catch (err) {
      console.error('[StudentClient] webrtc_offer error', err);
    }
  });

  socket.on('webrtc_ice', async (data) => {
    try {
      const { from, candidate } = data || {};
      if (candidate && pc) {
        await pc.addIceCandidate(candidate);
      }
    } catch (err) {
      console.error('[StudentClient] failed to add remote ice', err);
    }
  });

  function sendStatus({ answered = 0, total = 0, status = 'active' } = {}) {
    socket.emit('student_status', { register_no, student_name, answered, total, status });
  }

  function sendAlert(payload) {
    socket.emit('alert', payload);
  }

  function requestDiagram() {
    socket.emit('diagram_request', { register_no, student_name });
  }

  function sendWebRTCAnswer(payload) {
    // payload: { to, sdp }
    socket.emit('webrtc_answer', payload);
  }

  function sendWebRTCIce(payload) {
    // payload: { to, candidate }
    socket.emit('webrtc_ice', payload);
  }

  function disconnect() {
    socket.disconnect();
  }

  return { socket, sendStatus, sendAlert, requestDiagram, sendWebRTCAnswer, sendWebRTCIce, disconnect };
}

export function createProctorSocket(handlers = {}) {
  const socket = io(SERVER_URL, { transports: ['websocket'] });

  socket.on('connect', () => {
    console.log('[ProctorDashboard] connected', socket.id);
    socket.emit('identify_proctor');
  });

  socket.on('initial_state', (state) => {
    console.log('[ProctorDashboard] initial_state', state);
    handlers.onInitialState && handlers.onInitialState(state);
  });

  socket.on('student_status', (st) => {
    console.log('[ProctorDashboard] student_status', st);
    handlers.onStudentStatus && handlers.onStudentStatus(st);
  });

  socket.on('alert', (a) => {
    console.log('[ProctorDashboard] alert', a);
    handlers.onAlert && handlers.onAlert(a);
  });

  socket.on('diagram_request', (r) => {
    console.log('[ProctorDashboard] diagram_request', r);
    handlers.onDiagramRequest && handlers.onDiagramRequest(r);
  });

  socket.on('drawing_rejected', (d) => {
    console.warn('[ProctorDashboard] drawing_rejected', d);
    handlers.onDrawingRejected && handlers.onDrawingRejected(d);
  });

  socket.on('webrtc_answer', (data) => {
    console.log('[ProctorDashboard] webrtc_answer', data);
    handlers.onWebRTCAnswer && handlers.onWebRTCAnswer(data);
  });

  socket.on('webrtc_ice', (data) => {
    console.log('[ProctorDashboard] webrtc_ice', data);
    handlers.onWebRTCIce && handlers.onWebRTCIce(data);
  });

  socket.on('student_disconnected', (d) => {
    handlers.onStudentDisconnected && handlers.onStudentDisconnected(d);
  });

  function sendDrawingData(payload) {
    socket.emit('drawing_data', payload);
  }

  function stopDrawing() {
    socket.emit('stop_drawing', {});
  }

  function startAudio(register_no) {
    socket.emit('start_audio', { register_no });
  }

  function sendOffer(payload) {
    // payload: { register_no, sdp }
    socket.emit('webrtc_offer', payload);
  }

  function sendIce(payload) {
    // payload: { to, candidate }
    socket.emit('webrtc_ice', payload);
  }

  function stopAudio() {
    socket.emit('stop_audio', {});
  }

  function disconnect() {
    socket.disconnect();
  }

  return { socket, sendDrawingData, stopDrawing, startAudio, stopAudio, sendOffer, sendIce, disconnect };
}
