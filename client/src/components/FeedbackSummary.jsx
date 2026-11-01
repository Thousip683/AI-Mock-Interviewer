import FeedbackCharts from '@/components/FeedbackCharts';
import RoadmapTree from '@/components/RoadmapTree';
export default function FeedbackSummary({ feedback, onReview, onRoadmap }) {
  const questions = feedback.questionFeedback || [];
  const estimated = feedback.evaluationSource === 'heuristic';
  const weak = estimated ? [] : questions.filter(question => Number.isFinite(question.score) && question.score < 70).sort((a, b) => a.score - b.score);
  const roadmap = feedback.roadmap || [];
  return <div className="space-y-6">
    <section className="rounded-2xl border bg-primary/5 p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">At a glance</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div><h2 className="text-2xl font-bold">{feedback.score}/100 <span className="text-sm font-normal text-muted-foreground">{estimated ? 'practice estimate' : 'overall score'}</span></h2>
          <p className="mt-2 text-sm text-muted-foreground">{estimated ? 'AI evaluation was unavailable; correctness has not been assessed.' : `${weak.length} of ${questions.length} answers need more practice (below 70/100).`}</p></div>
        <button className="rounded-lg border bg-background px-4 py-2 text-sm font-medium hover:bg-muted" onClick={onReview}>Read detailed review</button>
      </div>
      {!estimated && <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><h3 className="text-sm font-semibold">Keep doing</h3><p className="mt-1 text-sm leading-6">{feedback.strengths?.[0] || 'See your question review for strengths.'}</p></div>
        <div><h3 className="text-sm font-semibold">Focus next</h3><p className="mt-1 text-sm leading-6">{weak[0]?.missingConcepts?.[0] || weak[0]?.summary || feedback.improvements?.[0] || 'Keep practicing to build consistency.'}</p></div>
      </div>}
    </section>
    <FeedbackCharts feedback={feedback} />
    <section className="overflow-hidden rounded-2xl border bg-card">
      <div className="px-5 py-4"><h2 className="font-semibold">Question snapshot</h2><p className="mt-1 text-sm text-muted-foreground">Scan your results, then expand a takeaway when you need more context.</p></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <caption className="sr-only">Question scores and concise revision notes</caption>
        <thead className="border-y bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th scope="col" className="p-4">Question</th><th scope="col" className="p-4">Score</th><th scope="col" className="p-4">Next step</th></tr></thead>
        <tbody>{questions.map((question, index) => <tr key={index} className="border-b last:border-0">
          <th scope="row" className="min-w-40 max-w-sm p-4 align-top font-normal"><span className="mb-1 block text-xs font-semibold text-primary">Q{index + 1}</span><span className="line-clamp-2">{question.question}</span></th>
          <td className="p-4 align-top"><span className={`inline-block whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${estimated ? 'bg-slate-100 text-slate-700' : question.score >= 70 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{question.score ?? '—'}/100</span><span className="mt-2 block whitespace-nowrap text-xs text-muted-foreground">{estimated ? 'Estimate' : question.score >= 70 ? 'Keep practicing' : 'Review first'}</span></td>
          <td className="min-w-44 max-w-lg p-4 align-top"><p className="line-clamp-2 leading-6">{question.summary || question.missingConcepts?.[0] || question.tips || 'Open the detailed review.'}</p>
            <details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-primary">Expand takeaway</summary><div className="mt-3 space-y-2 text-xs leading-6"><p>{question.question}</p>{question.studyPoints?.slice(0, 3).map((point, i) => <p key={i}>• {point}</p>)}{question.practiceTask && <p><strong>Try:</strong> {question.practiceTask}</p>}</div></details>
          </td></tr>)}</tbody>
      </table></div>
      {!questions.length && <p className="p-5 text-sm text-muted-foreground">No question results are saved in this report yet.</p>}
    </section>
    <section className="rounded-2xl border p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Your next study steps</h2><button onClick={onRoadmap} className="text-sm font-medium text-primary underline underline-offset-4">Full study roadmap</button></div>
      {!roadmap.length && <p className="text-sm text-muted-foreground">Re-analyze saved answers to generate a personalized study path.</p>}
      {!!roadmap.length && <RoadmapTree roadmap={roadmap.slice(0, 3)} />}
    </section>
  </div>;
}
