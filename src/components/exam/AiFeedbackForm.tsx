import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Star, Plus, X, Loader2 } from "lucide-react";

interface AiFeedbackFormProps {
  examId: string;
  analysisId?: string;
  analysis?: {
    quality_score?: string;
    diagnosis?: string[];
    biomarkers?: any;
    measurements?: any;
  };
  doctorId: string;
  onSubmit: () => void;
  onSkip: () => void;
}

export function AiFeedbackForm({
  examId,
  analysisId,
  analysis,
  doctorId,
  onSubmit,
  onSkip,
}: AiFeedbackFormProps) {
  const { toast } = useToast();
  
  // Form states
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [accuracy, setAccuracy] = useState<string>("");
  const [qualityAgree, setQualityAgree] = useState<boolean | null>(null);
  const [qualityCorrect, setQualityCorrect] = useState("");
  const [diagnosisFeedback, setDiagnosisFeedback] = useState<string>("");
  const [confirmedDiagnoses, setConfirmedDiagnoses] = useState<string[]>([]);
  const [newDiagnosis, setNewDiagnosis] = useState("");
  const [addedDiagnoses, setAddedDiagnoses] = useState<string[]>([]);
  const [isReferenceCase, setIsReferenceCase] = useState(false);
  const [difficulty, setDifficulty] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [pathologyTags, setPathologyTags] = useState<string[]>([]);
  const [comments, setComments] = useState("");
  const [teachingNotes, setTeachingNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddDiagnosis = () => {
    if (newDiagnosis.trim() && !addedDiagnoses.includes(newDiagnosis.trim())) {
      setAddedDiagnoses([...addedDiagnoses, newDiagnosis.trim()]);
      setNewDiagnosis("");
    }
  };

  const handleRemoveDiagnosis = (diagnosis: string) => {
    setAddedDiagnoses(addedDiagnoses.filter((d) => d !== diagnosis));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !pathologyTags.includes(tagInput.trim())) {
      setPathologyTags([...pathologyTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setPathologyTags(pathologyTags.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Selecione uma avaliação geral", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine removed diagnoses
      const diagnosisRemoved = analysis?.diagnosis?.filter(
        (d) => !confirmedDiagnoses.includes(d)
      ) || [];

      const { error } = await supabase.from("ai_feedback").insert({
        exam_id: examId,
        ai_analysis_id: analysisId || null,
        doctor_id: doctorId,
        overall_rating: rating,
        accuracy_rating: accuracy || null,
        quality_feedback: qualityAgree === null ? null : qualityAgree ? "agree" : "disagree",
        quality_correct: qualityAgree === false ? qualityCorrect : null,
        diagnosis_feedback: diagnosisFeedback || null,
        diagnosis_added: addedDiagnoses.length > 0 ? addedDiagnoses : null,
        diagnosis_removed: diagnosisRemoved.length > 0 ? diagnosisRemoved : null,
        diagnosis_correct: confirmedDiagnoses.length > 0 ? confirmedDiagnoses : null,
        general_comments: comments || null,
        teaching_notes: teachingNotes || null,
        is_reference_case: isReferenceCase,
        case_difficulty: difficulty || null,
        pathology_tags: pathologyTags.length > 0 ? pathologyTags : null,
      });

      if (error) throw error;

      toast({ title: "Feedback enviado com sucesso!" });
      onSubmit();
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({ title: "Erro ao enviar feedback", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Avaliação da Análise da IA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Star Rating */}
        <div className="space-y-2">
          <Label>Avaliação Geral *</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground"
                  }`}
                />
              </button>
            ))}
            {rating > 0 && (
              <span className="ml-2 text-sm text-muted-foreground self-center">
                {rating} de 5
              </span>
            )}
          </div>
        </div>

        {/* Accuracy Rating */}
        <div className="space-y-2">
          <Label>Precisão da Análise</Label>
          <RadioGroup value={accuracy} onValueChange={setAccuracy}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="correct" id="correct" />
              <Label htmlFor="correct" className="font-normal cursor-pointer">
                Correta
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partially_correct" id="partial" />
              <Label htmlFor="partial" className="font-normal cursor-pointer">
                Parcialmente Correta
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="incorrect" id="incorrect" />
              <Label htmlFor="incorrect" className="font-normal cursor-pointer">
                Incorreta
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Quality Feedback */}
        {analysis?.quality_score && (
          <div className="space-y-2">
            <Label>
              Qualidade da Imagem: <Badge variant="outline">{analysis.quality_score}</Badge>
            </Label>
            <div className="flex items-center gap-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="quality-agree"
                  checked={qualityAgree === true}
                  onCheckedChange={(checked) => setQualityAgree(checked ? true : null)}
                />
                <Label htmlFor="quality-agree" className="font-normal">
                  Concordo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="quality-disagree"
                  checked={qualityAgree === false}
                  onCheckedChange={(checked) => setQualityAgree(checked ? false : null)}
                />
                <Label htmlFor="quality-disagree" className="font-normal">
                  Discordo
                </Label>
              </div>
            </div>
            {qualityAgree === false && (
              <Input
                placeholder="Qual seria a avaliação correta?"
                value={qualityCorrect}
                onChange={(e) => setQualityCorrect(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Diagnosis Feedback */}
        {analysis?.diagnosis && analysis.diagnosis.length > 0 && (
          <div className="space-y-2">
            <Label>Diagnósticos da IA</Label>
            <div className="space-y-2 mb-2">
              {analysis.diagnosis.map((diagnosis, idx) => (
                <div key={idx} className="flex items-center space-x-2">
                  <Checkbox
                    id={`diag-${idx}`}
                    checked={confirmedDiagnoses.includes(diagnosis)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setConfirmedDiagnoses([...confirmedDiagnoses, diagnosis]);
                      } else {
                        setConfirmedDiagnoses(confirmedDiagnoses.filter((d) => d !== diagnosis));
                      }
                    }}
                  />
                  <Label htmlFor={`diag-${idx}`} className="font-normal cursor-pointer">
                    {diagnosis}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Marque os diagnósticos que estão corretos
            </p>
          </div>
        )}

        {/* Add Missing Diagnoses */}
        <div className="space-y-2">
          <Label>Diagnósticos Faltantes</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar diagnóstico..."
              value={newDiagnosis}
              onChange={(e) => setNewDiagnosis(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddDiagnosis())}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleAddDiagnosis}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {addedDiagnoses.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {addedDiagnoses.map((d, idx) => (
                <Badge key={idx} variant="secondary" className="gap-1">
                  {d}
                  <button onClick={() => handleRemoveDiagnosis(d)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Reference Case Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
          <div>
            <Label>Marcar como Caso de Referência</Label>
            <p className="text-xs text-muted-foreground mt-1">
              Casos de referência são usados para treinamento da IA
            </p>
          </div>
          <Switch checked={isReferenceCase} onCheckedChange={setIsReferenceCase} />
        </div>

        {/* Difficulty Select */}
        <div className="space-y-2">
          <Label>Dificuldade do Caso</Label>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a dificuldade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Fácil</SelectItem>
              <SelectItem value="moderate">Moderado</SelectItem>
              <SelectItem value="difficult">Difícil</SelectItem>
              <SelectItem value="rare">Raro</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pathology Tags */}
        <div className="space-y-2">
          <Label>Tags de Patologias</Label>
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
            />
            <Button type="button" variant="outline" size="icon" onClick={handleAddTag}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {pathologyTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {pathologyTags.map((tag, idx) => (
                <Badge key={idx} variant="outline" className="gap-1">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Comments */}
        <div className="space-y-2">
          <Label>Comentários Gerais</Label>
          <Textarea
            placeholder="Observações sobre a análise..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
          />
        </div>

        {/* Teaching Notes */}
        <div className="space-y-2">
          <Label>Notas de Ensino (opcional)</Label>
          <Textarea
            placeholder="Notas para fins didáticos..."
            value={teachingNotes}
            onChange={(e) => setTeachingNotes(e.target.value)}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">
            Use este campo para casos didáticos interessantes
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4">
          <Button onClick={handleSubmit} disabled={isSubmitting} className="flex-1">
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Enviar Feedback
          </Button>
          <Button variant="ghost" onClick={onSkip} disabled={isSubmitting}>
            Pular
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
