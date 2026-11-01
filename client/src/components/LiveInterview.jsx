import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, AudioLines, ArrowLeft, Headphones, Loader2, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import useLiveInterview from '@/hooks/useLiveInterview';

const labels = { idle: 'Ready when you are', connecting: 'Connecting your interviewer…', listening: 'Listening to you', speaking: 'Interviewer speaking', finishing: 'Saving transcript & preparing feedback…', error: 'Session paused', finished: 'Interview complete' };

export default function LiveInterview({ interview }) {
  const id = interview._id;
  const navigate = useNavigate();
  const live = useLiveInterview(id);
  const [voice, setVoice] = useState('Kore');
  const bottom = useRef(null);
  const active = ['listening', 'speaking'].includes(live.status);
  const busy = ['connecting', 'finishing'].includes(live.status);
  const transcript = live.transcript.length ? live.transcript : interview.liveTranscript || [];
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [transcript]);
  useEffect(() => {
    if (!active && !busy) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [active, busy]);

  return (
    <main className="container max-w-6xl py-8">
      <Button variant="ghost" className="mb-5" disabled={busy} onClick={() => navigate('/dashboard')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to dashboard
      </Button>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-primary">Live voice interview</p>
          <h1 className="text-3xl font-bold">{interview.role}</h1>
          <p className="mt-2 text-muted-foreground">{interview.experience} level · {interview.type} · About {interview.questionCount || 5} main questions</p>
        </div>
        <span className="rounded-full border bg-background px-4 py-2 text-sm">Hands-free conversation</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-9">
          <div className="flex min-h-64 flex-col items-center justify-center text-center">
            <div className={`mb-7 flex h-28 w-28 items-center justify-center rounded-full bg-violet-500/20 ring-1 ring-violet-300/30 ${live.status === 'speaking' ? 'animate-pulse' : ''}`}>
              {busy ? <Loader2 className="h-12 w-12 animate-spin text-violet-200" /> : <AudioLines className="h-12 w-12 text-violet-200" />}
            </div>
            <h2 className="text-xl font-semibold" role="status" aria-live="polite">{live.muted && active ? 'Microphone muted' : labels[live.status]}</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">Speak naturally. Take a moment to think, ask for clarification, or interrupt the interviewer when you need to.</p>
            <div className="mt-6 flex h-8 items-end gap-1" aria-label="Microphone activity">
              {Array.from({ length: 19 }, (_, i) => <span key={i} className="w-1.5 rounded-full bg-violet-300 transition-all duration-100" style={{ height: `${4 + live.level * (16 + (i % 5) * 4)}px` }} />)}
            </div>
          </div>
          {!active && !busy && <label className="mt-5 text-sm text-slate-300">Interviewer voice
            <select className="mt-2 block w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-white" value={voice} onChange={event => setVoice(event.target.value)}>
              <option value="Kore">Kore · composed</option><option value="Puck">Puck · upbeat</option><option value="Zephyr">Zephyr · bright</option><option value="Charon">Charon · steady</option><option value="Fenrir">Fenrir · direct</option>
            </select>
          </label>}
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {!active && !busy && <Button variant="gradient" size="lg" onClick={() => live.start(voice)}><Mic className="mr-2 h-4 w-4" />{transcript.length ? 'Reconnect & continue' : 'Start live interview'}</Button>}
            {active && <Button variant="secondary" onClick={live.toggleMute} aria-pressed={live.muted}>{live.muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}{live.muted ? 'Unmute' : 'Mute'}</Button>}
            {(active || transcript.some(turn => turn.speaker === 'user')) && <Button variant="destructive" disabled={busy} onClick={async () => { if (await live.finish()) navigate(`/feedback/${id}`); }}><PhoneOff className="mr-2 h-4 w-4" />End interview & get feedback</Button>}
          </div>
          <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400"><Headphones className="h-4 w-4" /> Headphones help prevent speaker echo.</p>
          <p className="mt-5 text-xs leading-5 text-slate-400">Your microphone streams to Gemini during the session. Transcripts are saved for feedback; audio recordings are not stored. Feedback evaluates your words, not your vocal tone. Leaving this page stops the microphone. You can resume from the saved transcript.</p>
        </section>
        <section className="flex min-h-[32rem] flex-col rounded-3xl border bg-card shadow-sm">
          <div className="border-b px-6 py-5"><h2 className="font-semibold">Conversation</h2><p className="mt-1 text-sm text-muted-foreground">Live captions may contain transcription errors.</p></div>
          {live.error && <div role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{live.error}</div>}
          <div className="max-h-[36rem] flex-1 space-y-5 overflow-y-auto p-6" aria-label="Interview transcript">
            {!transcript.length && <div className="flex h-full min-h-64 flex-col items-center justify-center text-center text-muted-foreground"><AudioLines className="mb-4 h-8 w-8" /><p>Your conversation will appear here.</p><p className="mt-2 max-w-xs text-sm">Start when you’re ready. The interviewer will greet you and ask the first question.</p></div>}
            {transcript.map((turn, index) => <article key={index} className={`max-w-[95%] rounded-2xl p-4 ${turn.speaker === 'user' ? 'ml-auto bg-primary/10' : 'bg-muted'}`}>
              <p className="mb-2 text-xs font-semibold text-muted-foreground">{turn.speaker === 'user' ? 'You' : 'Interviewer'}{turn.interrupted ? ' · interrupted' : ''}</p>
              <p className="whitespace-pre-wrap text-sm leading-6">{turn.text}</p>
            </article>)}
            <div ref={bottom} />
          </div>
        </section>
      </div>
    </main>
  );
}
