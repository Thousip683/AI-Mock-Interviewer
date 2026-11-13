export const assessed = records => records.filter(item => item.status === 'completed' && item.evaluationSource === 'gemini' && Number.isFinite(item.score)).sort((a,b)=>new Date(b.completedAt || b.createdAt)-new Date(a.completedAt || a.createdAt));
export function progressStats(records) {
  const valid = assessed(records), latest = valid[0];
  const previous = latest && valid.slice(1).find(item => item.role === latest.role && item.type === latest.type && item.experience === latest.experience && item.mode === latest.mode);
  return { total: records.length, completed: records.filter(item=>item.status==='completed').length,
    averageScore: valid.length ? Math.round(valid.reduce((sum,item)=>sum+item.score,0)/valid.length) : null,
    improvement: previous ? latest.score-previous.score : null };
}
