import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/lib/api';
import { Button } from './ui/button';
export function TopicActions({ id, topic, index }) {
  const [done,setDone]=useState(!!topic.completed),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const navigate=useNavigate();
  async function update(completed){setBusy(true);setError('');try{await api.patch(`/interviews/${id}/roadmap`,{index,completed});setDone(completed);}catch(e){setError(e.response?.data?.error||'Progress could not be saved. Please retry.');}finally{setBusy(false);}}
  async function practice(){setBusy(true);setError('');try{const {data}=await api.post(`/interviews/${id}/practice`,{index});if(!data?._id)throw new Error();navigate(`/interview/${data._id}`);}catch(e){setError(e.response?.data?.error||'Could not create practice. Please retry.');setBusy(false);}}
  return <div className="no-print space-y-3 border-t pt-4"><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex gap-2 text-sm"><input type="checkbox" checked={done} disabled={busy} onChange={e=>update(e.target.checked)}/>I completed this learning task</label><Button disabled={busy} onClick={practice}>{busy?'Saving…':'Practice this topic'}</Button></div>{error&&<p role="alert" className="text-sm text-red-700">{error}</p>}</div>;
}
export function ReportPrint({ feedback }) {
  return <><div className="no-print flex flex-wrap gap-3"><Button variant="outline" onClick={()=>window.print()}>Print / save PDF</Button><Link className="rounded-lg border px-4 py-2 text-sm" to="/data">Export or delete data</Link></div><section className="report-print"><h1>MockAI · Interview learning report</h1><p>{feedback.role} · {feedback.type} · {new Date(feedback.date).toLocaleDateString()}</p><p>{feedback.evaluationSource==='gemini'?`AI practice score: ${feedback.score}/100. AI guidance may contain errors.`:'Not AI-assessed. No validated ability score.'}</p><h2>Next steps</h2><ul>{feedback.improvements?.slice(0,3).map((item,i)=><li key={i}>{item}</li>)}</ul>{feedback.questionFeedback?.map((q,i)=><article key={i}><h2>{i+1}. {q.question}</h2><h3>Your answer</h3><p>{q.answer||'No answer'}</p><h3>Feedback {feedback.evaluationSource==='gemini'?`· ${q.score}/100`:''}</h3><p>{q.feedback}</p><p>{q.evidence?.map(quote=>`“${quote}”`).join('\n')}</p><h3>Reference answer</h3><p>{q.correctAnswer||'Unavailable'}</p><p>{q.practiceTask}</p></article>)}<h2>Study roadmap</h2>{feedback.roadmap?.map((topic,i)=><article key={i}><h3>{topic.topic} · {topic.priority}</h3><p>{topic.summary}</p><ul>{topic.steps?.map((step,n)=><li key={n}>{step}</li>)}</ul><p>Practice: {topic.practiceTask}</p><p>Success check: {topic.successCriteria}</p></article>)}</section></>;
}
