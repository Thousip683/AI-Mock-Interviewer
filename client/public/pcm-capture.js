// Capture runs on the audio thread. Audio is streamed, never recorded to a file.
class PcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(2048);
    this.offset = 0;
  }
  process(inputs) {
    const input = inputs[0]?.[0];
    if (!input) return true;
    for (const sample of input) {
      this.buffer[this.offset++] = sample;
      if (this.offset === this.buffer.length) {
        this.port.postMessage(this.buffer);
        this.offset = 0;
      }
    }
    return true;
  }
}
registerProcessor('pcm-capture', PcmCapture);
