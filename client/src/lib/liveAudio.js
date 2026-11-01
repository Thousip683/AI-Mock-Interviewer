// PCM framing/playback approach adapted from the supplied voice-chat reference.
export function encodePcm(samples, sampleRate) {
  const ratio = sampleRate / 16000;
  const output = new DataView(new ArrayBuffer(Math.floor(samples.length / ratio) * 2));
  for (let i = 0; i < output.byteLength / 2; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
    let sample = 0;
    for (let j = start; j < end; j++) sample += samples[j];
    sample = Math.max(-1, Math.min(1, sample / (end - start)));
    output.setInt16(i * 2, sample < 0 ? sample * 32768 : sample * 32767, true);
  }
  return btoa(String.fromCharCode(...new Uint8Array(output.buffer)));
}

export function decodePcm(data) {
  const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(Math.floor(bytes.length / 2));
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
}

export function liveSocketUrl(baseURL, pageUrl = window.location.href) {
  const url = new URL(baseURL, pageUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/$/, '')}/live`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
