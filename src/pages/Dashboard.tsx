import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  FileText,
  Clock,
  CheckCircle,
  Activity,
  Eye as EyeIcon,
  Calendar,
  User,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface ExamStats {
  total: number;
  pending: number;
  approved: number;
  byType: { name: string; value: number; color: string }[];
}

interface RecentExam {
  id: string;
  patient_name: string;
  exam_type: string;
  eye: string;
  exam_date: string;
  status: string;
  image_url?: string;
}

const examTypeLabels: Record<string, string> = {
  oct_macular: "OCT Macular",
  oct_nerve: "OCT Nervo Óptico",
  retinography: "Retinografia",
};

const examTypeColors: Record<string, string> = {
  oct_macular: "hsl(210, 100%, 40%)",
  oct_nerve: "hsl(162, 73%, 33%)",
  retinography: "hsl(32, 95%, 44%)",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  analyzing: { label: "Analisando", variant: "secondary" },
  analyzed: { label: "Analisado", variant: "outline" },
  approved: { label: "Aprovado", variant: "default" },
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [recentExams, setRecentExams] = useState<RecentExam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile?.id) {
      fetchDashboardData();
    }
  }, [profile?.id]);

  const fetchDashboardData = async () => {
    try {
      // Fetch exams for the current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: exams, error } = await supabase
        .from("exams")
        .select(`
          id,
          exam_type,
          eye,
          exam_date,
          status,
          patients (name),
          exam_images (image_url)
        `)
        .eq("doctor_id", profile?.id)
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate stats
      const total = exams?.length || 0;
      const pending = exams?.filter((e) => e.status !== "approved").length || 0;
      const approved = exams?.filter((e) => e.status === "approved").length || 0;

      const typeCount: Record<string, number> = {};
      exams?.forEach((e) => {
        typeCount[e.exam_type] = (typeCount[e.exam_type] || 0) + 1;
      });

      const byType = Object.entries(typeCount).map(([type, count]) => ({
        name: examTypeLabels[type] || type,
        value: count,
        color: examTypeColors[type] || "#888",
      }));

      setStats({ total, pending, approved, byType });

      // Format recent exams
      const recent = exams?.slice(0, 10).map((exam) => ({
        id: exam.id,
        patient_name: (exam.patients as any)?.name || "Paciente",
        exam_type: exam.exam_type,
        eye: exam.eye,
        exam_date: exam.exam_date,
        status: exam.status,
        image_url: (exam.exam_images as any)?.[0]?.image_url,
      })) || [];

      setRecentExams(recent);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getEyeLabel = (eye: string) => {
    switch (eye) {
      case "od": return "OD";
      case "oe": return "OE";
      case "both": return "AO";
      default: return eye;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Olá, Dr. {profile?.full_name?.split(" ")[0]}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Aqui está um resumo dos seus exames este mês.
            </p>
          </div>
          <Link to="/nova-analise">
            <Button size="lg" className="gap-2">
              <Plus className="h-5 w-5" />
              Nova Análise
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
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
                    Total do Mês
                  </CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground">exames realizados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Pendentes
                  </CardTitle>
                  <Clock className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-warning">{stats?.pending || 0}</div>
                  <p className="text-xs text-muted-foreground">aguardando revisão</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Finalizados
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-success">{stats?.approved || 0}</div>
                  <p className="text-xs text-muted-foreground">laudos aprovados</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Por Tipo
                  </CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {stats?.byType && stats.byType.length > 0 ? (
                    <div className="h-[60px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={stats.byType}
                            cx="50%"
                            cy="50%"
                            innerRadius={15}
                            outerRadius={28}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {stats.byType.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Sem dados</p>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Exams */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Exames Recentes</CardTitle>
                <CardDescription>Últimos 10 exames realizados</CardDescription>
              </div>
              <Link to="/historico">
                <Button variant="outline" size="sm">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentExams.length > 0 ? (
              <div className="space-y-4">
                {recentExams.map((exam) => (
                  <Link
                    key={exam.id}
                    to={`/exame/${exam.id}`}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Thumbnail */}
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      {exam.image_url ? (
                        <img
                          src={exam.image_url}
                          alt="Exam thumbnail"
                          className="h-full w-full object-cover rounded"
                        />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium truncate">{exam.patient_name}</span>
                        <Badge
                          variant="outline"
                          className={
                            exam.exam_type === "oct_macular"
                              ? "exam-oct-macular"
                              : exam.exam_type === "oct_nerve"
                              ? "exam-oct-nerve"
                              : "exam-retinography"
                          }
                        >
                          {examTypeLabels[exam.exam_type]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <EyeIcon className="h-3 w-3" />
                          {getEyeLabel(exam.eye)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(exam.exam_date)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <Badge variant={statusLabels[exam.status]?.variant || "secondary"}>
                      {statusLabels[exam.status]?.label || exam.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <EyeIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-lg mb-2">Nenhum exame ainda</h3>
                <p className="text-muted-foreground mb-4">
                  Comece criando sua primeira análise
                </p>
                <Link to="/nova-analise">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Análise
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Floating Action Button (Mobile) */}
      <Link
        to="/nova-analise"
        className="fixed bottom-6 right-6 md:hidden z-50"
      >
        <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
          <Plus className="h-6 w-6" />
        </Button>
      </Link>
    </div>
  );
}
