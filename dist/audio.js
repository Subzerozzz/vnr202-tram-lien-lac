// Attempt normal autoplay; retry on interaction when the browser suspends audio.
export function audioPreferences(value = {}) {
  return {
    audioVersion: 3,
    sound: true,
    voice: typeof value.voice === 'string' ? value.voice : 'auto',
    narrationStyle: value.narrationStyle === 'broadcast' ? 'broadcast' : 'natural',
  };
}

export function vietnameseVoices(voices = []) {
  const score = voice => {
    const name = `${voice.name} ${voice.voiceURI}`;
    return (/natural|neural|enhanced|premium|online/i.test(name) ? 80 : 0)
      + (/Google|Microsoft/i.test(name) ? 25 : 0)
      + (/vi[-_]VN/i.test(voice.lang) ? 20 : 0)
      + (voice.localService === false ? 10 : 0);
  };
  return [...new Map(voices.filter(v => /^vi(?:[-_]|$)/i.test(v.lang))
    .map(v => [v.voiceURI || v.name, v])).values()]
    .sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, 'vi'));
}

export function narrationSentences(text) {
  const normalized = text
    .replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g, 'ngày $1 tháng $2 năm $3')
    .replace(/(\d{1,2})\/(\d{4})/g, 'tháng $1 năm $2')
    .replace(/\bCNXH\b/g, 'chủ nghĩa xã hội')
    .replace(/\bATK\b/g, 'An toàn khu')
    .replace(/Trung ương VIII/g, 'Trung ương tám')
    .replace(/Đại hội III/g, 'Đại hội ba')
    .replace(/Mác\s*-\s*Lênin/g, 'Mác Lênin')
    .replace(/\s+/g, ' ').trim();
  return (normalized.match(/[^.!?…]+(?:[.!?…]+[”"']*|$)/g) || [])
    .map(s => s.trim()).filter(Boolean);
}

export class RadioAudio {
  constructor({createContext, onState = () => {}, schedule = (fn, delay) => setTimeout(fn, delay), cancel = id => clearTimeout(id)} = {}) {
    this.createContext = createContext || (() => new (window.AudioContext || window.webkitAudioContext)());
    this.onState = onState;
    this.schedule = schedule;
    this.cancel = cancel;
    this.enabled = true;
    this.activated = false;
    this.visible = true;
    this.ambient = false;
    this.speaking = false;
    this.context = null;
    this.master = null;
    this.loop = null;
    this.sources = new Set();
  }

  get ready() { return this.enabled && this.activated && this.visible && this.context?.state === 'running'; }

  activate() {
    if (!this.enabled || !this.visible) return;
    try {
      if (!this.context || this.context.state === 'closed') {
        this.context = this.createContext();
        this.master = this.context.createGain();
        this.master.gain.value = 1;
        this.master.connect(this.context.destination);
        this.context.onstatechange = () => this.sync();
      }
      this.activated = true;
      // A blocked autoplay request is retried synchronously on the first gesture.
      const pending = this.context.state !== 'running' ? this.context.resume() : null;
      this.sync();
      pending?.then(() => this.sync()).catch(() => this.onState());
    } catch { this.onState(); }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) this.silence();
    this.sync();
  }

  setAmbient(active) {
    if (this.ambient && !active) this.silence();
    this.ambient = active;
    this.sync();
  }
  setSpeaking(speaking) { if (speaking) this.silence(); this.speaking = speaking; this.sync(); }
  setVisible(visible) {
    this.visible = visible;
    if (!visible) {
      this.silence();
      this.context?.suspend()?.catch(() => {});
    } else if (this.enabled && this.activated) this.activate();
    this.sync();
  }

  sync() {
    const ambient = this.ready && this.ambient && !this.speaking;
    if (!ambient) {
      if (this.loop !== null) this.cancel(this.loop);
      this.loop = null;
    } else if (this.loop === null) this.ambientCycle();
    this.onState();
  }

  silence() {
    if (this.loop !== null) this.cancel(this.loop);
    this.loop = null;
    for (const source of this.sources) { try { source.stop(); } catch {} }
    this.sources.clear();
  }

  beep(frequency, start, duration, volume = .026) {
    if (!this.ready) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + .012);
    gain.gain.setValueAtTime(volume, start + duration - .012);
    gain.gain.linearRampToValueAtTime(0, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.sources.add(oscillator);
    oscillator.onended = () => { this.sources.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
    oscillator.start(start);
    oscillator.stop(start + duration + .01);
  }

  morse(quiet = false) {
    if (!this.ready) return;
    let time = this.context.currentTime + .04;
    for (const duration of [.075, .22, .075, .075]) {
      this.beep(quiet ? 620 : 650, time, duration, quiet ? .04 : .045);
      time += duration + .1;
    }
  }

  ambientCycle() {
    if (!this.ready || !this.ambient || this.speaking) return;
    this.morse(true);
    this.loop = this.schedule(() => { this.loop = null; this.ambientCycle(); }, 3800);
  }

  tone(kind) {
    if (!this.ready) return;
    const time = this.context.currentTime + .02;
    if (kind === 'success') {
      this.beep(520, time, .09);
      this.beep(660, time + .13, .1);
      this.beep(780, time + .28, .2);
    } else this.beep(190, time, .17);
  }
}

export class Narrator {
  constructor({synth, Utterance, onState = () => {}, onError = () => {}, schedule = (fn, delay) => setTimeout(fn, delay), cancel = id => clearTimeout(id)}) {
    this.synth = synth;
    this.Utterance = Utterance;
    this.onState = onState;
    this.onError = onError;
    this.schedule = schedule;
    this.cancel = cancel;
    this.run = 0;
    this.timer = null;
    this.current = null;
    this.playing = false;
  }

  voices() { return vietnameseVoices(this.synth?.getVoices() || []); }
  stop() {
    this.run++;
    if (this.timer !== null) this.cancel(this.timer);
    this.timer = null;
    this.current = null;
    this.synth?.cancel();
    const changed = this.playing;
    this.playing = false;
    if (changed) this.onState(false);
  }

  play(text, {voice = 'auto', style = 'natural'} = {}) {
    this.stop();
    if (!this.synth || !this.Utterance) { this.onError('unsupported'); return false; }
    const sentences = narrationSentences(text);
    if (!sentences.length) return false;
    const voices = this.voices();
    const chosen = voices.find(v => (v.voiceURI || v.name) === voice) || voices[0];
    const ticket = this.run;
    const broadcast = style === 'broadcast';
    this.playing = true;
    this.onState(true);
    const read = index => {
      if (ticket !== this.run) return;
      if (index >= sentences.length) {
        this.current = null;
        this.playing = false;
        this.onState(false);
        return;
      }
      const utterance = new this.Utterance(sentences[index]);
      this.current = utterance; // Keep a strong reference until the utterance ends.
      utterance.lang = 'vi-VN';
      if (chosen) utterance.voice = chosen;
      utterance.rate = (broadcast ? .94 : 1) * (index === sentences.length - 1 ? .97 : 1);
      utterance.pitch = broadcast ? .97 : 1;
      utterance.volume = 1;
      utterance.onend = () => {
        if (ticket !== this.run) return;
        const pause = /[!?]/.test(sentences[index].slice(-2)) ? 480 : broadcast ? 420 : 300;
        this.timer = this.schedule(() => { this.timer = null; read(index + 1); }, pause);
      };
      utterance.onerror = event => {
        if (ticket !== this.run) return;
        this.stop();
        if (!['canceled', 'interrupted'].includes(event.error)) this.onError(event.error);
      };
      try { this.synth.speak(utterance); }
      catch { this.stop(); this.onError('synthesis-failed'); }
    };
    read(0);
    return true;
  }
}
