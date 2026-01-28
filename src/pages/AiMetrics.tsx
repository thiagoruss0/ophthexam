import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  MessageSquare,
  Star,
  Target,
  Download,
  ExternalLink,
  Brain,
  Lightbulb,
  ShieldCheck,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { LearningInsightsPanel } from "@/components/feedback/LearningInsightsPanel";
import { ValidationMetricsCard } from "@/components/feedback/ValidationMetricsCard";
import { exportTrainingData } from "@/services/feedbackAnalytics";

interface Stats {
  totalAnalyses: number;
  totalFeedbacks: number;
  avgRating: number;
  correctRate: number;
}

interface ReferenceCase {
  id: string;
  overall_rating: number;
  case_difficulty: string;
  pathology_tags: string[];
  created_at: string;
  exams: {
    id: string;
    exam_type: string;
    exam_date: string;
  };
}

const ACCURACY_COLORS = {
  correct: "hsl(142, 76%, 36%)",
  partially_correct: "hsl(48, 96%, 53%)",
  incorrect: "hsl(0, 84%, 60%)",
};

const EXAM_TYPE_LABELS: Record<string, string> = {
  oct_macular: "OCT Macular",
  oct_nerve: "OCT Nervo",
  retinography: "Retinografia",
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: "Fácil",
  moderate: "Moderado",
  difficult: "Difícil",
  rare: "Raro",
};

export default function AiMetricsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalAnalyses: 0,
    totalFeedbacks: 0,
    avgRating: 0,
    correctRate: 0,
  });
  const [accuracyData, setAccuracyData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [ratingTrend, setRatingTrend] = useState<{ week: string; rating: number }[]>([]);
  const [examTypePerformance, setExamTypePerformance] = useState<{ type: string; correct: number; partial: number; incorrect: number }[]>([]);
  const [referenceCases, setReferenceCases] = useState<ReferenceCase[]>([]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      // Total analyses
      const { count: totalAnalyses } = await supabase
        .from("ai_analysis")
        .select("*", { count: "exact", head: true });

      // All feedback data
      const { data: allFeedback } = await supabase
        .from("ai_feedback")
        .select("overall_rating, accuracy_rating, created_at");

      const totalFeedbacks = allFeedback?.length || 0;

      // Average rating
      const avgRating = totalFeedbacks > 0
        ? (allFeedback?.reduce((sum, f) => sum + (f.overall_rating || 0), 0) || 0) / totalFeedbacks
        : 0;

      // Correct rate
      const correctCount = allFeedback?.filter((f) => f.accuracy_rating === "correct").length || 0;
      const correctRate = totalFeedbacks > 0 ? (correctCount / totalFeedbacks) * 100 : 0;

      setStats({
        totalAnalyses: totalAnalyses || 0,
        totalFeedbacks,
        avgRating,
        correctRate,
      });

      // Accuracy distribution for pie chart
      const accuracyCounts = {
        correct: allFeedback?.filter((f) => f.accuracy_rating === "correct").length || 0,
        partially_correct: allFeedback?.filter((f) => f.accuracy_rating === "partially_correct").length || 0,
        incorrect: allFeedback?.filter((f) => f.accuracy_rating === "incorrect").length || 0,
      };

      setAccuracyData([
        { name: "Correto", value: accuracyCounts.correct, color: ACCURACY_COLORS.correct },
        { name: "Parcial", value: accuracyCounts.partially_correct, color: ACCURACY_COLORS.partially_correct },
        { name: "Incorreto", value: accuracyCounts.incorrect, color: ACCURACY_COLORS.incorrect },
      ].filter(d => d.value > 0));

      // Rating trend by week (last 12 weeks)
      const weeklyRatings: Record<string, number[]> = {};
      allFeedback?.forEach((f) => {
        const date = new Date(f.created_at);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
        const weekKey = weekStart.toISOString().split("T")[0];
        if (!weeklyRatings[weekKey]) weeklyRatings[weekKey] = [];
        if (f.overall_rating) weeklyRatings[weekKey].push(f.overall_rating);
      });

      const trendData = Object.entries(weeklyRatings)
        .map(([week, ratings]) => ({
          week: new Date(week).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
          rating: ratings.reduce((a, b) => a + b, 0) / ratings.length,
        }))
        .sort((a, b) => a.week.localeCompare(b.week))
        .slice(-12);

      setRatingTrend(trendData);

      // Performance by exam type
      const { data: feedbackWithExams } = await supabase
        .from("ai_feedback")
        .select(`
          accuracy_rating,
          exams!inner(exam_type)
        `);

      const typeStats: Record<string, { correct: number; partial: number; incorrect: number }> = {};
      feedbackWithExams?.forEach((f: any) => {
        const type = f.exams?.exam_type;
        if (!type) return;
        if (!typeStats[type]) typeStats[type] = { correct: 0, partial: 0, incorrect: 0 };
        if (f.accuracy_rating === "correct") typeStats[type].correct++;
        else if (f.accuracy_rating === "partially_correct") typeStats[type].partial++;
        else if (f.accuracy_rating === "incorrect") typeStats[type].incorrect++;
      });

      setExamTypePerformance(
        Object.entries(typeStats).map(([type, counts]) => ({
          type: EXAM_TYPE_LABELS[type] || type,
          ...counts,
        }))
      );

      // Reference cases
      const { data: cases } = await supabase
        .from("ai_feedback")
        .select(`
          id,
          overall_rating,
          case_difficulty,
          pathology_tags,
          created_at,
          exams (id, exam_type, exam_date)
        `)
        .eq("is_reference_case", true)
        .order("created_at", { ascending: false })
        .limit(20);

      setReferenceCases((cases as unknown as ReferenceCase[]) || []);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      toast({ title: "Erro ao carregar métricas", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportTrainingData = async () => {
    try {
      const data = await exportTrainingData(4);

      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `training_data_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: `${data.length} casos exportados com sucesso!` });
    } catch (error) {
      console.error("Error exporting:", error);
      toast({ title: "Erro ao exportar dados", variant: "destructive" });
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
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

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Métricas de Performance da IA
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe a qualidade das análises e exporte dados para treinamento
            </p>
          </div>
          <Button onClick={handleExportTrainingData}>
            <Download className="h-4 w-4 mr-2" />
            Exportar Dados para Treinamento
          </Button>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview" className="gap-2">
              <Activity className="h-4 w-4" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="learning" className="gap-2">
              <Lightbulb className="h-4 w-4" />
              Aprendizado
            </TabsTrigger>
            <TabsTrigger value="validation" className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              Validação
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-8 w-16" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total de Análises
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.totalAnalyses}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Feedbacks Coletados
                      </CardTitle>
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{stats.totalFeedbacks}</div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Rating Médio
                      </CardTitle>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <span className="text-3xl font-bold">{stats.avgRating.toFixed(1)}</span>
                        {renderStars(Math.round(stats.avgRating))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Taxa de Acerto
                      </CardTitle>
                      <Target className="h-4 w-4 text-success" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-success">
                        {stats.correctRate.toFixed(0)}%
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Accuracy Distribution Pie Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição de Precisão</CardTitle>
                  <CardDescription>Correto vs Parcial vs Incorreto</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px]" />
                  ) : accuracyData.length > 0 ? (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={accuracyData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {accuracyData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Sem dados de precisão ainda
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Rating Trend Line Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Evolução do Rating</CardTitle>
                  <CardDescription>Média semanal de avaliações</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[250px]" />
                  ) : ratingTrend.length > 0 ? (
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={ratingTrend}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                          <XAxis dataKey="week" className="text-xs" />
                          <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="rating"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--primary))" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Sem dados de tendência ainda
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance by Exam Type */}
            <Card>
              <CardHeader>
                <CardTitle>Performance por Tipo de Exame</CardTitle>
                <CardDescription>Distribuição de acertos por modalidade</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-[300px]" />
                ) : examTypePerformance.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={examTypePerformance}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="correct" name="Correto" fill={ACCURACY_COLORS.correct} />
                        <Bar dataKey="partial" name="Parcial" fill={ACCURACY_COLORS.partially_correct} />
                        <Bar dataKey="incorrect" name="Incorreto" fill={ACCURACY_COLORS.incorrect} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Sem dados de performance ainda
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Reference Cases Table */}
            <Card>
              <CardHeader>
                <CardTitle>Casos de Referência</CardTitle>
                <CardDescription>
                  Exames marcados como referência para treinamento da IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : referenceCases.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Dificuldade</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {referenceCases.map((refCase) => (
                        <TableRow key={refCase.id}>
                          <TableCell>
                            <Badge variant="outline">
                              {EXAM_TYPE_LABELS[refCase.exams?.exam_type] || refCase.exams?.exam_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {DIFFICULTY_LABELS[refCase.case_difficulty] || refCase.case_difficulty || "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {refCase.pathology_tags?.slice(0, 3).map((tag, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {refCase.pathology_tags && refCase.pathology_tags.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{refCase.pathology_tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{renderStars(refCase.overall_rating)}</TableCell>
                          <TableCell>
                            {new Date(refCase.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/exame/${refCase.exams?.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    Nenhum caso de referência marcado ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Learning Tab */}
          <TabsContent value="learning">
            <LearningInsightsPanel />
          </TabsContent>

          {/* Validation Tab */}
          <TabsContent value="validation">
            <ValidationMetricsCard />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
