import LiveInterview from "@/components/LiveInterview";
import { readResume } from "@/lib/resume";
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import api from "@/lib/api";
import { INTERVIEW_TYPES, EXPERIENCE_LEVELS, JOB_ROLES } from "@/lib/constants";
import {
  Sparkles,
  Loader2,
  ArrowRight,
  ChevronRight,
  FileText,
  Settings,
  Play,
} from "lucide-react";

export default function CreateInterview() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [step, setStep] = useState(1);
  const [liveDraft, setLiveDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [resumeName, setResumeName] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    role: params.has("personal")
      ? "Student / Graduate"
      : params.has("coding")
        ? "Software Engineer"
        : "",
    type: params.has("personal")
      ? "behavioral"
      : params.has("coding")
        ? "technical"
        : "",
    experience: params.has("personal") ? "entry" : "",
    focusArea: params.has("personal")
      ? "Personal introduction, expressing strengths and career goals using real examples"
      : "",
    resumeText: "",
    codingRound: params.has("coding"),
    codingLanguage: "JavaScript",
    questionCount: "5",
    mode: "standard",
  });

  const codingEligible =
    /developer|software|data|machine learning|devops|cloud|qa|automation|security|sre|platform|embedded/i.test(
      formData.role,
    );
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (loading || resumeLoading) return;
    if (!isStep1Valid) {
      setError("Choose a role, interview type, and experience level.");
      setStep(1);
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await api.post("/interviews", {
        ...formData,
        codingRound:
          formData.codingRound &&
          codingEligible &&
          formData.mode === "standard",
      });

      if (!res.data?._id)
        throw new Error("The interview was not created. Please retry.");
      if (formData.mode === "live") {
        setLiveDraft({ interview: { ...formData, ...res.data }, settings: JSON.stringify(formData) });
        setStep(3);
      } else navigate(`/interview/${res.data._id}`);
    } catch (err) {
      console.error("Failed to create interview:", err);
      console.log(err.response?.data);
      setError(
        err.response?.data?.error ||
          err.message ||
          "Failed to create interview",
      );
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid = formData.role && formData.type && formData.experience;

  return (
    <div className="container setup-studio max-w-4xl py-8 sm:py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Design your next opportunity</h1>
        <p className="text-muted-foreground mt-2">
          A considered space to prepare, practise, and grow. Tailor your session
          in three simple steps.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step >= s
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>

            {s < 3 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card className="surface-card editorial-enter overflow-hidden rounded-3xl border-primary/15">
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Settings className="w-5 h-5" />
              Build your interview
            </CardTitle>

            <CardDescription>
              Choose the conversation you want to practise. Your study notes
              will follow these selections.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-7">
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">
                Interview experience
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  [
                    "standard",
                    "Question by question",
                    "Type or record an answer, then move to the next question.",
                  ],
                  [
                    "live",
                    "Live voice interview",
                    "Talk naturally with an AI interviewer. No Next button needed.",
                  ],
                ].map(([value, title, description]) => (
                  <label
                    key={value}
                    className={`selection-tile cursor-pointer rounded-2xl border p-5 ${formData.mode === value ? "border-primary bg-primary/5" : ""}`}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      <input
                        type="radio"
                        name="mode"
                        value={value}
                        checked={formData.mode === value}
                        onChange={() => handleChange("mode", value)}
                      />
                      {title}
                    </span>
                    <span className="mt-2 block text-sm text-muted-foreground">
                      {description}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="setup-field rounded-2xl border border-primary/10 bg-primary/[0.025] p-5">
              <Label htmlFor="interview-role">Role</Label>

              <Select
                value={formData.role}
                onValueChange={(v) => handleChange("role", v)}
              >
                <SelectTrigger
                  className="mt-2 h-14 rounded-2xl bg-background px-5"
                  id="interview-role"
                >
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>

                <SelectContent>
                  {JOB_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="setup-field rounded-2xl border border-primary/10 bg-primary/[0.025] p-5">
              <Label htmlFor="interview-type">Interview Type</Label>

              <Select
                value={formData.type}
                onValueChange={(v) => handleChange("type", v)}
              >
                <SelectTrigger
                  className="mt-2 h-14 rounded-2xl bg-background px-5"
                  id="interview-type"
                >
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>

                <SelectContent>
                  {INTERVIEW_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="setup-field rounded-2xl border border-primary/10 bg-primary/[0.025] p-5">
              <Label htmlFor="interview-experience">Experience</Label>

              <Select
                value={formData.experience}
                onValueChange={(v) => handleChange("experience", v)}
              >
                <SelectTrigger
                  className="mt-2 h-14 rounded-2xl bg-background px-5"
                  id="interview-experience"
                >
                  <SelectValue placeholder="Select Experience" />
                </SelectTrigger>

                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <label className="text-sm font-medium">
                Session length
                <select
                  className="mt-2 block w-full rounded-xl border bg-background p-3"
                  value={formData.questionCount}
                  onChange={(e) =>
                    handleChange("questionCount", e.target.value)
                  }
                >
                  {[3, 5, 8, 10, 15, 20].map((n) => (
                    <option key={n} value={n}>
                      {n} questions{n === 3 ? " · quick practice" : ""}
                    </option>
                  ))}
                </select>
              </label>
              {codingEligible && formData.mode === "standard" && (
                <div>
                  <label className="flex gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.codingRound}
                      onChange={(e) =>
                        handleChange("codingRound", e.target.checked)
                      }
                    />
                    Include a final coding round
                  </label>
                  {formData.codingRound && (
                    <label className="mt-3 block text-sm">
                      Coding language
                      <select
                        className="mt-2 block w-full rounded-xl border p-3"
                        value={formData.codingLanguage}
                        onChange={(e) =>
                          handleChange("codingLanguage", e.target.value)
                        }
                      >
                        {["JavaScript", "Python", "Java", "C++", "SQL"].map(
                          (lang) => (
                            <option key={lang}>{lang}</option>
                          ),
                        )}
                      </select>
                      <span className="mt-2 block text-xs text-muted-foreground">
                        AI code review, without execution. One of your selected
                        questions becomes the coding round.
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
            <Button disabled={!isStep1Valid} onClick={() => setStep(2)}>
              Next
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="surface-card editorial-enter overflow-hidden rounded-3xl border-primary/15">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Additional Details
            </CardTitle>
            <CardDescription>Make this interview yours. These details are optional—you can skip ahead to review.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="rounded-2xl border border-primary/15 bg-primary/[0.03] p-5 sm:p-6">
              <div className="mb-4 flex items-start gap-3">
                <span className="rounded-xl bg-primary/10 p-2.5 text-primary"><FileText className="h-5 w-5" aria-hidden="true" /></span>
                <div><Label htmlFor="resume-upload" className="text-base">Your résumé</Label><p id="resume-upload-help" className="mt-1 text-xs leading-5 text-muted-foreground">PDF up to 5 MB or .txt up to 64 KB. Scanned PDFs are not supported.</p></div>
              </div>
              <input
                id="resume-upload"
                type="file"
                accept=".pdf,application/pdf,.txt,text/plain"
                disabled={resumeLoading}
                aria-describedby="resume-upload-help"
                className="block w-full min-w-0 rounded-xl border border-dashed border-primary/25 bg-background p-3 text-sm text-muted-foreground file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleChange("resumeText", "");
                    setResumeName("");
                    setResumeLoading(true);
                    setError("");
                    try {
                      const text = await readResume(file);
                      handleChange("resumeText", text);
                      setResumeName(file.name);
                    } catch (err) {
                      setError(err.message || "Could not read this résumé. Try a text-based PDF or .txt file.");
                    } finally {
                      setResumeLoading(false);
                      e.target.value = "";
                    }
                  }}
              />
              <div role="status" aria-live="polite" className="mt-3 flex min-w-0 items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="min-w-0 break-all">{resumeLoading ? "Reading your résumé…" : resumeName ? `Ready: ${resumeName}` : "Your résumé helps tailor the interview to your experience."}</span>
                {resumeName && <Button type="button" variant="ghost" size="sm" onClick={() => { handleChange("resumeText", ""); setResumeName(""); }}>Remove</Button>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="focus-areas">Focus areas</Label>
              <p id="focus-areas-help" className="text-xs leading-5 text-muted-foreground">Tell us what you’d like to practice most.</p>
              <Textarea id="focus-areas" aria-describedby="focus-areas-help" className="min-h-[110px] resize-y rounded-xl p-4 leading-relaxed" maxLength={2000} placeholder="e.g. React fundamentals, system design, or explaining leadership experience" value={formData.focusArea} onChange={(e) => handleChange("focusArea", e.target.value)} />
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>

              <Button disabled={loading || resumeLoading} onClick={() => {
                if (formData.mode !== "live") setStep(3);
                else if (liveDraft?.settings === JSON.stringify(formData)) setStep(3);
                else handleSubmit();
              }}>{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing…</> : "Review"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="surface-card editorial-enter overflow-hidden rounded-3xl border-primary/15">
          <CardHeader>
            <CardTitle className="flex gap-2 items-center">
              <Sparkles className="w-5 h-5" />
              Review
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="space-y-2 mb-6">
              <p>
                <strong>Questions:</strong> {formData.questionCount}
              </p>
              <p>
                <strong>Résumé context:</strong>{" "}
                {formData.resumeText ? "Included" : "Not supplied"}
              </p>
              {formData.codingRound &&
                codingEligible &&
                formData.mode === "standard" && (
                  <p>
                    <strong>Final coding round:</strong>{" "}
                    {formData.codingLanguage}
                  </p>
                )}
              <p>
                <strong>Role:</strong> {formData.role}
              </p>
              <p>
                <strong>Type:</strong> {formData.type}
              </p>
              <p>
                <strong>Experience:</strong> {formData.experience}
              </p>
              <p>
                <strong>Experience mode:</strong>{" "}
                {formData.mode === "live"
                  ? "Live voice interview"
                  : "Question by question"}
              </p>
              {formData.mode === "live" && (
                <p className="text-sm text-muted-foreground">
                  Allow microphone access when you start. You can mute or end
                  the conversation at any time.
                </p>
              )}
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                disabled={loading || resumeLoading}
              >
                Back
              </Button>

              {formData.mode !== "live" && <Button onClick={handleSubmit} disabled={loading || resumeLoading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 w-4 h-4" />
                    Start interview
                  </>
                )}
              </Button>}
            </div>
            {formData.mode === "live" && liveDraft && <LiveInterview key={liveDraft.interview._id} interview={liveDraft.interview} embedded />}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
