import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[GEMINI] ⚠️ GEMINI_API_KEY is not set in environment variables! AI generation will fail and fall back to templates.');
  } else if (!apiKey.startsWith('AIzaSy')) {
    console.warn(`[GEMINI] ⚠️ Notice: GEMINI_API_KEY does not start with standard prefix "AIzaSy" (starts with "${apiKey.substring(0, 6)}..."). Verify this is a valid Google Gemini API key if you encounter 400 Bad Request errors.`);
  }
  return new GoogleGenerativeAI(apiKey || '');
}


const SYSTEM_PROMPTS = {
  question: `You are an expert technical interviewer at a top tech company. Generate interview questions that are:
- Relevant to the role and experience level
- Challenging but fair
- Clear and well-structured
- Practical and job-relevant
- Include context or scenario where appropriate

Return ONLY a JSON array of question objects with fields: text (string), type (string), context (string or null), difficulty (easy/medium/hard).`,

  feedback: `You are an expert interview coach providing detailed feedback. Analyze the candidate's answers and provide:
- Constructive, specific feedback
- Honest but encouraging tone
- Actionable improvement suggestions
- Score each answer (0-100)
- Identify patterns in strengths/weaknesses

Return ONLY valid JSON.`,
};

export async function generateQuestions(role, type, experience, jobDescription, focusArea, count = 5) {
  console.log(`[GEMINI] 🤖 generateQuestions requested: role="${role}", type="${type}", experience="${experience}", count=${count}`);
  if (focusArea) console.log(`[GEMINI] 🎯 Focus areas specified: "${focusArea}"`);
  if (jobDescription) console.log(`[GEMINI] 📄 Job description provided (${jobDescription.length} characters)`);

  try {
    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = `Generate ${count} interview questions for a ${experience} level ${role} position.\n`;
    prompt += `Interview type: ${type}\n`;
    
    if (jobDescription) {
      prompt += `\nJob Description Context:\n${jobDescription}\n`;
    }
    
    if (focusArea) {
      prompt += `\nFocus Areas: ${focusArea}\n`;
    }

    prompt += `\n${SYSTEM_PROMPTS.question}\n\n`;
    prompt += `Return the response as a JSON array. Example format:
[
  {
    "text": "Question text here",
    "type": "technical",
    "context": "Optional context or scenario",
    "difficulty": "medium"
  }
]`;

    console.log(`[GEMINI] 📡 Dispatching prompt to Gemini model (gemini-1.5-flash)...`);
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const duration = Date.now() - startTime;
    console.log(`[GEMINI] 📥 Received raw response from Gemini in ${duration}ms (${text.length} chars)`);

    // Clean up markdown code blocks if present
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log(`[GEMINI] 🔍 Parsing JSON question array...`);
    const questions = JSON.parse(text);

    if (!Array.isArray(questions)) {
      throw new Error(`Expected JSON array from Gemini, got ${typeof questions}`);
    }

    console.log(`[GEMINI] ✅ Successfully parsed ${questions.length} questions from Gemini.`);

    // Validate and return questions with order
    const formatted = questions.slice(0, count).map((q, index) => ({
      text: q.text,
      type: type,
      context: q.context || null,
      difficulty: q.difficulty || 'medium',
      order: index + 1,
    }));

    return formatted;
  } catch (error) {
    console.error(`[GEMINI] ❌ Gemini question generation failed: ${error.message}`);
    console.warn(`[GEMINI] 🔄 Activating fallback question generator for role "${role}" (${count} questions)...`);
    // Fallback questions if API fails
    return getFallbackQuestions(role, type, experience, count);
  }
}

export async function generateFeedback(questions, answers) {
  console.log(`[GEMINI] 🤖 generateFeedback requested for ${questions?.length || 0} questions and ${answers?.length || 0} answers`);

  try {
    const genAI = getGenAIClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    let prompt = `Analyze the following interview answers and provide detailed feedback.\n\n`;
    prompt += `Questions and Answers:\n`;
    
    questions.forEach((q, i) => {
      prompt += `\nQ${i + 1}: ${q.text}\n`;
      prompt += `A${i + 1}: ${answers[i]?.answer || 'No answer provided'}\n`;
    });

    prompt += `\n${SYSTEM_PROMPTS.feedback}\n\n`;
    prompt += `Return ONLY valid JSON in this exact format:
{
  "questionFeedback": [
    {
      "question": "Original question",
      "answer": "Original answer",
      "score": 75,
      "feedback": "Detailed feedback text",
      "tips": "Specific improvement tip"
    }
  ],
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement area 1", "Improvement area 2"],
  "technicalScore": 70,
  "communicationScore": 75,
  "confidenceScore": 65,
  "relevanceScore": 80,
  "depthScore": 72,
  "overallFeedback": "Overall assessment paragraph",
  "score": 72
}`;

    console.log(`[GEMINI] 📡 Dispatching feedback prompt to Gemini (gemini-1.5-flash)...`);
    const startTime = Date.now();
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();
    const duration = Date.now() - startTime;
    console.log(`[GEMINI] 📥 Received feedback response from Gemini in ${duration}ms (${text.length} chars)`);

    // Clean up markdown
    text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    console.log(`[GEMINI] 🔍 Parsing JSON feedback object...`);
    const feedback = JSON.parse(text);
    
    // Calculate overall score if not provided
    if (!feedback.score && feedback.questionFeedback) {
      const scores = feedback.questionFeedback.map(qf => qf.score || 0);
      feedback.score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    }
    
    console.log(`[GEMINI] ✅ Successfully parsed feedback. Overall score: ${feedback.score}/100, Strengths: ${feedback.strengths?.length || 0}, Improvements: ${feedback.improvements?.length || 0}`);
    return feedback;
  } catch (error) {
    console.error(`[GEMINI] ❌ Gemini feedback generation failed: ${error.message}`);
    console.warn(`[GEMINI] 🔄 Activating fallback feedback generator...`);
    return getFallbackFeedback(questions, answers);
  }
}

function getFallbackQuestions(role, type, experience, count) {
  console.log(`[GEMINI] 📋 Serving ${count} template fallback questions for "${role}" (${type}, ${experience})`);
  const fallbacks = [
    { text: `Tell me about yourself and your experience with ${role}.`, type, context: null, difficulty: 'easy' },
    { text: `What's the most challenging project you've worked on and how did you overcome obstacles?`, type, context: null, difficulty: 'medium' },
    { text: `How do you stay updated with the latest trends and technologies in ${role}?`, type, context: null, difficulty: 'medium' },
    { text: `Describe a situation where you had to work under pressure. How did you handle it?`, type, context: 'Use the STAR method: Situation, Task, Action, Result', difficulty: 'medium' },
    { text: `Where do you see yourself professionally in the next 5 years?`, type, context: null, difficulty: 'easy' },
    { text: `What makes you a good fit for this ${role} position?`, type, context: null, difficulty: 'easy' },
    { text: `Describe a time you received constructive criticism and how you responded.`, type, context: null, difficulty: 'medium' },
    { text: `How do you prioritize tasks when working on multiple projects simultaneously?`, type, context: null, difficulty: 'medium' },
    { text: `What technical skills do you consider your strongest and weakest?`, type, context: null, difficulty: 'easy' },
    { text: `Describe a situation where you had to explain a complex technical concept to a non-technical stakeholder.`, type, context: null, difficulty: 'hard' },
  ];
  
  return fallbacks.slice(0, count).map((q, i) => ({ ...q, order: i + 1 }));
}

function getFallbackFeedback(questions, answers) {
  console.log(`[GEMINI] 📋 Serving default template feedback for ${questions.length} questions`);
  return {
    questionFeedback: questions.map((q, i) => ({
      question: q.text,
      answer: answers[i]?.answer || '',
      score: 70,
      feedback: 'Your answer shows good understanding of the topic. Consider providing more specific examples and structure your response clearly.',
      tips: 'Try using the STAR method to structure your answer with concrete examples from your experience.',
    })),
    strengths: [
      'Good communication skills demonstrated',
      'Shows enthusiasm for the role',
      'Clear understanding of basic concepts',
    ],
    improvements: [
      'Provide more specific examples from past experiences',
      'Structure answers more clearly with frameworks like STAR',
      'Quantify achievements with metrics where possible',
    ],
    technicalScore: 70,
    communicationScore: 75,
    confidenceScore: 65,
    relevanceScore: 72,
    depthScore: 68,
    overallFeedback: 'Overall, you demonstrated good potential. Focus on providing more structured and detailed answers with concrete examples from your experience.',
    score: 70,
  };
}

