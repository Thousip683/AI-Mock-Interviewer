import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Separator } from "@/components/ui/separator";
import api from "@/lib/api";
import {
  INTERVIEW_TYPES,
  EXPERIENCE_LEVELS,
  JOB_ROLES,
} from "@/lib/constants";
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

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    role: "",
    type: "",
    experience: "",
    jobDescription: "",
    focusArea: "",
    questionCount: "5",
    mode: "standard",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!isStep1Valid) { setError('Choose a role, interview type, and experience level.'); setStep(1); return; }
    setError(''); setLoading(true);

    try {
      const res = await api.post("/interviews", formData);

      if (!res.data?._id) throw new Error('The interview was not created. Please retry.');
      navigate(`/interview/${res.data._id}`);
    } catch (err) {
      console.error("Failed to create interview:", err);
      console.log(err.response?.data);
      setError(err.response?.data?.error || err.message || 'Failed to create interview');
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid =
    formData.role &&
    formData.type &&
    formData.experience;

  return (
    <div className="container setup-studio max-w-4xl py-8 sm:py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Design your next opportunity
        </h1>
        <p className="text-muted-foreground mt-2">
          A considered space to prepare, practise, and grow. Tailor your session in three simple steps.
        </p>
      </div>

      {error && <p role="alert" className="mb-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
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
              Choose the conversation you want to practise. Your study notes will follow these selections.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-7">

            <fieldset className="space-y-3">
              <legend className="text-sm font-medium">Interview experience</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['standard', 'Question by question', 'Type or record an answer, then move to the next question.'],
                  ['live', 'Live voice interview', 'Talk naturally with an AI interviewer. No Next button needed.'],
                ].map(([value, title, description]) => <label key={value} className={`selection-tile cursor-pointer rounded-2xl border p-5 ${formData.mode === value ? 'border-primary bg-primary/5' : ''}`}>
                  <span className="flex items-center gap-2 font-medium"><input type="radio" name="mode" value={value} checked={formData.mode === value} onChange={() => handleChange('mode', value)} />{title}</span>
                  <span className="mt-2 block text-sm text-muted-foreground">{description}</span>
                </label>)}
              </div>
            </fieldset>

            <div className="setup-field rounded-2xl border border-primary/10 bg-primary/[0.025] p-5">
              <Label htmlFor="interview-role">Role</Label>

              <Select
                value={formData.role}
                onValueChange={(v) =>
                  handleChange("role", v)
                }
              >
                <SelectTrigger className="mt-2 h-14 rounded-2xl bg-background px-5" id="interview-role">
                  <SelectValue placeholder="Select Role" />
                </SelectTrigger>

                <SelectContent>
                  {JOB_ROLES.map((role) => (
                    <SelectItem
                      key={role}
                      value={role}
                    >
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
                onValueChange={(v) =>
                  handleChange("type", v)
                }
              >
                <SelectTrigger className="mt-2 h-14 rounded-2xl bg-background px-5" id="interview-type">
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>

                <SelectContent>
                  {INTERVIEW_TYPES.map((type) => (
                    <SelectItem
                      key={type.value}
                      value={type.value}
                    >
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
                onValueChange={(v) =>
                  handleChange("experience", v)
                }
              >
                <SelectTrigger className="mt-2 h-14 rounded-2xl bg-background px-5" id="interview-experience">
                  <SelectValue placeholder="Select Experience" />
                </SelectTrigger>

                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem
                      key={level.value}
                      value={level.value}
                    >
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              disabled={!isStep1Valid}
              onClick={() => setStep(2)}
            >
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
          </CardHeader>

          <CardContent className="space-y-5">

            <Label htmlFor="job-description">Job description (optional)</Label>
            <Textarea id="job-description" maxLength={12000}
              placeholder="Job Description"
              value={formData.jobDescription}
              onChange={(e) =>
                handleChange(
                  "jobDescription",
                  e.target.value
                )
              }
            />

            <Separator />

            <Label htmlFor="focus-areas">Focus areas (optional)</Label>
            <Textarea id="focus-areas" maxLength={2000}
              placeholder="Focus Areas"
              value={formData.focusArea}
              onChange={(e) =>
                handleChange(
                  "focusArea",
                  e.target.value
                )
              }
            />

            <div className="flex justify-between">

              <Button
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>

              <Button
                onClick={() => setStep(3)}
              >
                Review
              </Button>

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
              <p><strong>Role:</strong> {formData.role}</p>
              <p><strong>Type:</strong> {formData.type}</p>
              <p><strong>Experience:</strong> {formData.experience}</p>
              <p><strong>Experience mode:</strong> {formData.mode === 'live' ? 'Live voice interview' : 'Question by question'}</p>
              {formData.mode === 'live' && <p className="text-sm text-muted-foreground">Allow microphone access when you start. You can mute or end the conversation at any time.</p>}
            </div>

            <div className="flex justify-between">

              <Button
                variant="outline"
                onClick={() => setStep(2)} disabled={loading}
              >
                Back
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 w-4 h-4" />
                    Prepare for interview
                  </>
                )}
              </Button>

            </div>

          </CardContent>

        </Card>
      )}
    </div>
  );
}
