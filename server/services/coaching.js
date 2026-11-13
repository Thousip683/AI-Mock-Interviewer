import { getInterviewById, createInterview } from './interviewService.js';
import { saveInterviewRecord } from '../repositories/interviewRepository.js';
import { reserveLive } from './liveSessions.js';

export const supportsCoding = role => /developer|software|data|machine learning|devops|cloud|qa|automation|security|sre|platform|embedded/i.test(role);
export function codingQuestion(role, language) {
  const dataRole = /data|analyst/i.test(role);
  return { type: 'coding', difficulty: 'medium', text: dataRole
    ? `Coding round (${language}): Given events [{userId, timestamp}], return the number of unique active users for each UTC date. Ignore records with missing userId or invalid timestamp. Describe tests for duplicates, empty input and timezone boundaries, and analyze complexity.`
    : `Coding round (${language}): Implement firstUnique(text), returning the first character that occurs exactly once, or null if none exists. Matching is case-sensitive; spaces count as characters. Example: "swiss" → "w". Explain your approach, test empty input and repeated characters, and analyze time and space complexity.`,
    context: 'Write code and explain your tests. AI reviews your submission; code is not executed.' };
}

export async function practiceTopic(userId, id, index) {
  const original = await getInterviewById(userId, id);
  const topic = original.feedback?.roadmap?.[index];
  if (original.status !== 'completed' || !Number.isInteger(index) || index < 0 || !topic) throw Object.assign(new Error('Choose a topic from a completed report'), { status: 400 });
  return createInterview(userId, { role: original.role, type: original.type, experience: original.experience,
    mode: 'standard', questionCount: 3, focusArea: `${topic.topic}: ${topic.practiceTask || topic.reason || ''}`.slice(0, 2000),
    jobDescription: original.jobDescription, resumeText: original.resumeText, practiceOf: String(original._id) });
}

export async function updateRoadmap(userId, id, index, completed) {
  if (!Number.isInteger(index) || index < 0 || typeof completed !== 'boolean') throw Object.assign(new Error('Invalid progress update'), { status: 400 });
  const release = reserveLive(id);
  try {
    const interview = await getInterviewById(userId, id);
    const topic = interview.feedback?.roadmap?.[index];
    if (!topic) throw Object.assign(new Error('Topic not found'), { status: 404 });
    topic.completed = completed;
    await saveInterviewRecord(userId, interview);
    return { completed };
  } finally { release(); }
}
