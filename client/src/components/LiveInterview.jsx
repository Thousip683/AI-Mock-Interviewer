import { enterFullscreen, leaveFullscreen } from '@/lib/fullscreen';
import LiveInterviewStage from './LiveInterviewStage';
import DeviceCheck from './DeviceCheck';
import PreparationGuide from '@/components/PreparationGuide';
import AudioWaveform from '@/components/AudioWaveform';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Mic, MicOff, AudioLines, ArrowLeft, Headphones, Loader2, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useLiveInterview from '@/hooks/useLiveInterview';

const labels = { idle: 'Ready when you are', connecting: 'Connecting your interviewer…', listening: 'Listening to you', speaking: 'Interviewer speaking', finishing: 'Saving transcript & preparing feedback…', error: 'Session paused', finished: 'Interview complete' };

export default function LiveInterview({ interview, embedded = false }) {
  const id = interview._id;
  const navigate = useNavigate();
  const live = useLiveInterview(id);
  const [voice, setVoice] = useState('Kore');
  const bottom = useRef(null);
  const [elapsed, setElapsed] = useState(interview.liveDurationSeconds || 0);
  const active = ['listening', 'speaking'].includes(live.status);
  const busy = ['connecting', 'finishing'].includes(live.status);
  useEffect(()=>{if(!active || live.paused)return;const started=Date.now();const initial=elapsed;const timer=setInterval(()=>setElapsed(initial+Math.floor((Date.now()-started)/1000)),1000);return()=>clearInterval(timer);},[active, live.paused]);
  const transcript = live.transcript.length ? live.transcript : interview.liveTranscript || [];
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [transcript]);
  useEffect(() => {
    if (!active && !busy) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active, busy]);

  if (active || busy) return <LiveInterviewStage interview={interview} live={live} elapsed={elapsed} transcript={transcript} onFinish={async()=>{if(await live.finish()) { await leaveFullscreen(); navigate(`/feedback/${id}`); }}} />;

  if (embedded && !active && !busy) return <section className="mt-6 rounded-2xl border border-primary/10 bg-gradient-to-br from-[#f5e7e6] to-white p-5 sm:p-6" aria-label="Interview setup">
    <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-3"><DeviceCheck compact/><PreparationGuide interview={interview} compact/></div>
    <div className="mt-5 flex flex-col gap-4 border-t border-primary/10 pt-5 sm:flex-row sm:items-end sm:justify-between">
      <label className="block text-xs font-medium text-muted-foreground sm:w-56">Interviewer voice<select className="mt-2 block h-11 w-full rounded-xl border bg-background px-3 text-sm text-foreground" value={voice} onChange={e=>setVoice(e.target.value)}><option value="Kore">Kore · composed</option><option value="Puck">Puck · upbeat</option><option value="Zephyr">Zephyr · bright</option><option value="Charon">Charon · steady</option><option value="Fenrir">Fenrir · direct</option></select></label>
      <Button className="h-11 rounded-full px-6" onClick={()=>{ enterFullscreen(); live.start(voice); }}><GraduationCap className="mr-2 h-5 w-5" aria-hidden="true" />{transcript.length ? 'Reconnect & continue' : 'Start live interview'}</Button>
    </div>
    <p className="mt-3 text-xs leading-5 text-muted-foreground">Use headphones. Your microphone streams to Gemini; transcripts are saved, audio recordings are not.</p>
    {live.error && <p role="alert" className="mt-3 text-sm text-red-800">{live.error}</p>}
  </section>;

  return (
    <main className={active || busy ? "live-focus-overlay" : embedded ? "mt-6" : "container max-w-5xl py-8"}>
      <Button hidden={embedded || active || busy} variant="ghost" className="mb-5" disabled={busy || active} onClick={() => navigate('/dashboard')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
      </Button>
      <div hidden={embedded || active || busy} className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Live voice interview</p>
          <h1 className="text-3xl font-bold">{interview.role}</h1>
          <p className="mt-2 text-muted-foreground">{interview.experience} level · {interview.type} · About {interview.questionCount || 5} main questions</p>
        </div>
        <span className="rounded-full border bg-background px-4 py-2 text-sm">Hands-free conversation</span>
      </div>
      {!active && !busy && <DeviceCheck/>}
      {!active && !busy && <PreparationGuide interview={interview} />}
      <div className="mb-4 flex flex-wrap justify-between gap-3 text-xs"><span>{active?'Connected':busy?'Connecting / saving':'Not connected'} · {Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,'0')}</span><span>{live.savedAt?`Transcript saved ${new Date(live.savedAt).toLocaleTimeString()}`:'Transcript saves are confirmed during the session'}</span></div>
      <div className="space-y-5">
        <section className="live-stage focused-interview flex flex-col rounded-3xl bg-slate-950 p-4 text-white shadow-xl sm:p-7">
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <AudioWaveform active={active || busy} level={live.level} className="mb-6 h-48 w-full max-w-xl sm:h-56" />
            <h2 className="text-xl font-semibold" role="status" aria-live="polite">{live.muted && active ? 'Microphone muted' : labels[live.status]}</h2>
            <p hidden={active || busy} className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Speak naturally. Take a moment to think, ask for clarification, or interrupt the interviewer when you need to.</p>
          </div>
          {!active && !busy && <label className="mt-5 text-sm text-slate-300">Interviewer voice
            <select className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" value={voice} onChange={event => setVoice(event.target.value)}>
              <option value="Kore">Kore · composed</option><option value="Puck">Puck · upbeat</option><option value="Zephyr">Zephyr · bright</option><option value="Charon">Charon · steady</option><option value="Fenrir">Fenrir · direct</option>
            </select>
          </label>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {live.status === 'connecting' && <Button variant="secondary" onClick={live.cancel}>Cancel connection</Button>}
            {!active && !busy && <Button variant="gradient" size="lg" onClick={() => { enterFullscreen(); live.start(voice); }}><Mic className="mr-2 h-4 w-4" />{transcript.length ? 'Reconnect & continue' : 'Start live interview'}</Button>}
            {active && <Button variant="secondary" onClick={live.toggleMute} aria-pressed={live.muted}>{live.muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}{live.muted ? 'Unmute' : 'Mute'}</Button>}
            {(active || transcript.some(turn => turn.speaker === 'user')) && <Button variant="destructive" disabled={busy} onClick={async () => { if (await live.finish()) navigate(`/feedback/${id}`); }}><PhoneOff className="mr-2 h-4 w-4" />End interview & get feedback</Button>}
          </div>
          <p hidden={active || busy} className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400"><Headphones className="h-4 w-4" /> Headphones help prevent speaker echo.</p>
          <p hidden={active || busy} className="mt-5 text-xs leading-5 text-slate-400">Your microphone streams to Gemini during the session. Transcripts are saved for feedback; audio recordings are not stored. Feedback evaluates your words, not your vocal tone. Leaving this page stops the microphone. You can resume from the saved transcript.</p>
        </section>
        <details className="rounded-3xl border bg-card shadow-sm"><summary className="cursor-pointer px-6 py-5 text-sm font-semibold">Show conversation captions</summary><section className="flex flex-col">
          <div className="border-b px-6 py-5"><h2 className="font-semibold">Conversation</h2><p className="mt-1 text-sm text-muted-foreground">Live captions may contain transcription errors.</p></div>

          <div className="max-h-[36rem] flex-1 space-y-5 overflow-y-auto p-6" aria-label="Interview transcript">
            {!transcript.length && <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-muted-foreground"><AudioLines className="mb-4 h-8 w-8" /><p>Your conversation will appear here.</p><p className="mt-2 max-w-xs text-sm">Start when you’re ready. The interviewer will greet you and ask the first question.</p></div>}
            {transcript.map((turn, index) => <article key={index} className={`max-w-[95%] rounded-2xl p-4 ${turn.speaker === 'user' ? 'ml-auto bg-primary/10' : 'bg-muted'}`}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{turn.speaker === 'user' ? 'You' : 'Interviewer'}{turn.interrupted ? ' · interrupted' : ''}</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{turn.text}</p>
            </article>)}
            <div ref={bottom} />
          </div>
        </section></details>
        {live.error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{live.error}</p>}
      </div>
    </main>
  );
}
