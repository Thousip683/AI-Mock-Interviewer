import { useState } from 'react';

export default function RoadmapTree({ roadmap = [] }) {
  const [open, setOpen] = useState({ 0: true });
  if (!roadmap.length) return <p className="rounded-xl border p-5 text-sm text-muted-foreground">Re-analyze saved answers to generate your topic summaries and learning path.</p>;
  return <section className="rounded-2xl border bg-card p-5 sm:p-7" aria-label="Collapsible study roadmap">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5"><div><p className="text-xs font-semibold uppercase tracking-widest text-primary">Your learning path</p><h2 className="mt-2 text-3xl">One topic at a time.</h2><p className="mt-2 text-sm text-muted-foreground">{roadmap.length} topics · Open a branch for key concepts, exercises, and a readiness check.</p></div><div className="flex gap-2"><button className="rounded-full border px-3 py-2 text-xs hover:bg-muted" onClick={() => setOpen(Object.fromEntries(roadmap.map((_, i) => [i, true])))}>Expand all</button><button className="rounded-full border px-3 py-2 text-xs hover:bg-muted" onClick={() => setOpen({})}>Collapse all</button></div></div>
    <ol className="ml-2 mt-6 space-y-5 border-l-2 border-primary/20 pl-5 sm:pl-8">{roadmap.map((topic, index) => <li key={index} className="relative before:absolute before:-left-[1.65rem] before:top-6 before:h-3 before:w-3 before:rounded-full before:border-2 before:border-background before:bg-primary sm:before:-left-[2.4rem]">
      <details open={!!open[index]} onToggle={event => { const expanded = event.currentTarget.open; if (expanded !== !!open[index]) setOpen(previous => ({ ...previous, [index]: expanded })); }} className="group rounded-xl border bg-background open:bg-white">
        <summary className="cursor-pointer rounded-xl p-4 marker:text-primary"><span className="ml-1 inline-flex max-w-[90%] flex-wrap items-center gap-2 align-middle"><span className="text-xs font-semibold text-primary">{String(index + 1).padStart(2, '0')}</span><span className="font-semibold">{topic.topic}</span><span className={`rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${topic.priority === 'high' ? 'bg-purple-100 text-purple-900' : topic.priority === 'medium' ? 'bg-[#f4ead7] text-[#73571d]' : 'bg-[#e8eee9] text-[#365546]'}`}>{topic.priority || 'medium'} priority</span>{topic.timeframe && <span className="text-xs text-muted-foreground">{topic.timeframe}</span>}</span></summary>
        <div className="space-y-5 border-t px-4 py-5 sm:px-6">
          <div className="rounded-xl bg-primary/5 p-4"><h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Topic in a nutshell</h3><p className="mt-2 text-sm leading-7">{topic.summary || topic.reason || 'Follow the learning steps below to strengthen this topic.'}</p></div>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border p-4"><h3 className="mb-3 text-sm font-semibold">Key concepts to remember</h3>{topic.keyPoints?.length ? <ul className="list-disc space-y-2 pl-4 text-sm leading-6">{topic.keyPoints.map((point, i) => <li key={i}>{point}</li>)}</ul> : <p className="text-sm leading-6 text-muted-foreground">Concept notes are unavailable in this older report. Re-analyze saved answers to add them.</p>}</section>
            <section className="rounded-xl border p-4"><h3 className="mb-3 text-sm font-semibold">Learn in this order</h3><ol className="list-decimal space-y-2 pl-4 text-sm leading-6">{topic.steps?.map((step, i) => <li key={i}>{step}</li>)}</ol></section>
          </div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-[#f4ead7]/60 p-4"><h3 className="text-xs font-semibold uppercase tracking-widest text-[#73571d]">Practice</h3><p className="mt-2 text-sm leading-6">{topic.practiceTask || 'Apply the learning steps to an example of your own.'}</p></div><div className="rounded-xl bg-[#e8eee9] p-4"><h3 className="text-xs font-semibold uppercase tracking-widest text-[#365546]">Ready to move on when</h3><p className="mt-2 text-sm leading-6">{topic.successCriteria || 'Explain the topic and complete the practice task without referring to your notes.'}</p></div></div>
          {topic.reason && <p className="text-xs leading-6 text-muted-foreground"><strong>Why this topic:</strong> {topic.reason}</p>}
        </div>
      </details>
    </li>)}</ol>
  </section>;
}
