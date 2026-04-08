import React, { useEffect, useRef, useState } from 'react';
import { createProctorSocket } from '../services/socketClient';

export default function ProctorDashboard() {
  const [students, setStudents] = useState({});
  const [alerts, setAlerts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [drawingActive, setDrawingActive] = useState(false);

  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const socketRef = useRef(null);
  const pcRef = useRef({}); // register_no -> RTCPeerConnection
  const remoteStreams = useRef({}); // register_no -> MediaStream
  const [, setRemoteStreamTick] = useState(0);

  useEffect(() => {
    const socket = createProctorSocket({
      onInitialState: (s) => {
        setStudents(s.students || {});
        setActivityLog((l) => [`Exam state loaded (${Object.keys(s.students || {}).length} students)`, ...l].slice(0, 50));
      },
      onStudentStatus: ({ register_no, ...rest }) => {
        setStudents((prev) => ({ ...prev, [register_no]: { register_no, ...rest } }));
      },
      onAlert: (a) => {
        setAlerts((prev) => [a, ...prev].slice(0, 50));
        setActivityLog((l) => [`${new Date().toLocaleTimeString()} ${a.student_name || a.register_no || ''}: ${a.message}`, ...l].slice(0, 100));
      },
      onDiagramRequest: (r) => {
        setRequests((prev) => [r, ...prev]);
        setActivityLog((l) => [`${new Date().toLocaleTimeString()} ${r.student_name || r.register_no}: Diagram requested`, ...l].slice(0, 100));
      },
      onWebRTCAnswer: async (data) => {
        try {
          const { from, sdp } = data || {};
          for (const [reg, pc] of Object.entries(pcRef.current)) {
            if (pc && sdp) {
              try { await pc.setRemoteDescription(new RTCSessionDescription(sdp)); } catch (e) { /* ignore */ }
            }
          }
        } catch (err) { console.error('[ProctorDashboard] failed to set remote desc', err); }
      },
      onWebRTCIce: async (data) => {
        try {
          const { from, candidate } = data || {};
          for (const [reg, pc] of Object.entries(pcRef.current)) {
            if (pc && candidate) {
              try { await pc.addIceCandidate(candidate); } catch (e) { /* ignore */ }
            }
          }
        } catch (err) { console.error('[ProctorDashboard] addIceCandidate error', err); }
      }
    });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a73e8';
    ctx.lineWidth = 3;
    ctxRef.current = ctx;
  }, [drawingActive]);

  function handleStartDrawing() {
    if (!selectedStudent) return alert('Select a student to draw for');
    setDrawingActive(true);
    setActivityLog((l) => [`${new Date().toLocaleTimeString()} Started drawing for ${selectedStudent}`, ...l].slice(0, 100));
  }

  function handleStopDrawing() {
    setDrawingActive(false);
    socketRef.current && socketRef.current.stopDrawing();
    setActivityLog((l) => [`${new Date().toLocaleTimeString()} Stopped drawing`, ...l].slice(0, 100));
  }

  function onMouseMove(e) {
    if (!drawingActive) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = ctxRef.current;
    if (ctx) { ctx.lineTo(x, y); ctx.stroke(); }
    socketRef.current && socketRef.current.sendDrawingData({ register_no: selectedStudent, x, y });
  }

  function onMouseDown(e) {
    if (!drawingActive) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const ctx = ctxRef.current; if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
    socketRef.current && socketRef.current.sendDrawingData({ register_no: selectedStudent, x, y, action: 'start' });
  }

  function onMouseUp() {
    if (!drawingActive) return;
    const ctx = ctxRef.current; if (ctx) ctx.closePath();
    socketRef.current && socketRef.current.sendDrawingData({ register_no: selectedStudent, action: 'end' });
  }

  async function acceptRequest(req) {
    setSelectedStudent(req.register_no);
    const targetReg = req.register_no;
    const student = students[targetReg];
    if (!student || !student.socketId) { console.warn('[ProctorDashboard] cannot start audio/video: student socketId missing'); return; }

    setActivityLog((l) => [`${new Date().toLocaleTimeString()} Accepting request from ${req.student_name || targetReg}`, ...l].slice(0, 100));

    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    pcRef.current[targetReg] = pc;

    pc.ontrack = (ev) => {
      const stream = ev.streams && ev.streams[0];
      console.log('[ProctorDashboard] pc.ontrack for', targetReg, stream);
      if (stream) {
        remoteStreams.current[targetReg] = stream;
        setRemoteStreamTick((t) => t + 1);
        setActivityLog((l) => [`${new Date().toLocaleTimeString()} Received remote stream for ${targetReg}`, ...l].slice(0, 100));
      }
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        const to = student.socketId;
        socketRef.current && socketRef.current.sendIce({ to, candidate: e.candidate });
      }
    };

    pc.addTransceiver('audio', { direction: 'recvonly' });
    pc.addTransceiver('video', { direction: 'recvonly' });

    try {
      console.log('[ProctorDashboard] creating offer for', targetReg);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[ProctorDashboard] offer created for', targetReg, pc.localDescription);
      socketRef.current && socketRef.current.sendOffer({ register_no: targetReg, sdp: pc.localDescription });
      console.log('[ProctorDashboard] sent webrtc_offer for', targetReg);
      setActivityLog((l) => [`${new Date().toLocaleTimeString()} Sent offer for ${targetReg}`, ...l].slice(0, 100));
    } catch (err) { console.error('[ProctorDashboard] offer error', err); }
  }

  // Debug helper: allow triggering acceptRequest from browser console
  useEffect(() => {
    window.startAudioFor = (reg) => {
      if (!reg) return console.warn('startAudioFor requires register_no');
      acceptRequest({ register_no: reg, student_name: (students[reg] && students[reg].name) || reg });
    };
    window.getProctorStudents = () => students;
    return () => {
      try { delete window.startAudioFor; delete window.getProctorStudents; } catch (e) {}
    };
  }, [students]);

  // layout helpers
  const headerStyle = { background: '#1565c0', color: '#fff', padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 6 };
  const containerStyle = { display: 'grid', gridTemplateColumns: '1fr 420px', gap: 16, marginTop: 12 };

  return (
    <div style={{ padding: 16, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>AI PROCTOR DASHBOARD</div>
          <div style={{ color: '#cfe8ff', fontSize: 13 }}>Live Monitoring</div>
        </div>
        <div style={{ fontSize: 14 }}><strong>Status:</strong> <span style={{ marginLeft: 8, color: '#dff0d8' }}>AI Monitoring Active</span></div>
      </div>

      <div style={containerStyle}>
        <div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <h4 style={{ marginTop: 0 }}>LIVE CAMERA FEEDS</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {Object.entries(students).slice(0, 4).map(([reg, s]) => (
                <div key={reg} style={{ border: '2px solid #2c6fb7', borderRadius: 8, position: 'relative', height: 150, overflow: 'hidden', background: '#000' }}>
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <video
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      autoPlay
                      playsInline
                      ref={(el) => {
                        if (el) {
                          const st = remoteStreams.current[reg];
                          if (st && el.srcObject !== st) {
                            el.srcObject = st;
                            console.log('[ProctorDashboard] attached stream to video', reg, st);
                          }
                        }
                      }}
                    />
                    {remoteStreams.current[reg] && (
                      <div style={{ position: 'absolute', left: 8, top: 8, background: 'rgba(0,0,0,0.6)', color: '#b8f5c7', padding: '4px 8px', borderRadius: 4, fontSize: 12 }}>LIVE</div>
                    )}
                  </div>
                  <div style={{ position: 'absolute', left: 10, bottom: 10, color: '#fff', background: 'rgba(0,0,0,0.5)', padding: '6px 10px', borderRadius: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ fontWeight: 700 }}>{s.name || reg}</div>
                    <div style={{ width: 10, height: 10, borderRadius: 20, background: s.status === 'active' ? '#2ecc71' : (s.status === 'idle' ? '#f1c40f' : '#e74c3c') }} />
                    <div style={{ fontSize: 12, color: '#fff' }}>{s.status}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
              <div style={{ flex: 1 }}>
                <h5 style={{ margin: '8px 0' }}>Student Status</h5>
                <div style={{ maxHeight: 180, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
                  {Object.entries(students).map(([reg, s]) => (
                    <div key={reg} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #fafafa' }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 18, textAlign: 'center' }}>{s.icon || '👤'}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{s.name || reg}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{s.answered}/{s.total} answered</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div style={{ width: 10, height: 10, borderRadius: 12, background: s.status === 'active' ? '#2ecc71' : (s.status === 'idle' ? '#f1c40f' : '#e74c3c') }} />
                        <button onClick={() => setSelectedStudent(reg)} style={{ padding: '6px 10px' }}>Focus</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ width: 240 }}>
                <h5 style={{ margin: '8px 0' }}>Alerts</h5>
                <div style={{ maxHeight: 120, overflow: 'auto', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                  {alerts.length === 0 ? <div style={{ color: '#888' }}>No alerts</div> : alerts.map((a, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 6px', borderBottom: '1px solid #fafafa' }}>
                      <div style={{ width: 10, height: 10, borderRadius: 10, background: a.level === 'high' ? '#e74c3c' : '#f1c40f' }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{a.student_name || a.register_no}</div>
                        <div style={{ fontSize: 13, color: '#444' }}>{a.message}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <h5 style={{ margin: '8px 0', marginTop: 12 }}>Activity Log</h5>
                <div style={{ maxHeight: 120, overflow: 'auto', border: '1px solid #eee', padding: 8, borderRadius: 6 }}>
                  {activityLog.length === 0 ? <div style={{ color: '#888' }}>No activity yet</div> : activityLog.map((item, i) => (
                    <div key={i} style={{ padding: '6px 4px', borderBottom: '1px solid #fafafa', fontSize: 13 }}>{item}</div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div style={{ background: '#fff', borderRadius: 8, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <h4 style={{ marginTop: 0 }}>FOCUS & DRAWING AREA</h4>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 40, background: '#ddd', overflow: 'hidden' }}>
                {/* avatar preview */}
                <img src={(selectedStudent && (students[selectedStudent] && students[selectedStudent].avatar)) || '/public/default-avatar.png'} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>{selectedStudent ? (students[selectedStudent] && students[selectedStudent].name) || selectedStudent : 'No student selected'}</div>
                <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>{selectedStudent ? 'LIVE AUDIO CONNECTED' : 'Select a student to view controls'}</div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button onClick={() => alert('Listen feature not implemented')} disabled={!selectedStudent} style={{ padding: '8px 12px' }}>Listen</button>
                  <button onClick={handleStartDrawing} disabled={!selectedStudent} style={{ padding: '8px 12px' }}>Assist Drawing</button>
                  <button onClick={() => alert('Send warning')} disabled={!selectedStudent} style={{ padding: '8px 12px' }}>Send Warning</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ background: '#fafafa', border: '1px solid #e6eefc', padding: 8, borderRadius: 6 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>DRAWING CANVAS</div>
                <div style={{ border: '1px solid #ddd', padding: 8, borderRadius: 6 }}>
                  <canvas ref={canvasRef} width={720} height={300} style={{ width: '100%', height: 300, borderRadius: 4 }} onMouseMove={onMouseMove} onMouseDown={onMouseDown} onMouseUp={onMouseUp} />
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ color: '#2e7d32' }}>{drawingActive ? 'Live Sync Active: Drawing synced to student' : 'Live Sync Inactive'}</div>
                  <div>
                    <button onClick={handleStopDrawing} disabled={!drawingActive} style={{ padding: '8px 12px' }}>Stop Draw</button>
                    <button onClick={() => selectedStudent && acceptRequest({ register_no: selectedStudent, student_name: (students[selectedStudent] && students[selectedStudent].name) || selectedStudent })} style={{ marginLeft: 8, padding: '8px 12px' }}>Start Audio/Video</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
