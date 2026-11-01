import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completedInterviews, setCompletedInterviews] = useState([]);
  const [activeInterviewId, setActiveInterviewId] = useState(id || null);

  useEffect(() => {
    fetchFeedbackData();
  }, [id]);

  const fetchFeedbackData = async () => {
    setLoading(true);
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
      console.error('Failed to load feedback:', err);
      setFeedback(null);
    } finally {
      setLoading(false);
    }
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
          <Link to="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <Link to="/create-interview">
            <Button variant="gradient">
              <PlusCircle className="w-4 h-4 mr-2" />
              Start an Interview
            </Button>
          </Link>
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
            <Link to="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
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
      {feedback.evaluationSource === 'heuristic' && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">AI evaluation was unavailable. These are word-count-based practice estimates, not an assessment of answer correctness.</div>}
      {feedback.mode === 'live' && <p className="text-sm text-muted-foreground">Live interview feedback is based on the saved transcript, not your vocal tone. Transcription errors can affect the evaluation.</p>}
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </Link>
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
              <Select value={activeInterviewId || ''} onValueChange={handleSelectInterview}>
                <SelectTrigger className="w-[210px] h-8 text-xs bg-transparent border-0 shadow-none focus:ring-0">
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
            Score: {feedback.score}%
          </Badge>
        </div>
      </div>

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Overall Score', value: `${feedback.score}%`, icon: Target, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
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
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="questions">Question Review</TabsTrigger>
          <TabsTrigger value="improvements">Improvements</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
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
                      <Bar dataKey="score" fill="#6366F1" radius={[6, 6, 0, 0]} />
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
                        stroke="#6366F1"
                        fill="#6366F1"
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
                      {qf.score}%
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
      </Tabs>

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pt-4">
        {activeInterviewId && (
          <Link to={`/interview/${activeInterviewId}`}>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry Interview
            </Button>
          </Link>
        )}
        <Link to="/create-interview">
          <Button variant="gradient">
            <BarChart3 className="w-4 h-4 mr-2" />
            Try Different Role
          </Button>
        </Link>
      </div>
    </div>
  );
}
