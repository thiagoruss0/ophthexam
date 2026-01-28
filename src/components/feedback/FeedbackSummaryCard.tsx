import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, AlertCircle, XCircle, BookOpen, Tag } from "lucide-react";
import type { AiFeedbackData } from "@/hooks/useAiFeedback";

interface FeedbackSummaryCardProps {
  feedback: AiFeedbackData;
  showDetails?: boolean;
}

const accuracyLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  correct: { 
    label: "Correta", 
    color: "bg-green-500/10 text-green-600 border-green-500/20", 
    icon: <CheckCircle className="h-4 w-4" /> 
  },
  partially_correct: { 
    label: "Parcialmente Correta", 
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20", 
    icon: <AlertCircle className="h-4 w-4" /> 
  },
  incorrect: { 
    label: "Incorreta", 
    color: "bg-red-500/10 text-red-600 border-red-500/20", 
    icon: <XCircle className="h-4 w-4" /> 
  },
};

const difficultyLabels: Record<string, string> = {
  easy: "Fácil",
  moderate: "Moderado",
  difficult: "Difícil",
  rare: "Raro",
};

export function FeedbackSummaryCard({ feedback, showDetails = false }: FeedbackSummaryCardProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  const accuracy = feedback.accuracy_rating 
    ? accuracyLabels[feedback.accuracy_rating] 
    : null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Feedback Registrado</CardTitle>
          {feedback.is_reference_case && (
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="h-3 w-3" />
              Caso de Referência
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Enviado em {new Date(feedback.created_at!).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating and Accuracy Row */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Avaliação Geral</p>
            <div className="flex items-center gap-2">
              {feedback.overall_rating && renderStars(feedback.overall_rating)}
              <span className="text-sm font-medium">{feedback.overall_rating}/5</span>
            </div>
          </div>
          
          {accuracy && (
            <Badge variant="outline" className={`gap-1 ${accuracy.color}`}>
              {accuracy.icon}
              {accuracy.label}
            </Badge>
          )}
        </div>

        {/* Difficulty */}
        {feedback.case_difficulty && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Dificuldade</p>
            <Badge variant="outline">
              {difficultyLabels[feedback.case_difficulty] || feedback.case_difficulty}
            </Badge>
          </div>
        )}

        {/* Diagnosis Changes */}
        {showDetails && (
          <>
            {(feedback.diagnosis_correct?.length || 0) > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Diagnósticos Confirmados
                </p>
                <div className="flex flex-wrap gap-1">
                  {feedback.diagnosis_correct?.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-green-500/10">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(feedback.diagnosis_removed?.length || 0) > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <XCircle className="h-3 w-3 text-red-500" />
                  Diagnósticos Removidos
                </p>
                <div className="flex flex-wrap gap-1">
                  {feedback.diagnosis_removed?.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-red-500/10">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(feedback.diagnosis_added?.length || 0) > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-yellow-500" />
                  Diagnósticos Adicionados
                </p>
                <div className="flex flex-wrap gap-1">
                  {feedback.diagnosis_added?.map((d, i) => (
                    <Badge key={i} variant="secondary" className="text-xs bg-yellow-500/10">
                      {d}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Pathology Tags */}
        {(feedback.pathology_tags?.length || 0) > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Tags
            </p>
            <div className="flex flex-wrap gap-1">
              {feedback.pathology_tags?.map((tag, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        {showDetails && feedback.general_comments && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Comentários</p>
            <p className="text-sm text-muted-foreground bg-muted/50 p-2 rounded">
              {feedback.general_comments}
            </p>
          </div>
        )}

        {/* Teaching Notes */}
        {showDetails && feedback.teaching_notes && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              Notas de Ensino
            </p>
            <p className="text-sm italic text-muted-foreground bg-blue-500/5 p-2 rounded border border-blue-500/10">
              {feedback.teaching_notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
