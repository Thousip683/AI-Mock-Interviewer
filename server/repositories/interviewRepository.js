import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import Interview from '../models/Interview.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const storePath = path.join(__dirname, '..', 'data', 'interviews.json');
let localWrites = Promise.resolve();
let storeReady;

async function ensureStore() {
  if (!storeReady) storeReady = (async () => {
    await fs.mkdir(path.dirname(storePath), { recursive: true });
    try { await fs.writeFile(storePath, '[]', { encoding: 'utf8', flag: 'wx' }); }
    catch (error) { if (error.code !== 'EEXIST') throw error; }
  })().catch(error => { storeReady = null; throw error; });
  await storeReady;
}

async function readStore() {
  await ensureStore();
  const raw = await fs.readFile(storePath, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeStore(interviews) {
  await ensureStore();
  const temporary = `${storePath}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, JSON.stringify(interviews, null, 2), 'utf8');
    await fs.rename(temporary, storePath);
  } finally { await fs.rm(temporary, { force: true }); }
}

function serializeMutation(operation) {
  // Serialize the entire read/modify/write, not just the final file write.
  // This also prevents two voice sessions from overwriting each other's data.
  const result = localWrites.then(operation);
  localWrites = result.catch(() => {});
  return result;
}

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function toPlain(doc) {
  return typeof doc?.toObject === 'function' ? doc.toObject() : doc;
}

function normalizeInterview(interview) {
  const createdAt = interview.createdAt ? new Date(interview.createdAt) : new Date();
  const updatedAt = interview.updatedAt ? new Date(interview.updatedAt) : new Date();
  const completedAt = interview.completedAt ? new Date(interview.completedAt) : null;

  return {
    ...interview,
    _id: interview._id || interview.id,
    id: interview.id || interview._id,
    createdAt,
    updatedAt,
    completedAt,
  };
}

export async function listInterviewsByUser(userId) {
  const storage = isMongoReady() ? 'MongoDB' : 'Local JSON Store';
  console.log(`[REPOSITORY] 📋 listInterviewsByUser: Querying interviews for userId: "${userId}" via ${storage}`);

  if (isMongoReady()) {
    const interviews = await Interview.find({ clerkUserId: userId })
      .select('role type mode status score duration createdAt')
      .sort({ createdAt: -1 });

    console.log(`[REPOSITORY] ✅ listInterviewsByUser: Found ${interviews.length} interviews in MongoDB for user: "${userId}"`);
    return interviews.map(toPlain);
  }

  const interviews = await readStore();
  const userInterviews = interviews
    .filter((interview) => interview.clerkUserId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((interview) => ({
      _id: interview._id,
      role: interview.role,
      mode: interview.mode || 'standard',
      type: interview.type,
      status: interview.status,
      score: interview.score,
      duration: interview.duration,
      createdAt: interview.createdAt,
    }));

  console.log(`[REPOSITORY] ✅ listInterviewsByUser: Found ${userInterviews.length} interviews in Local JSON Store for user: "${userId}"`);
  return userInterviews;
}

export async function getStatsByUser(userId) {
  const storage = isMongoReady() ? 'MongoDB' : 'Local JSON Store';
  console.log(`[REPOSITORY] 📊 getStatsByUser: Calculating statistics for userId: "${userId}" via ${storage}`);

  if (isMongoReady()) {
    const stats = await Interview.aggregate([
      { $match: { clerkUserId: userId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          averageScore: { $avg: '$score' },
        },
      },
    ]);

    const result = stats[0] || { total: 0, completed: 0, averageScore: 0 };
    console.log(`[REPOSITORY] ✅ getStatsByUser: MongoDB stats: Total=${result.total}, Completed=${result.completed}, AvgScore=${Math.round(result.averageScore || 0)}`);
    return result;
  }

  const interviews = await readStore();
  const userInterviews = interviews.filter((interview) => interview.clerkUserId === userId);
  const completed = userInterviews.filter((interview) => interview.status === 'completed');
  const averageScore = completed.length
    ? completed.reduce((sum, interview) => sum + (interview.score || 0), 0) / completed.length
    : 0;

  const result = {
    total: userInterviews.length,
    completed: completed.length,
    averageScore,
  };
  console.log(`[REPOSITORY] ✅ getStatsByUser: Local JSON stats: Total=${result.total}, Completed=${result.completed}, AvgScore=${Math.round(averageScore)}`);
  return result;
}

export function createInterviewRecord(userId, payload) {
  return serializeMutation(() => createInterviewRecordImpl(userId, payload));
}
async function createInterviewRecordImpl(userId, payload) {
  const storage = isMongoReady() ? 'MongoDB' : 'Local JSON Store';
  console.log(`[REPOSITORY] ➕ createInterviewRecord: Creating new interview for userId: "${userId}", role: "${payload.role}" via ${storage}`);

  const interviewData = {
    clerkUserId: userId,
    mode: payload.mode || 'standard',
    role: payload.role,
    type: payload.type,
    experience: payload.experience,
    jobDescription: payload.jobDescription,
    focusArea: payload.focusArea,
    questionCount: payload.questionCount || 5,
    status: 'pending',
  };

  if (isMongoReady()) {
    try {
      const interview = new Interview(interviewData);
      await interview.save();
      console.log(`[REPOSITORY] ✅ createInterviewRecord: Successfully saved to MongoDB with _id: "${interview._id}"`);
      return interview.toObject();
    } catch (err) {
      console.error(`[REPOSITORY] ❌ createInterviewRecord MongoDB error: ${err.message}`, err);
      throw err;
    }
  }

  const now = new Date().toISOString();
  const interview = normalizeInterview({
    _id: randomUUID(),
    ...interviewData,
    questions: [],
    answers: [],
    score: 0,
    duration: 0,
    feedback: {
      strengths: [],
      improvements: [],
      technicalScore: 0,
      communicationScore: 0,
      confidenceScore: 0,
      relevanceScore: 0,
      depthScore: 0,
      overallFeedback: '',
    },
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  });

  const interviews = await readStore();
  interviews.push(interview);
  await writeStore(interviews);

  console.log(`[REPOSITORY] ✅ createInterviewRecord: Successfully saved to Local JSON Store with _id: "${interview._id}"`);
  return interview;
}

export async function getInterviewRecord(userId, interviewId) {
  const storage = isMongoReady() ? 'MongoDB' : 'Local JSON Store';
  console.log(`[REPOSITORY] 🔍 getInterviewRecord: Looking up interviewId: "${interviewId}" for userId: "${userId}" via ${storage}`);

  if (isMongoReady()) {
    const interview = await Interview.findOne({ _id: interviewId, clerkUserId: userId });
    if (!interview) {
      console.warn(`[REPOSITORY] ⚠️ getInterviewRecord: No interview found in MongoDB with id: "${interviewId}" for userId: "${userId}"`);
      return null;
    }
    console.log(`[REPOSITORY] ✅ getInterviewRecord: Found interview "${interviewId}" (status: "${interview.status}", questions: ${interview.questions?.length || 0})`);
    return interview.toObject();
  }

  const interviews = await readStore();
  const interview = interviews.find(
    (item) => item._id === interviewId && item.clerkUserId === userId
  );

  if (!interview) {
    console.warn(`[REPOSITORY] ⚠️ getInterviewRecord: No interview found in Local JSON Store with id: "${interviewId}" for userId: "${userId}"`);
    return null;
  }

  console.log(`[REPOSITORY] ✅ getInterviewRecord: Found interview in Local JSON Store (status: "${interview.status}")`);
  return normalizeInterview(interview);
}

export function saveInterviewRecord(userId, interview) {
  return serializeMutation(() => saveInterviewRecordImpl(userId, interview));
}
async function saveInterviewRecordImpl(userId, interview) {
  const interviewId = interview._id || interview.id;
  const storage = isMongoReady() ? 'MongoDB' : 'Local JSON Store';
  console.log(`[REPOSITORY] 💾 saveInterviewRecord: Updating interview "${interviewId}" (status: "${interview.status}") via ${storage}`);

  if (isMongoReady()) {
    try {
      // Safe update: strip version keys and immutable IDs
      const updateData = { ...interview };
      delete updateData._id;
      delete updateData.id;
      delete updateData.__v;
      delete updateData.createdAt;

      const updated = await Interview.findOneAndUpdate(
        { _id: interviewId, clerkUserId: userId },
        { $set: updateData },
        { new: true }
      );

      if (!updated) {
        console.warn(`[REPOSITORY] ⚠️ saveInterviewRecord: Record not found in MongoDB for id "${interviewId}" and user "${userId}"`);
        return null;
      }

      console.log(`[REPOSITORY] ✅ saveInterviewRecord: Successfully updated interview "${interviewId}" in MongoDB`);
      return updated.toObject();
    } catch (err) {
      console.error(`[REPOSITORY] ❌ saveInterviewRecord MongoDB error for interview "${interviewId}": ${err.message}`, err);
      throw err;
    }
  }

  const interviews = await readStore();
  const index = interviews.findIndex(
    (item) => item._id === interviewId && item.clerkUserId === userId
  );

  if (index === -1) {
    console.warn(`[REPOSITORY] ⚠️ saveInterviewRecord: Record not found in Local JSON Store for id "${interviewId}" and user "${userId}"`);
    return null;
  }

  const nextInterview = normalizeInterview({
    ...interviews[index],
    ...interview,
    clerkUserId: userId,
    updatedAt: new Date().toISOString(),
  });

  interviews[index] = nextInterview;
  await writeStore(interviews);

  console.log(`[REPOSITORY] ✅ saveInterviewRecord: Successfully updated interview "${interviewId}" in Local JSON Store`);
  return nextInterview;
}

export function deleteInterviewRecord(userId, interviewId) {
  return serializeMutation(() => deleteInterviewRecordImpl(userId, interviewId));
}
async function deleteInterviewRecordImpl(userId, interviewId) {
  const storage = isMongoReady() ? 'MongoDB' : 'Local JSON Store';
  console.log(`[REPOSITORY] 🗑️ deleteInterviewRecord: Deleting interview "${interviewId}" for userId: "${userId}" via ${storage}`);

  if (isMongoReady()) {
    const deleted = await Interview.findOneAndDelete({ _id: interviewId, clerkUserId: userId });
    if (!deleted) {
      console.warn(`[REPOSITORY] ⚠️ deleteInterviewRecord: Interview "${interviewId}" not found in MongoDB`);
      return null;
    }
    console.log(`[REPOSITORY] ✅ deleteInterviewRecord: Deleted interview "${interviewId}" from MongoDB`);
    return deleted.toObject();
  }

  const interviews = await readStore();
  const index = interviews.findIndex(
    (item) => item._id === interviewId && item.clerkUserId === userId
  );

  if (index === -1) {
    console.warn(`[REPOSITORY] ⚠️ deleteInterviewRecord: Interview "${interviewId}" not found in Local JSON Store`);
    return null;
  }

  const [deleted] = interviews.splice(index, 1);
  await writeStore(interviews);
  console.log(`[REPOSITORY] ✅ deleteInterviewRecord: Deleted interview "${interviewId}" from Local JSON Store`);
  return normalizeInterview(deleted);
}
