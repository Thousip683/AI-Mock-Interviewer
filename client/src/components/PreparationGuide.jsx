import { enterFullscreen, leaveFullscreen, useFullscreen } from '@/lib/fullscreen';
import { useRef, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2, Maximize, Minimize } from 'lucide-react';
function StudyTopic({ topic, index, compact }) {
  const card = useRef(null);
  const content = useRef(null);
  const fullscreen = useFullscreen();
  const expanded = fullscreen && typeof document !== 'undefined' && document.fullscreenElement === card.current;
  const label = expanded ? `Exit fullscreen: ${topic.topic}` : `Expand notes: ${topic.topic}`;
  return <section ref={card} className="study-fullscreen relative rounded-2xl border bg-background p-4 sm:p-5">
    <button type="button" className="absolute right-3 top-3 rounded-lg p-2 text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={label} title={expanded ? 'Exit fullscreen' : 'Expand topic'} onClick={() => {
      if (expanded) leaveFullscreen();
      else { if (content.current) content.current.open = true; enterFullscreen(card.current); }
    }}>{expanded ? <Minimize className="h-4 w-4"/> : <Maximize className="h-4 w-4"/>}</button>
    <details ref={content} open={compact ? undefined : true} className="study-branch">
      <summary className="cursor-pointer pr-10 font-semibold leading-6 text-primary">{String(index + 1).padStart(2, '0')} · {topic.topic}</summary>
      <p className="mt-3 text-sm leading-7">{topic.summary}</p>
      <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-primary">Must remember</p>
      <ul className="list-disc space-y-2 pl-4 text-sm leading-7">{topic.keyPoints.map((point,j)=><li key={j}>{point}</li>)}</ul>
      <p className="mt-4 border-t pt-3 text-sm leading-7"><strong>Try aloud:</strong> {topic.practiceTask}</p>
    </details>
  </section>;
}

export default function PreparationGuide({ interview, compact = false }) {
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function load() {
    setLoading(true); setError('');
    try {
      const { data } = await api.post(`/interviews/${interview._id}/preparation`);
      if (!data.topics?.length) throw new Error('No study topics were returned. Please retry.');
      setTopics(data.topics);
    } catch (e) { setError(e.response?.data?.error || e.message || 'Could not prepare your guide. Please retry.'); }
    finally { setLoading(false); }
  }
  if (compact) return <div className="contents"><div><Button className="h-11 w-full rounded-xl" variant="outline" disabled={loading} onClick={load} title="Generate optional study notes"><BookOpen className="mr-2 h-4 w-4" />{loading ? 'Preparing…' : topics.length ? 'Refresh notes' : 'Study notes'}</Button></div>{error && <p role="alert" className="text-xs text-red-700 sm:col-span-3">{error}</p>}{!!topics.length && <div className="grid gap-3 sm:col-span-3 sm:grid-cols-2">{topics.map((topic,index)=><StudyTopic key={index} topic={topic} index={index} compact/>)}</div>}</div>;
  return <section className="preparation-guide text-left surface-card my-6 rounded-3xl border bg-white p-6 sm:p-8" aria-label="Pre-interview study guide">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">A moment to prepare</p><h2 className="mt-2 text-3xl">Your quick study desk</h2><p className="mt-2 text-sm text-muted-foreground">{interview.role} · {interview.experience} · {interview.type}</p></div>{!topics.length && <Button variant="outline" disabled={loading} onClick={load}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BookOpen className="mr-2 h-4 w-4"/>}{loading ? 'Preparing your notes…' : 'Generate quick study notes'}</Button>}</div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">Optional, AI-generated revision tailored to your selections and focus areas. These are preparation notes, not a preview of your questions.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{topics.map((topic,index)=><StudyTopic key={index} topic={topic} index={index}/>)}</div>
  </section>;
}
