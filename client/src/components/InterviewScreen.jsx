import PreparationGuide from '@/components/PreparationGuide';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import LiveInterview from '@/components/LiveInterview';
import { 
  Mic, MicOff, Send, Play, 
  Loader2, Clock, ArrowLeft, CheckCircle2,
  MessageSquare, SkipForward, AlertCircle, Brain
} from 'lucide-react';

export default function InterviewScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [interview, setInterview] = useState(null);
  // questions grows dynamically as follow-ups are fetched
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFetchingFollowUp, setIsFetchingFollowUp] = useState(false);
  const [stage, setStage] = useState('loading'); // loading, generating, ready, in_progress, fetching_followup, submitting, error
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [operationError, setOperationError] = useState('');
  const actionRef = useRef(false);
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const loadingRef = useRef(false);

  useEffect(() => {
    fetchInterview();
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

  const fetchInterview = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const res = await api.get(`/interviews/${id}`);
      setInterview(res.data);

      if (res.data.status === 'completed') {
        navigate(`/feedback/${id}`);
        return;
      }
      if (res.data.mode === 'live') {
        setStage('live');
        return;
      }

      // Load existing questions
      const qRes = await api.get(`/interviews/${id}/questions`);
      setQuestions(qRes.data);
      const savedAnswers = res.data.answers || [];
      const resumeIndex = Math.min(savedAnswers.length, Math.max(0, qRes.data.length - 1));
      setAnswers(savedAnswers); setCurrentIndex(resumeIndex);
      setAnswer(savedAnswers[resumeIndex]?.answer || '');

      if (qRes.data.length > 0) {
        setStage('ready');
      } else {
        // Generate the opening question
        setStage('generating');
        const genRes = await api.post(`/interviews/${id}/generate`);
        setQuestions(genRes.data);
        setStage('ready');
      }
    } catch (err) {
      setOperationError(err.response?.data?.error || 'Could not load this interview. Please retry from the dashboard.');
      setStage('error');
    } finally {
      loadingRef.current = false;
    }
  };

  const startTimer = useCallback((minutes) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeLeft(minutes * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startInterview = () => {
    setStage('in_progress');
    startTimer(3); // 3 minutes per question for more thoughtful answers
  };

  /**
   * Called when the candidate clicks "Next" or "Skip".
   * 1. Save the current answer.
   * 2. Request a follow-up question from the server (adaptive AI).
   * 3. If the server signals isComplete OR we hit max questions → submit.
   */
  const advanceInterview = async ({ skip = false } = {}) => {
    setOperationError('');
    if (recognitionRef.current) { recognitionRef.current.onresult = null; recognitionRef.current.stop(); setIsRecording(false); }
    if (timerRef.current) clearInterval(timerRef.current);

    const currentQuestion = questions[currentIndex];
    const currentAnswer = {
      questionId: currentQuestion._id,
      question: currentQuestion.text,
      answer: skip ? '' : answer.trim(),
    };
    const newAnswers = [...answers];
    newAnswers[currentIndex] = currentAnswer;
    setAnswers(newAnswers);

    const maxQuestions = interview?.questionCount || 5;
    const nextIndex = currentIndex + 1; // how many questions answered after this one

    // Reached the configured question count — submit without requesting a follow-up
    if (nextIndex >= maxQuestions) {
      await submitInterview(newAnswers);
      return;
    }

    // Request an adaptive follow-up from the server
    setIsFetchingFollowUp(true);
    setStage('fetching_followup');
    try {
      const res = await api.post(`/interviews/${id}/followup`, {
        previousQuestion: currentQuestion.text,
        previousAnswer: currentAnswer.answer,
        questionIndex: nextIndex - 1, // 0-based index of the question just answered
      });

      if (res.data.isComplete || !res.data.question) {
        // AI says we have enough coverage — submit
        await submitInterview(newAnswers);
        return;
      }

      setQuestions(previous => { const next = [...previous]; next[nextIndex] = res.data.question; return next; });
      setCurrentIndex(nextIndex);
      setAnswer(newAnswers[nextIndex]?.answer || '');
      startTimer(3);
      setStage('in_progress');
    } catch (err) {
      console.error('Failed to get follow-up question:', err);
      setOperationError(err.response?.data?.error || 'Could not save your answer or load the next question. Your answer is still here; please retry.');
      setStage('in_progress'); startTimer(3);
    } finally {
      setIsFetchingFollowUp(false);
    }
  };

  const handleNext = async (options) => {
    if (actionRef.current) return;
    actionRef.current = true;
    try { await advanceInterview(options); }
    finally { actionRef.current = false; }
  };

  const submitInterview = async (finalAnswers) => {
    setStage('submitting');
    setIsProcessing(true);
    try {
      await api.post(`/interviews/${id}/submit`, {
        answers: finalAnswers,
        questions,
      });
      navigate(`/feedback/${id}`);
    } catch (err) {
      setOperationError(err.response?.data?.error || 'Submission failed. Your answers are kept here; select Complete to retry.');
      setStage('in_progress');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setOperationError('Voice dictation is unavailable in this browser. Type your answer or use a browser with SpeechRecognition support.');
      return;
    }
    if (isRecording) stopRecording();
    else startRecording();
  };

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      setAnswer(prev => prev + finalTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      setOperationError(`Dictation stopped (${event.error}). Your typed answer is still available.`);
    };

    recognitionRef.current = recognition;
    recognition.onend = () => setIsRecording(false);
    try { recognition.start(); setIsRecording(true); }
    catch { setOperationError('Microphone could not start. Check browser permissions and try again.'); setIsRecording(false); }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  if (stage === 'live') return <LiveInterview key={id} interview={interview} />;

  // ── Loading/Generating screen ───────────────────────────────────────────────
  if (stage === 'loading' || stage === 'generating') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {stage === 'generating' ? 'Preparing Your Interview...' : 'Loading Interview...'}
          </h2>
          <p className="text-muted-foreground">
            {stage === 'generating'
              ? 'The AI interviewer is crafting your opening question'
              : 'Preparing your interview session'}
          </p>
        </div>
      </div>
    );
  }

  // ── Fetching follow-up screen ───────────────────────────────────────────────
  if (stage === 'fetching_followup') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Brain className="w-16 h-16 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Answer...</h2>
          <p className="text-muted-foreground mb-4">
            The AI interviewer is reviewing your response and deciding what to explore next.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 py-2 px-4 rounded-full max-w-xs mx-auto">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
            Preparing follow-up question...
          </div>
        </div>
      </div>
    );
  }

  // ── Submitting / analyzing screen ──────────────────────────────────────────
  if (stage === 'submitting') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Loader2 className="w-16 h-16 animate-spin text-primary" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-primary/40 animate-ping" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Interview...</h2>
          <p className="text-muted-foreground mb-4">
            AI is evaluating your answers, assessing technical depth, and generating your detailed feedback report.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 py-2 px-4 rounded-full max-w-xs mx-auto">
            <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
            Generating feedback report...
          </div>
        </div>
      </div>
    );
  }

  // ── Error screen ───────────────────────────────────────────────────────────
  if (stage === 'error') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">{operationError || 'Failed to load interview. Please try again.'}</p>
          <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
        </div>
      </div>
    );
  }

  // ── Ready screen ───────────────────────────────────────────────────────────
  if (stage === 'ready') {
    const maxQ = interview?.questionCount || 5;
    return (
      <div className="container max-w-3xl py-8">
        <Card className="text-center">
          <CardHeader>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Ready to Begin?</CardTitle>
            <CardDescription className="text-base max-w-md mx-auto">
              The AI interviewer will ask you one question at a time and adapt based on your answers — just like a real technical interview.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PreparationGuide interview={interview} />
            <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto mb-6">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold text-primary">~{maxQ}</p>
                <p className="text-xs text-muted-foreground">Questions</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold text-primary">3</p>
                <p className="text-xs text-muted-foreground">Min/Each</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-2xl font-bold text-primary">AI</p>
                <p className="text-xs text-muted-foreground">Adaptive</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Questions will adapt to your answers. The interviewer may go deeper on strong responses or probe gaps in weaker ones.
            </p>
          </CardContent>
          <CardFooter className="justify-center gap-4">
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button variant="gradient" size="lg" onClick={startInterview}>
              <Play className="w-5 h-5 mr-2" />
              Start Interview
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // ── In-progress screen ─────────────────────────────────────────────────────
  const currentQuestion = questions[currentIndex];
  const maxQuestions = interview?.questionCount || 5;
  const minutes = Math.floor((timeLeft || 0) / 60);
  const seconds = (timeLeft || 0) % 60;
  const isLastQuestion = currentIndex >= maxQuestions - 1;
  const isBusy = isProcessing || isFetchingFollowUp;

  return (
    <div className="container max-w-4xl py-8">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">
            Question {currentIndex + 1} {`of ~${maxQuestions}`}
          </span>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className={`text-sm font-mono ${timeLeft < 30 ? 'text-destructive' : ''}`}>
              {minutes}:{seconds.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-primary rounded-full h-2 transition-all duration-500"
            style={{ width: `${Math.min(((currentIndex + 1) / maxQuestions) * 100, 100)}%` }}
          />
        </div>
      </div>

      {operationError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-800">{operationError}</p>}
      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline">{interview?.type} Question</Badge>
            {currentIndex > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Brain className="w-3 h-3" />
                Adaptive Follow-up
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl leading-relaxed">
            {currentQuestion?.text}
          </CardTitle>
          {currentQuestion?.context && (
            <CardDescription className="mt-2">
              {currentQuestion.context}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          {/* Answer Area */}
          <div className="relative">
            <Textarea
              aria-label="Your answer" placeholder="Type your answer here... (or use voice input)"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="min-h-[200px] text-base leading-relaxed resize-none"
              disabled={isBusy}
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <Button
                variant={isRecording ? 'destructive' : 'secondary'}
                size="sm"
                onClick={toggleRecording}
                className="gap-2"
                disabled={isBusy}
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Record
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Word count */}
          <div className="flex justify-between mt-2">
            <p className="text-xs text-muted-foreground">
              {answer.split(/\s+/).filter(Boolean).length} words
            </p>
            {currentIndex > 0 && (
              <p className="text-xs text-muted-foreground italic">
                Follow-up based on your previous answer
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="justify-between border-t bg-muted/50 px-6 py-4">
          <Button
            variant="ghost"
            onClick={() => {
              if (currentIndex > 0) {
                if (recognitionRef.current) { recognitionRef.current.onresult = null; recognitionRef.current.stop(); setIsRecording(false); }
                setAnswers(previous => { const next = [...previous]; next[currentIndex] = { question: questions[currentIndex].text, answer }; return next; });
                setCurrentIndex(prev => prev - 1);
                setAnswer(answers[currentIndex - 1]?.answer || '');
                startTimer(3);
              }
            }}
            disabled={currentIndex === 0 || isBusy}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => handleNext({ skip: true })} disabled={isBusy}>
              <SkipForward className="w-4 h-4 mr-2" />
              Skip
            </Button>
            <Button onClick={handleNext} disabled={isBusy || !answer.trim()}>
              {isFetchingFollowUp ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  Thinking...
                </>
              ) : isProcessing ? (
                <>
                  Submitting...
                  <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                </>
              ) : isLastQuestion ? (
                <>
                  Complete
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
