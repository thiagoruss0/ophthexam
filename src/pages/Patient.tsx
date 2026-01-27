import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, User, Calendar, Phone, FileText, Eye } from "lucide-react";

interface Patient {
  id: string;
  name: string;
  birth_date?: string;
  gender?: string;
  record_number?: string;
  phone?: string;
  notes?: string;
}

interface Exam {
  id: string;
  exam_type: string;
  eye: string;
  exam_date: string;
  status: string;
}

const examTypeLabels: Record<string, string> = {
  oct_macular: "OCT Macular",
  oct_nerve: "OCT N.O.",
  retinography: "Retinografia",
};

export default function PatientPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id && profile?.id) {
      fetchPatientData();
    }
  }, [id, profile?.id]);

  const fetchPatientData = async () => {
    try {
      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: examsData, error: examsError } = await supabase
        .from("exams")
        .select("id, exam_type, eye, exam_date, status")
        .eq("patient_id", id)
        .order("exam_date", { ascending: false });

      if (examsError) throw examsError;
      setExams(examsData || []);
    } catch (error) {
      console.error("Error fetching patient:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-64 w-full" />
        </main>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Paciente não encontrado</h1>
          <Link to="/dashboard">
            <Button>Voltar ao Dashboard</Button>
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        <Button variant="ghost" asChild className="mb-4 -ml-2">
          <Link to="/historico">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Patient Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Dados do Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-2xl font-bold">{patient.name}</p>
                {patient.record_number && (
                  <p className="text-sm text-muted-foreground">
                    Prontuário: {patient.record_number}
                  </p>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {patient.birth_date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {new Date(patient.birth_date).toLocaleDateString("pt-BR")} (
                      {getAge(patient.birth_date)} anos)
                    </span>
                  </div>
                )}
                {patient.gender && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.gender === "M" ? "Masculino" : "Feminino"}</span>
                  </div>
                )}
                {patient.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                )}
              </div>

              {patient.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-1">Observações</p>
                  <p className="text-sm text-muted-foreground">{patient.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Exams Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Histórico de Exames ({exams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exams.length > 0 ? (
                <div className="space-y-4">
                  {exams.map((exam) => (
                    <Link
                      key={exam.id}
                      to={`/exame/${exam.id}`}
                      className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
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
                          <span className="text-sm text-muted-foreground">
                            {exam.eye === "od" ? "OD" : exam.eye === "oe" ? "OE" : "AO"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(exam.exam_date).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={exam.status === "approved" ? "default" : "secondary"}
                        className={exam.status === "approved" ? "bg-success" : ""}
                      >
                        {exam.status === "approved" ? "Aprovado" : "Pendente"}
                      </Badge>
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum exame registrado
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
