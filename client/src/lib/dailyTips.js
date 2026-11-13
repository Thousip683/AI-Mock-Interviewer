export const dailyTips = [
  { category: 'YOUR INTRODUCTION', title: 'Make your first minute count.', tip: 'Build a short introduction around where you are now, one relevant experience, and what you want to do next.', task: 'Record a 60-second introduction. Remove one sentence that does not help explain why you fit the role.', minutes: 3 },
  { category: 'BEHAVIORAL ANSWERS', title: 'Give your story a clear shape.', tip: 'Use Situation, Task, Action, Result. Spend most of your answer on your own actions, then explain the outcome honestly.', task: 'Choose a real teamwork example and write one sentence for each part of STAR.', minutes: 5 },
  { category: 'KNOW THE ROLE', title: 'Connect your experience to their needs.', tip: 'Pick three requirements from the job description. Match each to a project, experience, or skill you can explain with evidence.', task: 'Create three requirement → example pairs. Be clear about any gap you are still learning to close.', minutes: 5 },
  { category: 'THINKING ALOUD', title: 'Let the interviewer follow your thinking.', tip: 'Clarify the problem, state your assumptions, explain your approach, and check the result. A short pause is better than rushing.', task: 'Explain a recent decision aloud. Include one alternative you considered and why you chose your approach.', minutes: 4 },
  { category: 'CODING PRACTICE', title: 'Test the idea before polishing the code.', tip: 'Walk through a small example, an empty input, and a boundary case. Explain complexity and limitations without claiming tests you did not run.', task: 'Take one solution you wrote and add three meaningful test cases.', minutes: 7 },
  { category: 'QUESTIONS TO ASK', title: 'Make it a two-way conversation.', tip: 'Ask about the work, success expectations, and team collaboration. Choose questions that help you judge whether the role fits you.', task: 'Prepare two questions: one about the first three months and one about how the team works.', minutes: 3 },
  { category: 'REFLECT & REPEAT', title: 'Practice one thing better today.', tip: 'Review your last attempt and choose one specific change. Repeat the answer and compare clarity, relevance, and supporting detail.', task: 'Rewrite the weakest part of one answer, then explain it without reading your notes.', minutes: 5 },
];
export function localDayIndex(date = new Date()) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
}
export function tipForDate(date = new Date()) { return dailyTips[((localDayIndex(date) % dailyTips.length) + dailyTips.length) % dailyTips.length]; }
export const encouragement = [
  'You do not need to have every answer. You need the courage to take the next step.',
  'Your first attempt is a starting point, not a verdict.',
  'Small moments of practice become the confidence you carry into the room.',
];
