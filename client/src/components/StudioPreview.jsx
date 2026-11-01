import { useState } from 'react';
import { Mic, BookOpen, Route } from 'lucide-react';

const scenes = [
  { title: 'The conversation', label: 'Speak naturally', icon: Mic, detail: 'An interviewer that listens, follows up, and gives you room to think.', tag: 'Live voice · your pace' },
  { title: 'The perspective', label: 'See your feedback', icon: BookOpen, detail: 'Understand every answer with clear scores, reference answers, and concise study notes.', tag: 'A clearer picture of your skills' },
  { title: 'The next chapter', label: 'Find your direction', icon: Route, detail: 'Turn the gaps into a practical roadmap: learn, practice, and check your progress.', tag: 'Small steps. Stronger answers.' },
];
export default function StudioPreview() {
  const [selected, setSelected] = useState(0);
  const scene = scenes[selected];
  const Icon = scene.icon;
  const tilt = event => {
    if (event.pointerType !== 'mouse') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--tilt-x', `${-(event.clientY - bounds.y - bounds.height / 2) / 80}deg`);
    event.currentTarget.style.setProperty('--tilt-y', `${(event.clientX - bounds.x - bounds.width / 2) / 80}deg`);
  };
  return <section aria-label="Explore the interview experience" className="studio-scene relative" onPointerMove={tilt} onPointerLeave={event => { event.currentTarget.style.setProperty('--tilt-x', '0deg'); event.currentTarget.style.setProperty('--tilt-y', '0deg'); }}>
    <div className="studio-object relative rounded-[2rem] border border-white bg-gradient-to-br from-[#f6e9e3] to-[#ecd3d5] px-4 pb-6 pt-2 sm:px-7">
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-medium text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />Your personal interview studio</div>
      <img src="/images/interview-studio.svg" alt="Dimensional illustration of a burgundy microphone, study notes and a quiet interview studio" className="mx-auto w-full max-w-lg" width="640" height="580" />
      <div className="studio-caption relative -mt-12 rounded-2xl border border-white bg-white/90 p-5 sm:mx-4" aria-live="polite" aria-atomic="true">
        <div className="flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2.5 text-primary"><Icon className="h-5 w-5" /></span><div><p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{scene.tag}</p><h2 className="mt-1 text-2xl">{scene.title}</h2></div></div>
        <p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{scene.detail}</p>
      </div>
    </div>
    <div className="mt-4 grid grid-cols-3 gap-2" role="group" aria-label="Preview stages">{scenes.map((item, index) => <button key={item.label} type="button" aria-pressed={selected === index} onClick={() => setSelected(index)} className={`rounded-xl border px-2 py-3 text-xs font-medium transition-colors sm:text-sm ${selected === index ? 'border-primary bg-primary text-white shadow-lg shadow-primary/15' : 'border-border bg-white hover:bg-accent'}`}>{item.label}</button>)}</div>
  </section>;
}
