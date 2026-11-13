import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Sparkles, TrendingUp, SlidersHorizontal, History, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { assessed } from '@/lib/progress';
export default function ProgressPanel({ interviews }) {
  const [role, setRole]=useState('');
  const records=assessed(interviews).filter(item=>!role||item.role===role);
  const topics=new Map();
  records.forEach(item=>(item.feedback?.roadmap||[]).filter(t=>t.priority==='high'&&!t.completed).forEach(topic=>{const key=topic.topic.toLowerCase();const old=topics.get(key);topics.set(key,{topic:topic.topic,count:(old?.count||0)+1,id:item._id});}));
  const next=[...topics.values()].sort((a,b)=>b.count-a.count)[0];
  const skills=[['technicalScore','Role knowledge'],['communicationScore','Communication'],['relevanceScore','Relevance'],['depthScore','Depth']];
  return <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-r from-[#f5e7e6] to-white p-5 shadow-sm sm:p-8" aria-labelledby="progress-heading">
    <div className="flex flex-col justify-between gap-6 border-b border-primary/10 pb-6 lg:flex-row lg:items-center">
      <div className="flex items-start gap-4">
        <span className="hidden rounded-2xl bg-primary/10 p-3 text-primary sm:inline-flex"><TrendingUp className="h-6 w-6" aria-hidden="true" /></span>
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Your learning journey</p>
          <h2 id="progress-heading" className="font-serif text-3xl leading-tight sm:text-4xl">Your progress, with context</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">A clearer view of the skills you’re building, one conversation at a time.</p>
        </div>
      </div>
      <div className="w-full shrink-0 lg:w-56">
        <label htmlFor="progress-role" className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />View progress for</label>
        <select id="progress-role" className="w-full rounded-xl border border-primary/15 bg-background px-3 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40" value={role} onChange={e=>setRole(e.target.value)}>
          <option value="">All roles</option>{[...new Set(interviews.map(item=>item.role))].sort().map(value=><option key={value}>{value}</option>)}
        </select>
      </div>
    </div>
    {records.length ? <>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Your skill overview</h3>
        <span className="rounded-full bg-primary/5 px-3 py-1 text-xs text-primary">{records.length} AI-assessed {records.length === 1 ? 'attempt' : 'attempts'}</span>
      </div>
      <div className="my-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {skills.map(([key,label])=>{
          const values=records.map(item=>item.feedback?.[key]).filter(Number.isFinite);
          const avg=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):null;
          return <div key={key} className="rounded-2xl border border-primary/10 bg-background/70 p-5">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-3 flex items-baseline gap-1 font-serif text-4xl text-foreground">{avg===null?'—':avg}<span className="font-sans text-xs text-muted-foreground">{avg===null?'No score yet':'/ 100'}</span></p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-primary/10" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={avg ?? undefined} aria-valuetext={avg===null?'No score yet':`${avg} out of 100`}><div className="h-full rounded-full bg-primary transition-[width] duration-700 motion-reduce:transition-none" style={{width:`${Math.min(100,Math.max(0,avg||0))}%`}}/></div>
          </div>;
        })}
      </div>
      <p className="text-xs leading-5 text-muted-foreground">Averages from AI-assessed attempts. Scores are practice guidance, not hiring predictions.</p>
      <details className="group mt-6 overflow-hidden rounded-2xl border border-primary/10">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-primary/[0.03] px-5 py-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3"><History className="h-4 w-4 text-primary" aria-hidden="true" />Recent attempts by role and level</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="border-y bg-muted/30 text-xs text-muted-foreground"><tr>{['Completed','Role / level','Interview','AI score'].map(label=><th key={label} scope="col" className="px-5 py-3 font-medium">{label}</th>)}</tr></thead><tbody>{records.slice(0,12).map(item=><tr key={item._id} className="border-b last:border-0 hover:bg-primary/[0.02]"><td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{new Date(item.completedAt||item.createdAt).toLocaleDateString()}</td><td className="px-5 py-4"><span className="font-medium">{item.role}</span><span className="mt-1 block text-xs capitalize text-muted-foreground">{item.experience}</span></td><td className="px-5 py-4 text-xs capitalize text-muted-foreground">{item.type} · {item.mode||'standard'}</td><td className="px-5 py-4"><Link className="inline-flex items-center gap-1 rounded-full bg-primary/5 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/10" to={`/feedback/${item._id}`}>{item.score}/100<ArrowUpRight className="h-3 w-3" aria-hidden="true" /></Link></td></tr>)}</tbody></table></div>
      </details>
    </> : <div className="my-6 rounded-2xl border border-dashed border-primary/20 bg-primary/[0.025] px-6 py-8 text-center"><TrendingUp className="mx-auto mb-3 h-7 w-7 text-primary/60" aria-hidden="true" /><h3 className="font-serif text-2xl">Every conversation is a step forward.</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Complete an AI-assessed interview to see your skills take shape here. Unassessed and older reports are excluded.</p></div>}
    {next && (
      <div className="relative mt-6 overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/[0.07] via-background to-background p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/10 bg-background text-primary shadow-sm">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" />Recommended next practice</p>
            <h3 className="mt-2 break-words font-serif text-2xl leading-snug text-foreground">{next.topic}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">A high-priority focus from {next.count === 1 ? 'a learning report' : `${next.count} learning reports`}. Explore the topic and put it into practice.</p>
          </div>
          <Button asChild className="w-full shrink-0 rounded-full sm:w-auto">
            <Link to={`/feedback/${next.id}?tab=roadmap`}>Explore practice<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
          </Button>
        </div>
      </div>
    )}
  </section>;
}
