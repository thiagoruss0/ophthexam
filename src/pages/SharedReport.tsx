import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { 
  AlertTriangle, 
  Calendar, 
  Eye, 
  Printer, 
  User, 
  Clock,
  FileX,
  Building,
} from "lucide-react";

interface SharedReportData {
  patient: {
    name: string;
    birth_date?: string;
    record_number?: string;
  };
  exam: {
    exam_type: string;
    eye: string;
    exam_date: string;
    equipment?: string;
    clinical_indication?: string;
  };
  analysis?: {
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    diagnosis?: string[];
    recommendations?: string[];
  };
  doctor: {
    full_name: string;
    crm: string;
    crm_uf: string;
    signature_url?: string;
    clinic_name?: string;
  };
  report: {
    doctor_notes?: string;
    approved_at?: string;
  };
  imageUrl?: string;
}

type LoadingState = "loading" | "success" | "expired" | "not_found" | "error";

export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedReportData | null>(null);
  const [status, setStatus] = useState<LoadingState>("loading");

  useEffect(() => {
    if (token) {
      fetchSharedReport();
    }
  }, [token]);

  const fetchSharedReport = async () => {
    try {
      // First fetch the report by share_token
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select(`
          id,
          doctor_notes,
          approved_at,
          share_expires_at,
          exam_id,
          approved_by
        `)
        .eq("share_token", token)
        .maybeSingle();

      if (reportError) throw reportError;

      if (!reportData) {
        setStatus("not_found");
        return;
      }

      // Check expiration
      if (reportData.share_expires_at) {
        const expiresAt = new Date(reportData.share_expires_at);
        if (expiresAt < new Date()) {
          setStatus("expired");
          return;
        }
      }

      // Fetch exam details
      const { data: examData, error: examError } = await supabase
        .from("exams")
        .select(`
          exam_type,
          eye,
          exam_date,
          equipment,
          clinical_indication,
          patients (name, birth_date, record_number),
          exam_images (image_url),
          ai_analysis (
            quality_score,
            findings,
            biomarkers,
            diagnosis,
            recommendations
          )
        `)
        .eq("id", reportData.exam_id)
        .single();

      if (examError) throw examError;

      // Fetch doctor profile
      let doctorData = null;
      if (reportData.approved_by) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, crm, crm_uf, signature_url, clinic_name")
          .eq("id", reportData.approved_by)
          .single();
        doctorData = profile;
      }

      const sharedData: SharedReportData = {
        patient: {
          name: (examData.patients as any)?.name || "Paciente",
          birth_date: (examData.patients as any)?.birth_date,
          record_number: (examData.patients as any)?.record_number,
        },
        exam: {
          exam_type: examData.exam_type,
          eye: examData.eye,
          exam_date: examData.exam_date,
          equipment: examData.equipment || undefined,
          clinical_indication: examData.clinical_indication || undefined,
        },
        analysis: (examData.ai_analysis as any[])?.[0] || undefined,
        doctor: {
          full_name: doctorData?.full_name || "Médico",
          crm: doctorData?.crm || "",
          crm_uf: doctorData?.crm_uf || "",
          signature_url: doctorData?.signature_url || undefined,
          clinic_name: doctorData?.clinic_name || undefined,
        },
        report: {
          doctor_notes: reportData.doctor_notes || undefined,
          approved_at: reportData.approved_at || undefined,
        },
        imageUrl: (examData.exam_images as any[])?.[0]?.image_url,
      };

      setData(sharedData);
      setStatus("success");
    } catch (error) {
      console.error("Error fetching shared report:", error);
      setStatus("error");
    }
  };

  const examTypeLabels: Record<string, string> = {
    oct_macular: "OCT Macular",
    oct_nerve: "OCT Nervo Óptico",
    retinography: "Retinografia",
  };

  const getEyeLabel = (eye: string) => {
    switch (eye) {
      case "od": return "OD (Olho Direito)";
      case "oe": return "OE (Olho Esquerdo)";
      case "both": return "Ambos os Olhos";
      default: return eye;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Loading state
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[400px] w-full" />
          <Skeleton className="h-[200px] w-full" />
        </div>
      </div>
    );
  }

  // Error states
  if (status === "not_found" || status === "expired" || status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <FileX className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">
              {status === "expired" ? "Link Expirado" : "Laudo Não Encontrado"}
            </h2>
            <p className="text-muted-foreground">
              {status === "expired" 
                ? "Este link de compartilhamento expirou. Solicite um novo link ao médico responsável."
                : "O laudo solicitado não foi encontrado ou o link é inválido."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 print:bg-white print:text-foreground print:border-b">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Laudo Oftalmológico</h1>
            {data.doctor.clinic_name && (
              <p className="text-primary-foreground/80 flex items-center gap-1 mt-1 print:text-muted-foreground">
                <Building className="h-4 w-4" />
                {data.doctor.clinic_name}
              </p>
            )}
          </div>
          <Button 
            variant="secondary" 
            onClick={handlePrint}
            className="print:hidden"
          >
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Disclaimer */}
        <Card className="bg-amber-50 border-amber-200 print:border-amber-400">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                <strong>LAUDO GERADO COM AUXÍLIO DE INTELIGÊNCIA ARTIFICIAL</strong> — 
                Este documento é uma ferramenta de auxílio diagnóstico e foi validado por médico oftalmologista habilitado.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Patient & Exam Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informações do Exame</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{data.patient.name}</span>
                </div>
                {data.patient.birth_date && (
                  <div className="text-sm text-muted-foreground">
                    Data de Nascimento: {new Date(data.patient.birth_date).toLocaleDateString("pt-BR")}
                  </div>
                )}
                {data.patient.record_number && (
                  <div className="text-sm text-muted-foreground">
                    Prontuário: {data.patient.record_number}
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <Badge variant="outline" className="text-base px-3 py-1">
                  {examTypeLabels[data.exam.exam_type] || data.exam.exam_type}
                </Badge>
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  {getEyeLabel(data.exam.eye)}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(data.exam.exam_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
            </div>
            {data.exam.clinical_indication && (
              <div className="mt-4">
                <span className="font-medium text-sm">Indicação Clínica:</span>
                <p className="text-sm text-muted-foreground mt-1">{data.exam.clinical_indication}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Exam Image */}
        {data.imageUrl && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Imagem do Exame</CardTitle>
            </CardHeader>
            <CardContent>
              <img 
                src={data.imageUrl} 
                alt="Exame oftalmológico" 
                className="rounded-lg max-h-[400px] mx-auto print:max-h-[300px]"
              />
            </CardContent>
          </Card>
        )}

        {/* Analysis */}
        {data.analysis && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Análise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Findings */}
              {data.analysis.findings && (
                <div>
                  <h4 className="font-medium mb-2">Achados</h4>
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                    {typeof data.analysis.findings === "string" 
                      ? data.analysis.findings 
                      : JSON.stringify(data.analysis.findings, null, 2)}
                  </div>
                </div>
              )}

              {/* Biomarkers */}
              {data.analysis.biomarkers && (
                <div>
                  <h4 className="font-medium mb-2">Biomarcadores</h4>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(data.analysis.biomarkers) ? (
                      data.analysis.biomarkers.map((b: string, i: number) => (
                        <Badge key={i} variant="outline">{b}</Badge>
                      ))
                    ) : (
                      <div className="text-sm text-muted-foreground bg-muted p-3 rounded w-full">
                        {JSON.stringify(data.analysis.biomarkers, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {data.analysis.diagnosis && data.analysis.diagnosis.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Impressão Diagnóstica</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {data.analysis.diagnosis.map((d: string, i: number) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {data.analysis.recommendations && data.analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Recomendações</h4>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    {data.analysis.recommendations.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Doctor Notes */}
        {data.report.doctor_notes && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Observações do Médico</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{data.report.doctor_notes}</p>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Doctor Signature */}
        <Card>
          <CardContent className="py-6">
            <div className="text-center space-y-4">
              {data.doctor.signature_url && (
                <img 
                  src={data.doctor.signature_url} 
                  alt="Assinatura" 
                  className="h-16 mx-auto"
                />
              )}
              <div>
                <p className="font-medium">{data.doctor.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  CRM {data.doctor.crm}/{data.doctor.crm_uf}
                </p>
              </div>
              {data.report.approved_at && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Aprovado em {new Date(data.report.approved_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground pt-4 print:pt-8">
          <p>Este documento é válido como laudo médico após validação pelo profissional responsável.</p>
          <p>Gerado eletronicamente pelo sistema OphthExam.</p>
        </div>
      </main>
    </div>
  );
}
