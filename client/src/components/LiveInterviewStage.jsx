import { enterFullscreen, leaveFullscreen, useFullscreen } from '@/lib/fullscreen';
import { Clock3, Mic, MicOff, PhoneOff, Sparkles, Pause, Play, Loader2, Maximize, Minimize } from 'lucide-react';
import AudioWaveform from './AudioWaveform';
import './live-interview-stage.css';

export default function LiveInterviewStage({ interview, live, elapsed, transcript, onFinish }) {
  const fullscreen = useFullscreen();
  const still = live.paused;
  const active = ['listening', 'speaking'].includes(live.status);
  const busy = ['connecting', 'finishing'].includes(live.status);

  const label = live.paused ? 'Interview paused' : live.status === 'connecting' ? 'Connecting your interviewer…' : live.status === 'finishing' ? 'Saving your conversation…' : live.muted ? 'Your microphone is muted' : live.status === 'speaking' ? 'Interviewer speaking' : 'Listening to you';
  return <main className={`conversation-stage ${still ? 'conversation-still' : ''}`} aria-label="Live interview">
    <div className="conversation-atmosphere" aria-hidden="true">
      <div className="conversation-aura conversation-aura-one"/><div className="conversation-aura conversation-aura-two"/>
      <svg className="conversation-threads" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        {Array.from({length:16},(_,i)=><path key={i} d={`M ${1000+i*26} -100 C ${700+i*32} 250, ${1650-i*22} 350, ${1100+i*25} 1000`}/>)}
        <g className="conversation-mesh"><path d="M0 60 230 170 45 340 280 490 100 720 350 900M0 60 45 340 0 600 100 720M230 170 280 490 350 900M45 340 330 270 280 490 0 600M0 600 300 680 100 720"/>{[[230,170],[45,340],[280,490],[100,720],[330,270],[300,680]].map(([cx,cy],i)=><circle key={i} cx={cx} cy={cy} r="3"/>)}</g>
      </svg>
      {Array.from({length:24},(_,i)=><span className="conversation-particle" key={i} style={{'--x':`${(i*37+9)%100}%`,'--y':`${(i*23+11)%100}%`,'--size':`${5+(i%5)*4}px`,'--delay':`${-i*1.7}s`,'--duration':`${16+(i%7)*3}s`}}/>)}
    </div>
    <header className="conversation-topbar">
      <span className="conversation-timer"><Clock3 size={18} aria-hidden="true"/>{String(Math.floor(elapsed/60)).padStart(2,'0')}:{String(elapsed%60).padStart(2,'0')}</span>
      <div className="conversation-role"><Sparkles size={15} aria-hidden="true"/><span>{interview.role}</span><span className="conversation-live-tag">LIVE</span></div>
      <div className="conversation-top-actions">
        <button type="button" className="conversation-motion" onClick={()=>fullscreen ? leaveFullscreen() : enterFullscreen()} title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>{fullscreen ? <Minimize size={17}/> : <Maximize size={17}/>}<span>{fullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span></button>
        <button type="button" className="conversation-motion" disabled={!active} aria-pressed={!!live.paused} onClick={live.togglePause} title={live.paused ? 'Resume interview' : 'Pause interview'}>{live.paused ? <Play size={16}/> : <Pause size={16}/>}<span>{live.paused ? 'Resume' : 'Pause'}</span></button>
      </div>
    </header>
    <div className="conversation-center">
      <div className={`conversation-glass ${live.status === 'speaking' ? 'conversation-speaking' : ''}`}>
        <div className="conversation-glass-shine" aria-hidden="true"/>
        <AudioWaveform active={active && !still} level={live.level} className="conversation-wave"/>
        <span className="conversation-glass-caption">MOCKAI · YOUR INTERVIEW STUDIO</span>
      </div>
      <h1 className="conversation-status" role="status" aria-live="polite">{busy && <Loader2 className="animate-spin" size={20}/ >}{label}</h1>
      <div className="conversation-prompt"><span className="conversation-prompt-label">Live captions</span><p>{live.caption || (live.status === 'listening' ? 'Your turn — take your time.' : '…')}</p></div>
      <div className="conversation-controls" aria-label="Interview controls">
        {active && <button type="button" disabled={live.paused} onClick={live.toggleMute} aria-pressed={live.muted}>{live.muted ? <MicOff size={18}/> : <Mic size={18}/>}<span>{live.muted ? 'Unmute' : 'Mute'}</span></button>}
        {live.status === 'connecting' && <button type="button" onClick={live.cancel}>Cancel connection</button>}
        {(active || live.status === 'finishing') && <button type="button" className="conversation-end" disabled={busy} onClick={onFinish}><PhoneOff size={18}/><span>{live.status === 'finishing' ? 'Saving…' : 'End interview'}</span></button>}
      </div>
      <p className="conversation-save-status">{live.savedAt ? `Transcript saved · ${new Date(live.savedAt).toLocaleTimeString()}` : 'Your conversation is transcribed for feedback'}</p>
      {live.error && <p className="conversation-error" role="alert">{live.error}</p>}

    </div>
  </main>;
}
