import { ArrowUpRight, CheckCircle2, Target, BookOpen, ListChecks, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import FeedbackCharts from '@/components/FeedbackCharts';
import RoadmapTree from '@/components/RoadmapTree';
export default function FeedbackSummary({ feedback, onReview, onRoadmap }) {
  const questions = feedback.questionFeedback || [];
  const estimated = feedback.evaluationSource === 'heuristic';
  const weak = estimated ? [] : questions.filter(question => Number.isFinite(question.score) && question.score < 70).sort((a, b) => a.score - b.score);
  const roadmap = feedback.roadmap || [];
  return <div className="space-y-6">
    <section className="overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-[#f5e7e6] via-background to-white p-5 sm:p-8">
      <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Your interview, at a glance</p>
          <h2 className="mt-2 font-serif text-3xl sm:text-4xl">A little reflection. A clearer next step.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{estimated ? 'AI evaluation was unavailable; correctness has not been assessed.' : `${weak.length} of ${questions.length} answers need more practice (below 70/100).`}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-primary/10 bg-white/75 px-6 py-5 sm:block sm:text-center">
          <p className="font-serif text-5xl leading-none text-primary">{feedback.score}<span className="ml-1 font-sans text-sm text-muted-foreground">/100</span></p>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{estimated ? 'Practice estimate' : 'Overall score'}</p>
        </div>
      </div>
      {!estimated && <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-primary/10 bg-white/75 p-5"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><CheckCircle2 className="h-4 w-4" aria-hidden="true" />Keep doing</h3><p className="mt-3 text-sm leading-7 text-foreground/80">{feedback.strengths?.[0] || 'See your question review for strengths.'}</p></div>
        <div className="rounded-2xl border border-primary/10 bg-white/75 p-5"><h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><Target className="h-4 w-4" aria-hidden="true" />Focus next</h3><p className="mt-3 text-sm leading-7 text-foreground/80">{weak[0]?.missingConcepts?.[0] || weak[0]?.summary || feedback.improvements?.[0] || 'Keep practicing to build consistency.'}</p></div>
      </div>}
      <div className="mt-6 flex justify-end"><Button variant="outline" className="w-full rounded-full bg-white/80 sm:w-auto" onClick={onReview}>Read detailed review<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button></div>
    </section>
    <FeedbackCharts feedback={feedback} />
    <details className="group/snapshot overflow-hidden rounded-3xl border border-primary/10 bg-card shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-primary/[0.025] px-5 py-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:px-6 [&::-webkit-details-marker]:hidden"><span><span className="flex items-center gap-3 font-serif text-2xl"><ListChecks className="h-5 w-5 text-primary" aria-hidden="true" />Question snapshot</span><span className="mt-1 block text-sm text-muted-foreground">Scan your results and explore individual takeaways.</span></span><ChevronDown className="h-5 w-5 shrink-0 text-primary transition-transform group-open/snapshot:rotate-180" aria-hidden="true" /></summary>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Question scores and concise revision notes</caption>
        <thead className="border-y bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th scope="col" className="p-4">Question</th><th scope="col" className="p-4">Score</th><th scope="col" className="p-4">Next step</th></tr></thead>
        <tbody>{questions.map((question, index) => <tr key={index} className="border-b border-primary/10 last:border-0 hover:bg-primary/[0.02]">
          <th scope="row" className="min-w-40 max-w-sm p-4 align-top font-normal"><span className="mb-1 block text-xs font-semibold text-primary">Q{index + 1}</span><span className="line-clamp-2">{question.question}</span></th>
          <td className="p-4 align-top"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${estimated ? 'bg-slate-100 text-slate-700' : question.score >= 70 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{question.score ?? '—'}/100</span><span className="mt-2 block whitespace-nowrap text-xs text-muted-foreground">{estimated ? 'Estimate' : question.score >= 70 ? 'Keep practicing' : 'Review first'}</span></td>
          <td className="min-w-44 max-w-lg p-4 align-top"><p className="line-clamp-2 leading-6">{question.summary || question.missingConcepts?.[0] || question.tips || 'Open the detailed review.'}</p>
            <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-primary">Expand takeaway</summary><div className="mt-3 space-y-2 text-xs leading-6"><p>{question.question}</p>{question.studyPoints?.slice(0, 3).map((point, i) => <p key={i}>• {point}</p>)}{question.practiceTask && <p><strong>Try:</strong> {question.practiceTask}</p>}</div></details>
          </td></tr>)}</tbody>
      </table></div>
      {!questions.length && <p className="p-5 text-sm text-muted-foreground">No question results are saved in this report yet.</p>}
    </details>
    <details className="group/study overflow-hidden rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.04] to-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40 sm:p-6 [&::-webkit-details-marker]:hidden"><span className="flex items-center gap-3 font-serif text-2xl"><BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />Your next study steps</span><ChevronDown className="h-5 w-5 shrink-0 text-primary transition-transform group-open/study:rotate-180" aria-hidden="true" /></summary>
      <div className="border-t border-primary/10 p-5 sm:p-6">
      <div className="mb-5 flex justify-end"><Button variant="outline" className="rounded-full bg-white/80" onClick={onRoadmap}>Full study roadmap<ArrowUpRight className="ml-2 h-4 w-4" aria-hidden="true" /></Button></div>
      {!roadmap.length && <p className="text-sm text-muted-foreground">Re-analyze saved answers to generate a personalized study path.</p>}
      {!!roadmap.length && <RoadmapTree roadmap={roadmap.slice(0, 3)} />}
      </div>
    </details>
  </div>;
}
