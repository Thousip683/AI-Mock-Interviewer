import RoadmapTree from '@/components/RoadmapTree';
import FeedbackCharts from '@/components/FeedbackCharts';
import FeedbackSummary from '@/components/FeedbackSummary';
import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Loader2, ArrowLeft, Target,
  ThumbsUp, AlertTriangle, Lightbulb, TrendingUp,
  RefreshCw, BarChart3, CheckCircle2, History, PlusCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';

export default function Feedback() {
  const { id } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportError, setReportError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retrying, setRetrying] = useState(false);
  const [completedInterviews, setCompletedInterviews] = useState([]);
  const [activeInterviewId, setActiveInterviewId] = useState(id || null);

  useEffect(() => {
    fetchFeedbackData();
  }, [id, search]);

  const fetchFeedbackData = async () => {
    setLoading(true);
    const requestedTab = new URLSearchParams(search).get('tab');
    setActiveTab(['summary', 'overview', 'questions', 'improvements', 'roadmap'].includes(requestedTab) ? requestedTab : 'summary');
    setLoadError(''); setReportError('');
    setFeedback(null);
    try {
      // Fetch all user interviews to support /feedback index view & interview switching
      const interviewsRes = await api.get('/interviews');
      const allInterviews = Array.isArray(interviewsRes.data) ? interviewsRes.data : [];
      const completed = allInterviews.filter((i) => i.status === 'completed');
      setCompletedInterviews(completed);

      // Determine which interview feedback to show
      let targetId = id;
      if (!targetId && completed.length > 0) {
        // Default to latest completed interview if on /feedback
        targetId = completed[0]._id;
      }

      if (targetId) {
        setActiveInterviewId(targetId);
        const res = await api.get(`/interviews/${targetId}/feedback`);
        setFeedback(res.data);
      } else {
        setActiveInterviewId(null);
        setFeedback(null);
      }
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Could not load saved feedback. Please try again.');
      setFeedback(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshReport = async () => {
    setRefreshing(true); setReportError('');
    try {
      const result = await api.post(`/interviews/${activeInterviewId}/feedback/refresh`);
      setFeedback(result.data);
      setCompletedInterviews(previous => previous.map(item => item._id === activeInterviewId ? { ...item, score: result.data.score } : item));
    } catch (error) { setReportError(error.response?.data?.error || 'Could not update the report. Please try again.'); }
    finally { setRefreshing(false); }
  };

  const retryInterview = async () => {
    if (retrying) return;
    setRetrying(true); setReportError('');
    try {
      const { data: original } = await api.get(`/interviews/${activeInterviewId}`);
      const configuration = Object.fromEntries(['role', 'type', 'experience', 'mode', 'jobDescription', 'focusArea', 'questionCount'].map(field => [field, original[field]]));
      const { data } = await api.post('/interviews', configuration);
      if (!data?._id) throw new Error('The interview was not created. Please try again.');
      navigate(`/interview/${data._id}`);
    } catch (error) { setReportError(error.response?.data?.error || error.message || 'Could not start another interview.'); }
    finally { setRetrying(false); }
  };

  const handleSelectInterview = (newId) => {
    if (newId && newId !== activeInterviewId) {
      navigate(`/feedback/${newId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Loading Feedback...</h2>
          <p className="text-muted-foreground">AI is preparing your performance report</p>
        </div>
      </div>
    );
  }

  if (loadError) return <div className="container max-w-xl py-16 text-center"><h1 className="text-3xl">Unable to load feedback</h1><p role="alert" className="my-5 text-sm text-muted-foreground">{loadError}</p><div className="flex justify-center gap-3"><Button onClick={fetchFeedbackData}>Try again</Button><Button asChild variant="outline"><Link to="/dashboard">Back to Dashboard</Link></Button></div></div>;

  // Empty state when user has no completed interviews
  if (!feedback && completedInterviews.length === 0) {
    return (
      <div className="container max-w-xl py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 dark:bg-purple-950/40 text-primary flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Interview Feedback Yet</h2>
        <p className="text-muted-foreground mb-6">
          You haven't completed any interviews yet. Complete your first mock interview to get comprehensive AI evaluation scores, category breakdowns, and personalized tips.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button variant="outline" asChild><Link to="/dashboard">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link></Button>
          <Button variant="gradient" asChild><Link to="/create-interview">
              <PlusCircle className="w-4 h-4 mr-2" />
              Start an Interview
            </Link></Button>
        </div>
      </div>
    );
  }

  // Not found or not completed state
  if (!feedback) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-6">
          <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Feedback not available</h2>
          <p className="text-muted-foreground mb-4">
            The feedback for this interview is either still processing or not found.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" asChild><Link to="/dashboard">Back to Dashboard</Link></Button>
            {completedInterviews.length > 0 && (
              <Button variant="default" onClick={() => navigate(`/feedback/${completedInterviews[0]._id}`)}>
                View Latest Feedback
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const performanceData = [
    { category: 'Technical', score: feedback.technicalScore ?? 0 },
    { category: 'Communication', score: feedback.communicationScore ?? 0 },
    { category: 'Confidence', score: feedback.confidenceScore ?? 0 },
    { category: 'Relevance', score: feedback.relevanceScore ?? 0 },
    { category: 'Depth', score: feedback.depthScore ?? 0 },
  ];

  const radarData = performanceData.map((d) => ({
    subject: d.category,
    score: d.score,
    fullMark: 100,
  }));

  return (
    <div className="container py-8 space-y-8">
      {reportError && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">{reportError}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">Your report is saved with this interview. Reopen it from Dashboard or Feedback to study again.</p>
        <Button variant="outline" disabled={refreshing || retrying} onClick={refreshReport}>{refreshing ? 'Analyzing saved answers…' : 'Re-analyze saved answers'}</Button>
      </div>
      {feedback.evaluationSource === 'heuristic' && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">AI evaluation was unavailable. These are word-count-based practice estimates, not an assessment of answer correctness.</div>}
      {feedback.mode === 'live' && <p className="text-sm text-muted-foreground">Live interview feedback is based on the saved transcript, not your vocal tone. Transcription errors can affect the evaluation.</p>}
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="ghost" size="sm" asChild><Link to="/dashboard">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Link></Button>
            <h1 className="text-3xl font-bold tracking-tight">Interview Feedback</h1>
          </div>
          <p className="text-muted-foreground ml-14">
            {feedback.role} • {feedback.type} Interview • {formatDate(feedback.date)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Switcher dropdown when user has multiple completed interviews */}
          {completedInterviews.length > 1 && (
            <div className="flex items-center gap-2 bg-muted/40 px-3 py-1.5 rounded-lg border">
              <History className="w-4 h-4 text-muted-foreground" />
              <Select disabled={refreshing || retrying} value={activeInterviewId || ''} onValueChange={handleSelectInterview}>
                <SelectTrigger aria-label="Saved interview" className="w-[210px] h-8 text-xs bg-transparent border-0 shadow-none focus:ring-0">
                  <SelectValue placeholder="Select interview" />
                </SelectTrigger>
                <SelectContent>
                  {completedInterviews.map((item) => (
                    <SelectItem key={item._id} value={item._id} className="text-xs">
                      {item.role} ({item.score || 0}%) • {formatDate(item.createdAt)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Badge
            variant={feedback.score >= 70 ? 'success' : feedback.score >= 50 ? 'warning' : 'destructive'}
            className="text-lg px-4 py-1.5"
          >
            Score: {feedback.score}/100
          </Badge>
        </div>
      </div>


      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Score', value: `${feedback.score}/100`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
          { label: 'Questions Answered', value: `${feedback.answered || 0}/${feedback.total || 0}`, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Strengths', value: feedback.strengths?.length || 0, icon: ThumbsUp, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Areas to Improve', value: feedback.improvements?.length || 0, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts & Details */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="h-auto flex flex-wrap justify-start">
          <TabsTrigger value="summary">Quick summary</TabsTrigger>
          <TabsTrigger value="overview">Score charts</TabsTrigger>
          <TabsTrigger value="questions">Question Review</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
          <TabsTrigger value="roadmap">Study roadmap</TabsTrigger>
        </TabsList>

        <TabsContent value="summary"><FeedbackSummary feedback={feedback} onReview={() => setActiveTab('questions')} onRoadmap={() => setActiveTab('roadmap')} /></TabsContent>
        <TabsContent value="overview">
          <div className="mb-6"><FeedbackCharts feedback={feedback} /></div>
          {feedback.overallFeedback && <details className="mb-6 rounded-xl border p-5"><summary className="cursor-pointer font-semibold">Read detailed assessment</summary><p className="mt-3 whitespace-pre-wrap text-sm leading-7">{feedback.overallFeedback}</p></details>}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Performance by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="category" className="text-xs" />
                      <YAxis domain={[0, 100]} className="text-xs" />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }} />
                      <Bar dataKey="score" fill="#87344f" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Skill Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid className="stroke-muted" />
                      <PolarAngleAxis dataKey="subject" className="text-xs" />
                      <PolarRadiusAxis angle={30} domain={[0, 100]} className="text-xs" />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#87344f"
                        fill="#87344f"
                        fillOpacity={0.2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="questions">
          <div className="space-y-4">
            {feedback.questionFeedback?.map((qf, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                        {index + 1}
                      </span>
                      <CardTitle className="text-base">{qf.question}</CardTitle>
                    </div>
                    <Badge variant={qf.score >= 70 ? 'success' : qf.score >= 50 ? 'warning' : 'destructive'}>
                      {qf.score}/100
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Your Answer:</p>
                      <p className="text-sm bg-muted/50 rounded-lg p-3">{qf.answer || 'No answer recorded.'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Feedback:</p>
                      <p className="text-sm">{qf.feedback}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                      <h3 className="font-semibold">Reference answer</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{qf.correctAnswer || 'A reference answer is not available in this report. Re-analyze the saved answers to request a detailed report.'}</p>
                    </div>
                    {!!qf.missingConcepts?.length && <StudyList title="Mistakes and missing concepts" items={qf.missingConcepts} />}
                    {!!qf.studyPoints?.length && <StudyList title="Key points to study" items={qf.studyPoints} />}
                    {qf.summary && <div className="rounded-lg bg-primary/5 p-4"><h3 className="text-sm font-semibold">Remember this</h3><p className="mt-2 text-sm leading-6">{qf.summary}</p></div>}
                    {qf.practiceTask && <p className="text-sm leading-6"><strong>Practice:</strong> {qf.practiceTask}</p>}
                    {qf.tips && (
                      <div className="flex items-start gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
                        <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" />
                        <p>{qf.tips}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="improvements">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <ThumbsUp className="w-5 h-5 text-emerald-600" />
                  Strengths
                </CardTitle>
                <CardDescription>What you did well</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feedback.strengths?.map((strength, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{strength}</span>
                    </li>
                  ))}
                  {(!feedback.strengths || feedback.strengths.length === 0) && (
                    <p className="text-sm text-muted-foreground">No strengths identified yet.</p>
                  )}
                </ul>
              </CardContent>
            </Card>

            {/* Areas for Improvement */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-600" />
                  Areas for Improvement
                </CardTitle>
                <CardDescription>Focus on these areas</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {feedback.improvements?.map((improvement, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                      <span className="text-sm">{improvement}</span>
                    </li>
                  ))}
                  {(!feedback.improvements || feedback.improvements.length === 0) && (
                    <p className="text-sm text-muted-foreground">No improvements suggested.</p>
                  )}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="roadmap"><RoadmapTree key={activeInterviewId} roadmap={feedback.roadmap} /></TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        {activeInterviewId && (
          <Button variant="outline" disabled={retrying || refreshing} onClick={retryInterview}><RefreshCw className="mr-2 h-4 w-4" />{retrying ? 'Creating new interview…' : 'Practice again'}</Button>
        )}
        <Button variant="gradient" asChild><Link to="/create-interview">
            <BarChart3 className="w-4 h-4 mr-2" />
            Try Different Role
          </Link></Button>
      </div>
    </div>
  );
}

function StudyList({ title, items }) {
  return <section><h3 className="mb-2 text-sm font-semibold">{title}</h3><ul className="list-disc space-y-2 pl-5 text-sm leading-6">{items.map((item, index) => <li key={index}>{item}</li>)}</ul></section>;
}
