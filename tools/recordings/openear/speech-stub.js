// The headless browser has no voices, so speech never "finishes" and the app,
// which waits for each sentence, would stall. This stand-in plays nothing but
// reports each sentence as spoken after a realistic time (the video is silent).
(() => {
  let current = null;
  let timer = 0;
  const fire = (u, type) => {
    const e = new Event(type);
    try { u.dispatchEvent(e); } catch (_) {}
    const h = u['on' + type];
    if (typeof h === 'function') h.call(u, e);
  };
  const finish = () => {
    if (!current) return;
    const u = current;
    current = null;
    clearTimeout(timer);
    fire(u, 'end');
  };
  const synth = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: () => [],
    speak(u) {
      finish();
      current = u;
      this.speaking = true;
      setTimeout(() => fire(u, 'start'), 10);
      timer = setTimeout(() => { this.speaking = false; finish(); }, Math.min(3500, 300 + 45 * (u.text || '').length));
    },
    cancel() { this.speaking = false; finish(); },
    pause() {},
    resume() {},
    addEventListener() {},
    removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
})();
