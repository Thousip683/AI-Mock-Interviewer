import { getInterviewById, submitInterviewAnswers } from './interviewService.js';
import { saveInterviewRecord } from '../repositories/interviewRepository.js';
import { issueLiveTicket, reserveLive, isLiveBusy } from './liveSessions.js';

export async function getLiveInterview(userId, id) {
  const interview = await getInterviewById(userId, id);
  if (interview.mode !== 'live') throw Object.assign(new Error('This is not a live interview'), { status: 400 });
  return interview;
}

export async function createLiveTicket(userId, id) {
  const interview = await getLiveInterview(userId, id);
  if (interview.status === 'completed') throw Object.assign(new Error('Interview already completed'), { status: 409 });
  if (isLiveBusy(id)) throw Object.assign(new Error('A live session is already open. Close it before reconnecting.'), { status: 409 });
  if (!process.env.GEMINI_API_KEY) throw Object.assign(new Error('Live interviews require a Gemini API key configured on the server'), { status: 503 });
  return { ticket: issueLiveTicket(userId, id) };
}

// Preserve consecutive user fragments; exclude the unanswered closing question.
export function transcriptToAnswers(transcript) {
  const answers = [];
  let question = '';
  let answer = '';
  const flush = () => {
    if (question.trim() && answer.trim()) answers.push({ question: question.trim(), answer: answer.trim() });
    answer = '';
  };
  for (const turn of transcript) {
    if (turn.speaker === 'ai') {
      if (answer) { flush(); question = ''; }
      question += `${question ? '\n' : ''}${turn.text}`;
    } else if (turn.speaker === 'user') {
      answer += `${answer ? '\n' : ''}${turn.text}`;
    }
  }
  flush();
  return answers;
}

export async function finishLiveInterview(userId, id) {
  // Check ownership before acquiring the process-local lock.
  await getLiveInterview(userId, id);
  const release = reserveLive(id);
  try {
    const interview = await getLiveInterview(userId, id);
    if (interview.status === 'completed') return { success: true, score: interview.score };
    const answers = transcriptToAnswers(interview.liveTranscript || []);
    if (!answers.length) throw Object.assign(new Error('No spoken answers were captured yet. Resume the interview and answer a question first.'), { status: 400 });
    interview.questions = answers.map((answer, index) => ({ text: answer.question, type: interview.type, order: index + 1 }));
    await saveInterviewRecord(userId, interview);
    const result = await submitInterviewAnswers(userId, id, answers, { fromLive: true });
    return { success: true, score: result.score };
  } finally { release(); }
}
