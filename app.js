const startBtn = document.getElementById('start-btn');
const overlay = document.getElementById('overlay');
const pads = document.querySelectorAll('.pad');
const statusText = document.getElementById('status-text');

let isInitialized = false;

// Analyzers
const waveform = new Tone.Waveform(256);

// Master Chains & FX
const masterReverb = new Tone.Reverb({ decay: 2.5, preDelay: 0.1, wet: 0.15 });
const masterComp = new Tone.Compressor({ threshold: -20, ratio: 4, attack: 0.01, release: 0.1 });
masterComp.chain(masterReverb, waveform, Tone.Destination);
Tone.Destination.volume.value = -3;

// Synth Touch Filters
const touchHPF = new Tone.Filter(20, "highpass");
const touchLPF = new Tone.Filter(20000, "lowpass");
const synthBus = new Tone.Gain(1);
synthBus.chain(touchHPF, touchLPF, masterComp);

// We use Tone.Channel for seamless mute/unmute phasing
const channels = {};
const instruments = {};

const createChannel = (id, pan, vol = 0, dest = masterComp) => {
  const channel = new Tone.Channel({ volume: vol, pan: pan, mute: true }).connect(dest);
  channels[id] = channel;
  return channel;
}

// ----------------------------------------------------
// SYNTHESIZERS (Premium Presets & Effects)
// ----------------------------------------------------

// 1. Synth 1: Deep Sub Bass (Left Outer)
const synth1Channel = createChannel('synth1', 0, 10, synthBus);
instruments.synth1 = new Tone.MonoSynth({
  oscillator: { type: "square" }, // Square gives more harmonics for bass
  envelope: { attack: 0.05, decay: 0.3, sustain: 0.4, release: 0.8 },
  filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1, baseFrequency: 60, octaves: 4 }
}).connect(synth1Channel);

instruments.synth1B = new Tone.FMSynth({ // Industrial Bass
  harmonicity: 0.5,
  modulationIndex: 4,
  oscillator: { type: "square" },
  envelope: { attack: 0.01, decay: 0.3, sustain: 0.2, release: 0.5 },
  modulation: { type: "sawtooth" },
  modulationEnvelope: { attack: 0.01, decay: 0.4, sustain: 0.1, release: 0.5 }
});
const synth1BVol = new Tone.Volume(0); // Adjust B-variant volume here
const synth1BPan = new Tone.Panner(0); // Adjust B-variant pan here
instruments.synth1B.chain(synth1BPan, synth1BVol, synth1Channel);

// 2. Synth 2: Plucky Arp (Left Inner) + PingPong Delay
const synth2Channel = createChannel('synth2', -0.4, 20, synthBus);
const pluckDelay = new Tone.PingPongDelay("8n.", 0.4).connect(synthBus);

instruments.synth2 = new Tone.FMSynth({
  harmonicity: 1.5,
  modulationIndex: 3,
  oscillator: { type: "triangle" },
  envelope: { attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.2 },
  modulation: { type: "square" },
  modulationEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.2 }
});
instruments.synth2.connect(pluckDelay);
instruments.synth2.connect(synth2Channel);

instruments.synth2B = new Tone.MetalSynth({ // Industrial Pluck
  frequency: 150,
  envelope: { attack: 0.001, decay: 0.15, release: 0.1 },
  harmonicity: 3.1,
  modulationIndex: 16,
  resonance: 2000,
  octaves: 1.5
});
const synth2BVol = new Tone.Volume(-30); // Adjust B-variant volume here
const synth2BPan = new Tone.Panner(0); // Adjust B-variant pan here
instruments.synth2B.chain(synth2BPan, synth2BVol);
synth2BVol.connect(pluckDelay);
synth2BVol.connect(synth2Channel);

// 3. Synth 3: Lush Pad (Right Inner) + Wide Chorus
const synth3Channel = createChannel('synth3', 0.4, -5, synthBus);
const padChorus = new Tone.Chorus(4, 2.5, 0.5).start().connect(synth3Channel);

instruments.synth3 = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "sawtooth" },
  envelope: { attack: 0.5, decay: 1.0, sustain: 0.8, release: 2.0 }
});
instruments.synth3.connect(padChorus);
instruments.synth3B = new Tone.PolySynth(Tone.FMSynth, {
  harmonicity: 0.5, // Controls the metallic ring (non-integers sound bell-like)
  modulationIndex: 10, // Controls how harsh or distorted the FM effect is
  oscillator: { type: "square" },
  envelope: { attack: 0.0, decay: 0.0, sustain: 0.5, release: 0.0 },
  modulation: { type: "sawtooth" },
  modulationEnvelope: { attack: 0.0, decay: 0.0, sustain: 0.5, release: 0.0 }
});

const synth3BVol = new Tone.Volume(5); // Adjust B-variant volume here
const synth3BPan = new Tone.Panner(0); // Adjust B-variant pan here
// Route through the B-variant controls, then into the chorus which feeds the channel
instruments.synth3B.chain(synth3BPan, synth3BVol, padChorus);

// 4. Synth 4: Cutting Lead (Right Outer) + Feedback Delay
const synth4Channel = createChannel('synth4', 0, -5, synthBus);
const leadDelay = new Tone.FeedbackDelay("8n", 0.5).connect(synth4Channel);

instruments.synth4 = new Tone.DuoSynth({
  vibratoAmount: 0.1,
  vibratoRate: 5,
  voice0: { oscillator: { type: "sawtooth" }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } },
  voice1: { oscillator: { type: "square" }, filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.2 } }
});
instruments.synth4.connect(leadDelay);

instruments.synth4B = new Tone.AMSynth({ // Industrial Lead
  harmonicity: 3.5,
  oscillator: { type: "sawtooth" },
  envelope: { attack: 0.05, decay: 0.2, sustain: 0.4, release: 0.5 },
  modulation: { type: "square" },
  modulationEnvelope: { attack: 0.01, decay: 0.1, sustain: 0.1, release: 0.1 }
});
const synth4BVol = new Tone.Volume(15); // Adjust B-variant volume here
const synth4BPan = new Tone.Panner(0); // Adjust B-variant pan here
instruments.synth4B.chain(synth4BPan, synth4BVol, leadDelay);

// ----------------------------------------------------
// DRUM MACHINES (High Quality Professional Synthesizers)
// ----------------------------------------------------
// 5. Drum 1: Punchy Deep Kick
const drum1Channel = createChannel('drum1', 0, 10);
instruments.drum1 = new Tone.MembraneSynth({
  pitchDecay: 0.05,
  octaves: 6,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 0.4, attackCurve: "exponential" }
}).connect(drum1Channel);

instruments.drum1B = new Tone.MembraneSynth({ // Industrial Kick
  pitchDecay: 0.1,
  octaves: 8,
  oscillator: { type: "square" }, // Harder, more harmonic, pseudo-distorted kick
  envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.3, attackCurve: "exponential" }
});
const drum1BVol = new Tone.Volume(0); // Adjust B-variant volume here
const drum1BPan = new Tone.Panner(0); // Adjust B-variant pan here
instruments.drum1B.chain(drum1BPan, drum1BVol, drum1Channel);

// 6. Drum 2: Secondary Snare/Clap
const drum2Channel = createChannel('drum2', 0, 10);
const clapFilter = new Tone.Filter(3000, "highpass").connect(drum2Channel);
instruments.drum2 = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: { attack: 0.005, decay: 0.25, sustain: 0, release: 0.1 }
}).connect(clapFilter);

const crushFilter = new Tone.Filter(800, "bandpass").connect(drum2Channel);
instruments.drum2B = new Tone.NoiseSynth({ // Industrial Snare (Harsh Pink Noise burst)
  noise: { type: "pink" },
  envelope: { attack: 0.001, decay: 0.35, sustain: 0, release: 0.1 }
});
const drum2BVol = new Tone.Volume(15); // Adjust B-variant volume here
const drum2BPan = new Tone.Panner(0); // Adjust B-variant pan here
instruments.drum2B.chain(drum2BPan, drum2BVol, crushFilter);

// 7. Drum 3: Open/Close HiHats
const drum3Channel = createChannel('drum3', -0.3, -10);
instruments.drum3 = new Tone.MetalSynth({
  frequency: 250,
  envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, // Decay modified dynamically
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
}).connect(drum3Channel);

instruments.drum3B = new Tone.MetalSynth({ // Industrial HiHat
  frequency: 500,
  envelope: { attack: 0.001, decay: 0.05, release: 0.01 }, // Decay modified dynamically
  harmonicity: 8.1,
  modulationIndex: 50,
  resonance: 6000,
  octaves: 1.0
});
const drum3BVol = new Tone.Volume(5); // Adjust B-variant volume here
const drum3BPan = new Tone.Panner(0); // Adjust B-variant pan here
instruments.drum3B.chain(drum3BPan, drum3BVol, drum3Channel);

// 8. Drum 4: High/Low Toms
const drum4Channel = createChannel('drum4', 0.3, 10);
instruments.drum4 = new Tone.MembraneSynth({
  pitchDecay: 0.1,
  octaves: 3,
  oscillator: { type: "sine" },
  envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.2 }
}).connect(drum4Channel);

instruments.drum4B = new Tone.MembraneSynth({ // Industrial Tom
  pitchDecay: 0.2,
  octaves: 3,
  oscillator: { type: "triangle" }, // Grittier tone
  envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.2 }
});
const drum4BVol = new Tone.Volume(10); // Adjust B-variant volume here
const drum4BPan = new Tone.Panner(0); // Adjust B-variant pan here
instruments.drum4B.chain(drum4BPan, drum4BVol, drum4Channel);

// ----------------------------------------------------
// PATTERNS (A Minor Electronic Groove)
// ----------------------------------------------------

const n = (note, dur = "16n") => ({ note, dur });
const _ = null;

const patterns = {
  synth1: {
    instrument: instruments.synth1, instrumentsList: [instruments.synth1, instruments.synth1B], currentVariation: 0, active: false, subdiv: "16n",
    grooves: [
      [n("A1"), _, n("A1"), n("A1", "8n"), _, _, n("C2"), _, n("A1"), _, n("A1"), _, n("E2"), _, n("G1"), _],
      [n("A1"), _, n("C2"), _, n("D2"), _, n("E2"), _, n("E2"), _, n("D2"), _, n("C2"), _, n("G1"), _],
      [n("A1"), n("A1"), n("A1"), n("A1"), n("A1"), _, n("C2"), _, n("A1"), n("A1"), n("A1"), n("A1"), n("D2"), _, n("E2"), _],
      [_, _, n("A1", "8n"), _, _, _, n("E2", "8n"), _, _, _, n("A1", "8n"), _, _, n("G1", "16n"), n("E1", "16n"), _],
    ]
  },
  synth2: {
    instrument: instruments.synth2, instrumentsList: [instruments.synth2, instruments.synth2B], currentVariation: 0, active: false, subdiv: "16n",
    grooves: [
      [n("A3"), n("C4"), n("E4"), n("A4"), n("G4"), n("E4"), n("C4"), n("G3"), n("A3"), n("C4"), n("E4"), n("A4"), n("G4"), n("E4"), n("C4"), n("G3")],
      [n("A3"), _, n("E4"), _, n("C4"), _, n("G4"), _, n("E4"), _, n("B3"), _, n("G3"), _, n("A3"), _],
      [n("A3"), n("C4"), n("D4"), n("E4"), n("G4"), n("A4"), n("C5"), n("E5"), n("C5"), n("A4"), n("G4"), n("E4"), n("D4"), n("C4"), n("G3"), n("E3")],
      [_, n("A4"), _, n("E4"), n("C4"), _, n("G4"), _, _, n("A4"), _, n("E4"), _, n("C4"), n("G3"), _],
    ]
  },
  synth3: {
    instrument: instruments.synth3, instrumentsList: [instruments.synth3, instruments.synth3B], currentVariation: 0, active: false, subdiv: "1m",
    grooves: [
      [n(["A3", "C4", "E4"], "2n"), n(["F3", "A3", "C4"], "2n"), n(["G3", "B3", "D4"], "2n"), n(["E3", "G3", "B3"], "2n")],
      [n(["A3", "C4", "E4", "A4"], "2n"), n(["D3", "F3", "A3", "D4"], "2n"), n(["F3", "A3", "C4", "F4"], "2n"), n(["G3", "B3", "D4", "G4"], "2n")],
      [n(["A3", "C4", "E4", "G4"], "2n"), n(["C3", "E3", "G3", "C4"], "2n"), n(["F3", "A3", "C4", "E4"], "2n"), n(["E3", "G#3", "B3", "D4"], "2n")],
      [n(["A3", "E4", "A4"], "2n"), n(["A3", "D4", "A4"], "2n"), n(["A3", "F4", "A4"], "2n"), n(["A3", "E4", "G4"], "2n")],
    ]
  },
  synth4: {
    instrument: instruments.synth4, instrumentsList: [instruments.synth4, instruments.synth4B], currentVariation: 0, active: false, subdiv: "16n",
    grooves: [
      [_, _, n("A4", "8n"), _, _, _, n("E4", "8n"), _, n("G4", "16n"), n("A4", "16n"), _, _, n("C5", "8n"), _, _, _],
      [n("E5", "8n"), _, n("D5", "8n"), _, n("C5", "8n"), _, n("A4", "8n"), _, n("G4", "8n"), _, _, _, n("E4", "8n"), _, n("G4", "8n"), _],
      [n("A5", "16n"), _, _, _, n("G5", "16n"), _, _, _, n("E5", "16n"), _, _, _, n("C5", "8n"), _, n("D5", "8n"), _],
      [_, _, _, _, n("A4"), n("B4"), n("C5"), n("D5"), n("E5"), _, n("G5"), _, n("A5", "8n"), _, _, _],
    ]
  },
  drum1: {
    instrument: instruments.drum1, instrumentsList: [instruments.drum1, instruments.drum1B], currentVariation: 0, active: false, subdiv: "16n",
    grooves: [
      [n("C1"), _, _, _, n("C1"), _, _, _, n("C1"), _, _, _, n("C1"), _, _, _],
      [n("C1"), _, _, n("C1"), _, _, n("C1"), _, _, n("C1"), _, _, n("C1"), _, _, n("C1")],
      [n("C1"), _, _, _, n("C1"), _, _, n("C1"), _, _, n("C1"), _, _, _, n("C1"), _],
      [n("C1"), _, n("C1"), _, n("C1"), _, _, _, n("C1"), _, n("C1"), _, n("C1"), _, _, n("C1")],
    ]
  },
  drum2: {
    instrument: instruments.drum2, instrumentsList: [instruments.drum2, instruments.drum2B], currentVariation: 0, active: false, subdiv: "16n",
    grooves: [
      [_, _, _, _, n("C4"), _, _, _, _, _, _, _, n("C4"), _, _, _],
      [_, _, _, n("C4"), _, _, n("C4"), _, _, n("C4"), _, _, _, n("C4"), _, _],
      [_, _, _, _, n("C4"), _, _, _, _, _, _, _, n("C4"), _, n("C4"), _],
      [_, _, _, _, n("C4"), _, n("C4"), _, _, _, n("C4"), _, _, n("C4"), _, _],
    ]
  },
  drum3: {
    instrument: instruments.drum3, instrumentsList: [instruments.drum3, instruments.drum3B], currentVariation: 0, active: false, subdiv: "16n",
    grooves: [
      [n("C4", "32n"), n("C4", "32n"), n("C4", "8n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "8n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "8n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "8n"), n("C4", "32n")],
      [_, _, n("C4", "8n"), _, _, _, n("C4", "8n"), _, _, _, n("C4", "8n"), _, _, _, n("C4", "8n"), _],
      [n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "8n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "32n"), n("C4", "8n")],
      [_, n("C4", "8n"), _, n("C4", "8n"), _, n("C4", "8n"), _, n("C4", "32n"), _, n("C4", "8n"), _, n("C4", "8n"), _, n("C4", "8n"), _, n("C4", "32n")],
    ]
  },
  drum4: {
    instrument: instruments.drum4, instrumentsList: [instruments.drum4, instruments.drum4B], currentVariation: 0, active: false, subdiv: "16n",
    grooves: [
      [_, _, n("G2"), _, _, _, n("C2"), _, _, _, n("G2"), _, n("G2"), _, n("C2"), _],
      [n("G2"), _, _, n("C2"), _, n("G2"), _, _, n("C2"), _, _, n("G2"), n("C2"), _, _, n("G2")],
      [n("G2"), _, n("G2"), n("C2"), _, n("C2"), n("G2"), _, n("C2"), _, n("G2"), _, _, n("C2"), n("G2"), _],
      [_, n("C2"), n("C2"), n("C2"), _, n("G2"), n("G2"), n("G2"), _, n("C2"), n("C2"), _, n("G2"), _, _, _],
    ]
  }
};

// Construct sequences
Object.keys(patterns).forEach(id => {
  const p = patterns[id];

  // Randomize the default variation on load so the first press isn't always the first pattern
  p.currentVariation = Math.floor(Math.random() * p.grooves.length);

  p.sequence = new Tone.Sequence(
    (time, el) => {
      // THE FIX: If the pad is not active, do not play the note!
      if (!p.active || !el) return;

      // Open/Close Hat dynamic duration logic
      if (id === 'drum3') {
        p.instrument.envelope.decay = el.dur === "8n" ? 0.3 : 0.05;
      }

      // NoiseSynths don't accept note arguments, only duration!
      if (id === 'drum2') {
        p.instrument.triggerAttackRelease(el.dur, time);
      } else {
        p.instrument.triggerAttackRelease(el.note, el.dur, time);
      }
    },
    p.grooves[p.currentVariation],
    p.subdiv
  ).start(0);
});

// Initialization
startBtn.addEventListener('click', async () => {
  statusText.innerText = "Loading samples...";
  startBtn.innerText = "LOADING...";

  await Tone.start();

  // Mute destination instantly to hide any startup clicks, then fade it in
  Tone.Destination.volume.rampTo(-Infinity, 0);

  Tone.Transport.bpm.value = 122;
  Tone.Transport.start();

  // Fade volume back up to normal gracefully to prevent pops
  Tone.Destination.volume.rampTo(-3, 0.1);

  overlay.style.display = 'none';
  isInitialized = true;
  drawVisualizer();
});

// Interaction Logic
const PRESS_THRESHOLD = 500;
const touchStates = {};

pads.forEach(pad => {
  const handleDown = (e) => {
    e.preventDefault();
    if (!isInitialized) return;
    const id = pad.dataset.id;
    touchStates[id] = Date.now();
    pad.style.transform = 'scale(0.95)';
  };

  const handleUp = (e) => {
    e.preventDefault();
    if (!isInitialized) return;
    const id = pad.dataset.id;
    pad.style.transform = 'scale(1)';

    if (touchStates[id]) {
      const duration = Date.now() - touchStates[id];
      const p = patterns[id];

      if (duration < PRESS_THRESHOLD) {
        // Short press toggle loop
        if (!p.active) {
          p.active = true;
          p.currentVariation = Math.floor(Math.random() * p.grooves.length);
          if (p.instrumentsList) {
            p.instrument = p.instrumentsList[Math.floor(Math.random() * p.instrumentsList.length)];
          }
          p.sequence.events = p.grooves[p.currentVariation];
          channels[id].mute = false;
          pad.classList.add('active-loop');
          pad.style.filter = 'brightness(2) drop-shadow(0 0 20px white)';
          setTimeout(() => { pad.style.filter = ''; }, 100);
        } else {
          // If already active, switch to a random variation (avoiding the same one)
          let newVariation = Math.floor(Math.random() * p.grooves.length);
          if (newVariation === p.currentVariation && p.grooves.length > 1) {
            newVariation = (newVariation + 1) % p.grooves.length;
          }
          p.currentVariation = newVariation;
          if (p.instrumentsList) {
            p.instrument = p.instrumentsList[Math.floor(Math.random() * p.instrumentsList.length)];
          }
          p.sequence.events = p.grooves[p.currentVariation];
          pad.style.filter = 'brightness(1.5)';
          setTimeout(() => { pad.style.filter = ''; }, 100);
        }
      } else {
        // Long press stop loop
        p.active = false;
        channels[id].mute = true;
        pad.classList.remove('active-loop');
        if (p.instrumentsList) {
          p.instrumentsList.forEach(inst => { if (inst.releaseAll) inst.releaseAll(); });
        } else {
          if (p.instrument.releaseAll) p.instrument.releaseAll();
        }
      }
      delete touchStates[id];
    }
  };

  pad.addEventListener('mousedown', handleDown);
  pad.addEventListener('touchstart', handleDown, { passive: false });
  pad.addEventListener('mouseup', handleUp);
  pad.addEventListener('touchend', handleUp, { passive: false });
  pad.addEventListener('mouseleave', () => {
    pad.style.transform = 'scale(1)';
    if (touchStates[pad.dataset.id]) {
      // Interpret slide off as a stop command
      const id = pad.dataset.id;
      const p = patterns[id];
      p.active = false;
      channels[id].mute = true;
      pad.classList.remove('active-loop');
      if (p.instrumentsList) {
        p.instrumentsList.forEach(inst => { if (inst.releaseAll) inst.releaseAll(); });
      } else {
        if (p.instrument.releaseAll) p.instrument.releaseAll();
      }
      delete touchStates[pad.dataset.id];
    }
  });
});

// Visualizer logic
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const offscreen = document.createElement('canvas');
const oCtx = offscreen.getContext('2d');
let timePhase = 0;

// Visualizer Touch FX
let isVisualizerTouched = false;
let touchX = 0; // Mapped 0 to width (bottom-left origin)
let touchY = 0; // Mapped 0 to height (bottom-left origin)
let visualX = 0; // Standard top-left origin canvas X
let visualY = 0; // Standard top-left origin canvas Y

const updateFilters = () => {
  const normX = Math.max(0, Math.min(1, touchX / canvas.width));
  const normY = Math.max(0, Math.min(1, touchY / canvas.height));

  const hpfMin = 200;
  const hpfMax = 5000;
  const hpfFreq = hpfMin * Math.pow(hpfMax / hpfMin, normX);
  touchHPF.frequency.rampTo(hpfFreq, 0.5);

  const lpfMin = 200;
  const lpfMax = 5000;
  const lpfFreq = lpfMin * Math.pow(lpfMax / lpfMin, normY);
  touchLPF.frequency.rampTo(lpfFreq, 0.5);
};

const handleCanvasMove = (e) => {
  if (e.cancelable) e.preventDefault();
  if (!isInitialized || !isVisualizerTouched) return;

  const rect = canvas.getBoundingClientRect();
  visualX = e.clientX - rect.left;
  visualY = e.clientY - rect.top;

  // Set bottom-left axis center for filter calculations
  touchX = visualX;
  touchY = rect.height - visualY;

  updateFilters();
};

const handleCanvasDown = (e) => {
  if (e.cancelable) e.preventDefault();
  isVisualizerTouched = true;
  handleCanvasMove(e);
};

const handleCanvasUp = (e) => {
  if (e.cancelable) e.preventDefault();
  if (!isVisualizerTouched) return;
  isVisualizerTouched = false;
  touchHPF.frequency.rampTo(20, 0.5);
  touchLPF.frequency.rampTo(20000, 0.5);
};

canvas.addEventListener('pointerdown', handleCanvasDown);
canvas.addEventListener('pointermove', handleCanvasMove);
canvas.addEventListener('pointerup', handleCanvasUp);
canvas.addEventListener('pointerleave', handleCanvasUp);
canvas.addEventListener('pointercancel', handleCanvasUp);
canvas.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });

function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
  offscreen.width = canvas.width;
  offscreen.height = canvas.height;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  if (!isInitialized) return;

  const values = waveform.getValue();
  const width = canvas.width;
  const height = canvas.height;

  let maxAmp = 0;
  for (let i = 0; i < values.length; i++) {
    if (Math.abs(values[i]) > maxAmp) maxAmp = Math.abs(values[i]);
  }

  timePhase += 0.05 + (maxAmp * 0.1);

  oCtx.fillStyle = 'rgba(26, 29, 36, 0.2)';
  oCtx.fillRect(0, 0, width, height);

  const numFractals = 3;
  for (let f = 0; f < numFractals; f++) {
    oCtx.beginPath();
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const x = width * (i / values.length);
      const phaseOffset = f * (Math.PI / 1.5) + timePhase;
      const fractalY = Math.sin((i / 20) + phaseOffset) * 20 * maxAmp;
      const y = (v * 0.6 + 0.5) * height + fractalY;

      if (i === 0) oCtx.moveTo(x, y);
      else oCtx.lineTo(x, y);
    }

    const colors = [
      `rgba(59, 130, 246, ${Math.max(0.2, maxAmp * 1.5)})`,
      `rgba(16, 185, 129, ${Math.max(0.2, maxAmp * 1.5)})`,
      `rgba(239, 68, 68, ${Math.max(0.2, maxAmp * 1.5)})`
    ];

    oCtx.strokeStyle = colors[f % colors.length];
    oCtx.lineWidth = 2 + maxAmp * 3;
    oCtx.stroke();
  }

  ctx.fillStyle = '#1a1d24';
  ctx.fillRect(0, 0, width, height);

  let cx = width / 2;
  let cy = height / 2;
  if (isVisualizerTouched) {
    cx = visualX;
    cy = visualY;
  }

  const sides = 6;
  const slice = (Math.PI * 2) / sides;
  const radius = Math.max(width, height);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(timePhase * 0.1);

  for (let i = 0; i < sides; i++) {
    ctx.save();
    ctx.rotate(i * slice);
    if (i % 2 !== 0) ctx.scale(1, -1);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius, Math.tan(slice / 2) * radius);
    ctx.lineTo(radius, -Math.tan(slice / 2) * radius);
    ctx.closePath();
    ctx.clip();
    ctx.rotate(-timePhase * 0.2);
    ctx.drawImage(offscreen, -cx, -cy);
    ctx.restore();
  }

  ctx.beginPath();
  const polyRadius = Math.min(width / 2, height / 2) * 0.8 + (maxAmp * 20);
  for (let i = 0; i <= sides; i++) {
    const angle = i * slice;
    const px = Math.cos(angle) * polyRadius;
    const py = Math.sin(angle) * polyRadius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.lineWidth = 4;
  ctx.strokeStyle = `rgba(59, 130, 246, ${0.4 + maxAmp * 0.6})`;
  ctx.stroke();

  for (let i = 0; i < sides; i++) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const angle = i * slice;
    ctx.lineTo(Math.cos(angle) * polyRadius, Math.sin(angle) * polyRadius);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + maxAmp * 0.3})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // Draw touch point if active
  if (isVisualizerTouched) {
    const drawX = visualX;
    const drawY = visualY;

    ctx.beginPath();
    ctx.arc(drawX, drawY, 20 + maxAmp * 10, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${0.3 + maxAmp * 0.5})`;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
    ctx.stroke();

    // Crosshairs
    ctx.beginPath();
    ctx.moveTo(drawX, 0);
    ctx.lineTo(drawX, height);
    ctx.moveTo(0, drawY);
    ctx.lineTo(width, drawY);
    ctx.strokeStyle = `rgba(255, 255, 255, 0.15)`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const transportPos = Tone.Transport.position.split(':');
  const beat = parseInt(transportPos[1]) || 0;
  statusText.innerText = `BPM: ${Math.round(Tone.Transport.bpm.value)} | BEAT: ${beat + 1}`;
}
