import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  TrendingUp, 
  TrendingDown, 
  Lightbulb, 
  AlertTriangle, 
  Tag,
  Brain,
  BarChart3
} from "lucide-react";
import {
  generateLearningInsights,
  generateImprovementSuggestions,
  type LearningInsights,
} from "@/services/feedbackAnalytics";

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  moderate: "Moderado",
  difficult: "Difícil",
  rare: "Raro",
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: "bg-green-500",
  moderate: "bg-yellow-500",
  difficult: "bg-orange-500",
  rare: "bg-purple-500",
};

export function LearningInsightsPanel() {
  const [insights, setInsights] = useState<LearningInsights | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [insightsData, suggestionsData] = await Promise.all([
        generateLearningInsights(),
        generateImprovementSuggestions(),
      ]);
      setInsights(insightsData);
      setSuggestions(suggestionsData);
    } catch (err) {
      console.error("Error loading insights:", err);
      setError("Erro ao carregar insights de aprendizado");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!insights) return null;

  const totalDifficulty = Object.values(insights.avgDifficultyRating).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Improvement Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Sugestões de Melhoria
            </CardTitle>
            <CardDescription>
              Baseado em padrões identificados nos feedbacks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-yellow-500 mt-1">•</span>
                  <span className="text-muted-foreground">{suggestion}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Diagnosis Accuracy Issues */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Diagnoses Removed (False Positives) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Diagnósticos Removidos
            </CardTitle>
            <CardDescription className="text-xs">
              Falsos positivos frequentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.mostMissedDiagnoses.length > 0 ? (
              <div className="space-y-2">
                {insights.mostMissedDiagnoses.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1">{item.diagnosis}</span>
                    <Badge variant="outline" className="ml-2 bg-red-500/10 text-red-600">
                      {item.missCount}x
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum dado ainda</p>
            )}
          </CardContent>
        </Card>

        {/* Diagnoses Added (False Negatives) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-yellow-500" />
              Diagnósticos Adicionados
            </CardTitle>
            <CardDescription className="text-xs">
              Falsos negativos frequentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {insights.mostAddedDiagnoses.length > 0 ? (
              <div className="space-y-2">
                {insights.mostAddedDiagnoses.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm truncate flex-1">{item.diagnosis}</span>
                    <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-600">
                      {item.addCount}x
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum dado ainda</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Difficulty Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Distribuição de Dificuldade
          </CardTitle>
          <CardDescription className="text-xs">
            Categorização dos casos pelos médicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalDifficulty > 0 ? (
            <div className="space-y-3">
              {Object.entries(insights.avgDifficultyRating).map(([difficulty, count]) => {
                const percentage = (count / totalDifficulty) * 100;
                return (
                  <div key={difficulty} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{DIFFICULTY_LABELS[difficulty] || difficulty}</span>
                      <span className="text-muted-foreground">{count} casos ({percentage.toFixed(0)}%)</span>
                    </div>
                    <Progress 
                      value={percentage} 
                      className="h-2"
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum dado de dificuldade ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Top Pathology Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags de Patologias Mais Comuns
          </CardTitle>
          <CardDescription className="text-xs">
            Classificações frequentes pelos médicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.topPathologyTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {insights.topPathologyTags.map((item, i) => (
                <Badge 
                  key={i} 
                  variant="secondary" 
                  className="gap-1"
                >
                  {item.tag}
                  <span className="text-xs text-muted-foreground">({item.count})</span>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma tag registrada ainda</p>
          )}
        </CardContent>
      </Card>

      {/* Quality Disagreement Rate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Concordância de Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Progress 
                value={100 - insights.qualityDisagreementRate} 
                className="h-3"
              />
            </div>
            <span className="text-sm font-medium">
              {(100 - insights.qualityDisagreementRate).toFixed(1)}% concordam
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Taxa de discordância: {insights.qualityDisagreementRate.toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
