import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { decodePcm, encodePcm, liveSocketUrl } from '@/lib/liveAudio';

export default function useLiveInterview(id) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [error, setError] = useState('');
  const [muted, setMuted] = useState(false);
  const [level, setLevel] = useState(0);
  const current = useRef(null);

  const stopPlayback = useCallback(resource => {
    for (const source of resource.sources) { try { source.stop(); } catch { /* already ended */ } }
    resource.sources.clear();
    resource.nextTime = 0;
  }, []);

  const stopAudio = useCallback(resource => {
    resource.stream?.getTracks().forEach(track => track.stop());
    resource.capture?.disconnect();
    resource.input?.disconnect();
    resource.silent?.disconnect();
    stopPlayback(resource);
    if (resource.context?.state !== 'closed') void resource.context?.close().catch(() => {});
  }, [stopPlayback]);

  const dispose = useCallback(resource => {
    if (!resource) return;
    resource.cancelled = true;
    clearTimeout(resource.timeout);
    stopAudio(resource);
    resource.ws?.close();
  }, [stopAudio]);

  useEffect(() => () => { dispose(current.current); current.current = null; }, [id, dispose]);

  const start = async (voice) => {
    if (current.current && !current.current.cancelled) return;
    const resource = { sources: new Set(), nextTime: 0, ready: false, muted: false, cancelled: false };
    current.current = resource;
    setStatus('connecting'); setError(''); setMuted(false);
    const active = () => current.current === resource && !resource.cancelled;
    const fail = message => {
      if (!active()) return;
      setError(message); setStatus('error'); setLevel(0);
      resource.rejectStop?.(new Error(message));
      dispose(resource);
    };
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Microphone access needs HTTPS or localhost and a supported browser.');
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error('This browser does not support live audio. Try Chrome or Edge.');
      // Create/resume inside the user's click to satisfy browser autoplay rules.
      resource.context = new AudioContext();
      await resource.context.resume();
      if (!active()) return;
      resource.stream = await navigator.mediaDevices.getUserMedia({ audio: {
        channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true,
      } });
      if (!active()) { stopAudio(resource); return; }
      if (!resource.context.audioWorklet) throw new Error('AudioWorklet is unavailable. Try a current browser on HTTPS or localhost.');
      await resource.context.audioWorklet.addModule(`${import.meta.env.BASE_URL}pcm-capture.js`);
      if (!active()) return;
      resource.input = resource.context.createMediaStreamSource(resource.stream);
      resource.capture = new AudioWorkletNode(resource.context, 'pcm-capture');
      resource.silent = resource.context.createGain();
      resource.silent.gain.value = 0;
      resource.input.connect(resource.capture).connect(resource.silent).connect(resource.context.destination);
      resource.capture.port.onmessage = event => {
        if (!active() || !resource.ready || resource.ending || resource.muted) return;
        const samples = event.data;
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        setLevel(Math.min(1, rms * 5));
        if (resource.ws?.readyState === WebSocket.OPEN) {
          if (resource.ws.bufferedAmount > 256 * 1024) { fail('Your connection is too slow for live audio. Reconnect when the network improves.'); return; }
          resource.ws.send(JSON.stringify({ type: 'audio', data: encodePcm(samples, resource.context.sampleRate) }));
        }
      };
      const { data } = await api.post(`/interviews/${id}/live-session`);
      if (!active()) return;
      const ws = new WebSocket(liveSocketUrl(api.defaults.baseURL));
      resource.ws = ws;
      resource.timeout = setTimeout(() => fail('Voice connection timed out. Please reconnect.'), 25000);
      ws.onopen = () => { if (active()) ws.send(JSON.stringify({ type: 'start', ticket: data.ticket, voice })); };
      ws.onmessage = event => {
        if (!active()) return;
        let message;
        try { message = JSON.parse(event.data); } catch { fail('Invalid voice response. Please reconnect.'); return; }
        if (message.transcript) setTranscript(message.transcript);
        if (message.type === 'ready') {
          clearTimeout(resource.timeout);
          resource.ready = true;
          setStatus('listening');
        } else if (message.type === 'audio' && !resource.ending) {
          const context = resource.context;
          const samples = decodePcm(message.data);
          if (!samples.length) return;
          const sampleRate = Number(message.mimeType?.match(/rate=(\d+)/)?.[1] || 24000);
          const buffer = context.createBuffer(1, samples.length, sampleRate);
          buffer.copyToChannel(samples, 0);
          const source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(context.destination);
          resource.sources.add(source);
          source.onended = () => {
            resource.sources.delete(source);
            if (active() && !resource.ending && !resource.sources.size) setStatus('listening');
          };
          const when = Math.max(context.currentTime + 0.02, resource.nextTime);
          if (when - context.currentTime > 30) { fail('Audio playback fell behind. Please reconnect.'); return; }
          source.start(when);
          resource.nextTime = when + buffer.duration;
          setStatus('speaking');
        } else if (message.type === 'interrupted') {
          stopPlayback(resource);
          if (!resource.ending) setStatus('listening');
        } else if (message.type === 'error') {
          fail(message.message);
        } else if (message.type === 'stopped') {
          resource.acknowledged = true;
          resource.resolveStop?.();
          dispose(resource);
        }
      };
      ws.onerror = () => fail('Could not connect to the voice service. Check the server and try again.');
      ws.onclose = () => {
        if (active() && !resource.acknowledged) fail('Voice connection lost. Reconnect to continue, or finish using the saved transcript.');
      };
    } catch (err) {
      fail(err.name === 'NotAllowedError'
        ? 'Microphone permission was denied. Allow access in your browser settings and try again.'
        : err.response?.data?.error || err.message || 'Could not start the microphone.');
    }
  };

  const finish = async () => {
    const resource = current.current;
    setError(''); setStatus('finishing'); setLevel(0);
    try {
      if (resource && !resource.cancelled && resource.ws?.readyState === WebSocket.OPEN) {
        resource.ending = true;
        stopAudio(resource);
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Transcript saving timed out. Retry finishing in a moment.')), 12000);
          resource.resolveStop = () => { clearTimeout(timer); resolve(); };
          resource.rejectStop = err => { clearTimeout(timer); reject(err); };
          resource.ws.send(JSON.stringify({ type: 'end' }));
        });
      }
      dispose(resource);
      await api.post(`/interviews/${id}/live-finish`);
      setStatus('finished');
      return true;
    } catch (err) {
      dispose(resource);
      setError(err.response?.data?.error || err.message || 'Could not save feedback. You can retry.');
      setStatus('error');
      return false;
    }
  };

  const toggleMute = () => {
    const resource = current.current;
    if (!resource?.ready || resource.cancelled || resource.ending) return;
    resource.muted = !resource.muted;
    resource.stream.getAudioTracks().forEach(track => { track.enabled = !resource.muted; });
    if (resource.muted) {
      setLevel(0);
      resource.ws.send(JSON.stringify({ type: 'audioStreamEnd' }));
    }
    setMuted(resource.muted);
  };
  return { status, transcript, error, muted, level, start, finish, toggleMute };
}
