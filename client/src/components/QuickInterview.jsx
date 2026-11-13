import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Mic, MicOff, RotateCcw } from 'lucide-react';
import { PublicNav } from './LandingPage';

const prompts = [
  { question: 'Tell me a little about yourself.', hint: 'Present \u2192 past \u2192 future. What are you learning or doing now, what shaped your interest, and what would you like to do next?', example: "I'm studying [subject], and I enjoy [specific area]. In [project or experience], I worked on [your contribution]. I'm now looking for an opportunity to [goal]." },
  { question: 'What is a strength you bring to a team?', hint: 'Choose one strength and a real example. Explain what you did and how it helped.', example: 'One strength is [skill]. When [situation], I [specific action]. This helped [result]. I would bring that same approach to a new team.' },
  { question: 'What are you working to get better at?', hint: 'Be honest, specific, and forward-looking. Describe one action you are taking and how you will measure progress.', example: "I'm improving [skill]. I noticed [specific gap], so I've started [action]. I'll know I'm improving when [observable outcome]." },
];

/* ── Text Mode ───────────────────────────────────────────────── */
function TextMode() {
  const [index, setIndex] = useState(0), [answers, setAnswers] = useState(['', '', '']);
  const [listening, setListening] = useState(false), [error, setError] = useState('');
  const recognition = useRef(null);
  const stop = () => { if (recognition.current) { recognition.current.onresult = null; recognition.current.stop(); recognition.current = null; } setListening(false); };
  useEffect(() => () => { if (recognition.current) { recognition.current.onresult = null; recognition.current.stop(); } }, []);
  function dictate() {
    if (listening) { stop(); return; }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { setError('Dictation is unavailable in this browser. You can type your answer.'); return; }
    const next = new Speech(); recognition.current = next; next.continuous = true; next.lang = 'en-US';
    next.onresult = event => { for (let i = event.resultIndex; i < event.results.length; i++) if (event.results[i].isFinal) { const words = event.results[i][0].transcript; setAnswers(previous => previous.map((a, n) => n === index ? `${a} ${words}`.trim().slice(0, 5000) : a)); } };
    next.onerror = () => { setError('Check microphone permission or continue by typing.'); setListening(false); };
    next.onend = () => setListening(false);
    try { next.start(); setListening(true); setError(''); } catch { setError('Could not start dictation. Please type instead.'); }
  }
  const finished = index === prompts.length;
  return !finished ? <div className="quick-card" key={index}><div className="quick-progress">{prompts.map((_, n) => <span key={n} className={n <= index ? 'active' : ''}/>)}</div><span className="eyebrow">PROMPT {index + 1} OF 3</span><h2>{prompts[index].question}</h2><p>{prompts[index].hint}</p><label htmlFor="quick-answer">Your answer</label><textarea id="quick-answer" value={answers[index]} maxLength={5000} onChange={e => setAnswers(answers.map((a,n) => n === index ? e.target.value : a))} placeholder="Start with a thought. You can refine it as you go."/><div className="quick-actions"><button onClick={dictate} aria-pressed={listening}><Mic size={18}/>{listening ? 'Stop dictation' : 'Use my microphone'}</button><button disabled={!answers[index].trim()} onClick={() => { stop(); setIndex(index + 1); }}>{index === 2 ? 'Review my answers' : 'Next prompt'}<ArrowRight size={18}/></button></div>{index > 0 && <button className="text-link" onClick={() => { stop(); setIndex(index - 1); }}>Previous prompt</button>}{error && <p role="alert">{error}</p>}</div> : <div className="space-y-5"><h1 style={{display:'none'}}>Your story, taking shape.</h1>{prompts.map((prompt,n) => <article className="quick-card" key={n}><h2>{prompt.question}</h2><p className="whitespace-pre-wrap">{answers[n]}</p><details><summary>Compare with an answer structure</summary><p>{prompt.example}</p></details><label className="mt-4 flex gap-3"><input type="checkbox"/>I used a specific example and kept it relevant.</label></article>)}<p>Ready for feedback tailored to your answers? Start a saved AI interview.</p><div className="quick-actions"><button onClick={() => setIndex(0)}><RotateCcw size={18}/>Refine my answers</button><Link to="/create-interview?personal=true">Get an AI interview <ArrowRight size={18}/></Link></div></div>;
}

/* ── Voice Mode ──────────────────────────────────────────────── */
function VoiceMode() {
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [voiceAnswers, setVoiceAnswers] = useState(['', '', '']);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [phase, setPhase] = useState('reading'); // 'reading' | 'listening' | 'done-prompt' | 'review'
  const [error, setError] = useState('');
  const recognition = useRef(null);
  const synthSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const SpeechAPI = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const stopRecognition = useCallback(() => {
    if (recognition.current) { recognition.current.onresult = null; recognition.current.onend = null; recognition.current.stop(); recognition.current = null; }
    setRecording(false);
  }, []);

  const startRecognition = useCallback(() => {
    if (!SpeechAPI) { setError('Speech recognition is not supported in this browser. Please use the text tab.'); return; }
    setTranscript('');
    const r = new SpeechAPI(); recognition.current = r;
    r.continuous = true; r.lang = 'en-US'; r.interimResults = true;
    r.onresult = event => {
      let interim = '', final = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript + ' ';
        else interim += event.results[i][0].transcript;
      }
      setTranscript((final + interim).trim());
    };
    r.onerror = () => { setError('Microphone error. Check permissions.'); setRecording(false); };
    r.onend = () => setRecording(false);
    try { r.start(); setRecording(true); setError(''); } catch { setError('Could not start recording.'); }
  }, [SpeechAPI]);

  const speakPrompt = useCallback((idx) => {
    if (!synthSupported) { setPhase('listening'); startRecognition(); return; }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(prompts[idx].question);
    utt.rate = 0.92; utt.pitch = 1;
    utt.onend = () => { setTimeout(() => { setPhase('listening'); startRecognition(); }, 500); };
    setPhase('reading');
    window.speechSynthesis.speak(utt);
  }, [synthSupported, startRecognition]);

  // Start speaking on mount / prompt change
  useEffect(() => {
    if (phase === 'reading' && voiceIndex < prompts.length) speakPrompt(voiceIndex);
    return () => { window.speechSynthesis?.cancel(); stopRecognition(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceIndex]);

  // Keyboard: spacebar toggles recording when phase is 'listening'
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' && e.target === document.body && phase === 'listening') {
        e.preventDefault();
        if (recording) stopRecognition();
        else startRecognition();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, recording, stopRecognition, startRecognition]);

  function handleStop() {
    stopRecognition();
    setVoiceAnswers(prev => prev.map((a, n) => n === voiceIndex ? transcript || a : a));
    setPhase('done-prompt');
  }

  function handleNext() {
    // Save transcript into answers
    setVoiceAnswers(prev => prev.map((a, n) => n === voiceIndex ? transcript || a : a));
    if (voiceIndex < prompts.length - 1) {
      setVoiceIndex(i => i + 1);
      setTranscript('');
      setPhase('reading');
    } else {
      setPhase('review');
    }
  }

  if (!synthSupported && !SpeechAPI) {
    return <div className="quick-card"><p role="alert">Your browser does not support speech synthesis or speech recognition. Please use the <strong>Type your answer</strong> tab instead.</p></div>;
  }

  if (phase === 'review') {
    return <div className="space-y-5">{prompts.map((prompt, n) => <article className="quick-card" key={n}><h2>{prompt.question}</h2><p className="whitespace-pre-wrap">{voiceAnswers[n] || <em style={{color:'var(--muted-text)'}}>No answer recorded.</em>}</p><details><summary>Compare with an answer structure</summary><p>{prompt.example}</p></details><label className="mt-4 flex gap-3"><input type="checkbox"/>I used a specific example and kept it relevant.</label></article>)}<p>Ready for feedback tailored to your answers? Start a saved AI interview.</p><div className="quick-actions"><button onClick={() => { setVoiceIndex(0); setVoiceAnswers(['','','']); setTranscript(''); setPhase('reading'); }}><RotateCcw size={18}/>Start over</button><Link to="/create-interview?personal=true">Get an AI interview <ArrowRight size={18}/></Link></div></div>;
  }

  return (
    <div className="quick-voice-stage">
      <div className="quick-progress">{prompts.map((_, n) => <span key={n} className={n <= voiceIndex ? 'active' : ''}/>)}</div>
      <span className="eyebrow">PROMPT {voiceIndex + 1} OF 3</span>
      <p className="quick-voice-prompt">{prompts[voiceIndex].question}</p>

      {phase === 'reading' && <p style={{color:'var(--muted-text)',fontSize:13}}>Reading question aloud…</p>}

      {(phase === 'listening' || phase === 'done-prompt') && (
        <>
          <div className="voice-mic-ring" data-recording={recording}>
            <button
              className="launch-button"
              style={{width:72,height:72,borderRadius:'50%',padding:0,justifyContent:'center',gap:0}}
              onClick={() => recording ? handleStop() : startRecognition()}
              aria-label={recording ? 'Stop recording' : 'Start recording'}
            >
              {recording ? <MicOff size={28}/> : <Mic size={28}/>}
            </button>
          </div>
          {recording && <p style={{fontSize:11,color:'var(--muted-text)',letterSpacing:1.5}}>RECORDING — press Space or click to stop</p>}
          {!recording && phase === 'listening' && <p style={{fontSize:11,color:'var(--muted-text)',letterSpacing:1.5}}>Click the mic or press Space to start</p>}
          <div className="quick-voice-transcript">{transcript || <span style={{opacity:.5}}>Your spoken answer will appear here…</span>}</div>
          {phase === 'listening' && recording && (
            <button className="launch-button" onClick={handleStop}><MicOff size={18}/>Stop recording</button>
          )}
          {(phase === 'done-prompt' || (phase === 'listening' && !recording && transcript)) && (
            <button className="launch-button" onClick={handleNext}>{voiceIndex === 2 ? 'Review my answers' : 'Next prompt'}<ArrowRight size={18}/></button>
          )}
        </>
      )}

      {error && <p role="alert" style={{color:'#c0392b',fontSize:13}}>{error}</p>}
    </div>
  );
}

/* ── Main QuickInterview ─────────────────────────────────────── */
export default function QuickInterview() {
  const [mode, setMode] = useState('text');
  return (
    <main className="career-site quick-page">
      <PublicNav/>
      <section className="quick-shell">
        <Link className="text-link" to="/"><ArrowLeft size={16}/>Back home</Link>
        <div className="eyebrow">THE FIRST STEP / PERSONAL INTRODUCTION</div>
        <h1>Let's start with you.</h1>
        <p className="quick-intro">A guided practice exercise, not an AI assessment. Answers stay in this page's memory and disappear when you leave. Optional browser dictation may use your browser's speech service.</p>

        <div className="quick-mode-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'text'} className={mode === 'text' ? 'active' : ''} onClick={() => setMode('text')}>
            <Mic size={15} style={{opacity:.6}}/>Type your answer
          </button>
          <button role="tab" aria-selected={mode === 'voice'} className={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')}>
            <Mic size={15}/>Live voice
          </button>
        </div>

        {mode === 'text' ? <TextMode/> : <VoiceMode key="voice"/>}
      </section>
    </main>
  );
}
