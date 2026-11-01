import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { BookOpen, Loader2 } from 'lucide-react';
export default function PreparationGuide({ interview }) {
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
  return <section className="preparation-guide text-left surface-card my-6 rounded-3xl border bg-white p-6 sm:p-8" aria-label="Pre-interview study guide">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">A moment to prepare</p><h2 className="mt-2 text-3xl">Your quick study desk</h2><p className="mt-2 text-sm text-muted-foreground">{interview.role} · {interview.experience} · {interview.type}</p></div>{!topics.length && <Button variant="outline" disabled={loading} onClick={load}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BookOpen className="mr-2 h-4 w-4"/>}{loading ? 'Preparing your notes…' : 'Generate quick study notes'}</Button>}</div>
    <p className="mt-4 text-sm leading-6 text-muted-foreground">Optional, AI-generated revision tailored to your selections and focus areas. These are preparation notes, not a preview of your questions.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="mt-5 grid gap-3 sm:grid-cols-2">{topics.map((t,i) => <details key={i} open className="study-branch rounded-2xl border bg-background p-5"><summary className="cursor-pointer font-semibold text-primary">{String(i+1).padStart(2,'0')} · {t.topic}</summary><p className="mt-3 text-sm leading-6">{t.summary}</p><p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-primary">Must remember</p><ul className="list-disc space-y-2 pl-4 text-sm leading-6">{t.keyPoints.map((point,j)=><li key={j}>{point}</li>)}</ul><p className="mt-4 border-t pt-3 text-sm leading-6"><strong>Try aloud:</strong> {t.practiceTask}</p></details>)}</div>
  </section>;
}
