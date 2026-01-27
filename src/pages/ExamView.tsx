import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  generateExamPdf,
  downloadPdf,
  uploadPdfToStorage,
  generatePdfFilename,
  updateReportPdfUrl,
  fetchImageAsBase64,
} from "@/utils/generatePdf";
import type { ReportData } from "@/utils/generatePdf";
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Share2,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Eye,
  Calendar,
  User,
} from "lucide-react";

interface ExamData {
  id: string;
  exam_type: string;
  eye: string;
  exam_date: string;
  equipment?: string;
  clinical_indication?: string;
  status: string;
  patient: { id: string; name: string };
  images: { id: string; image_url: string; eye: string }[];
  analysis?: {
    id: string;
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    measurements?: any;
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
  report?: {
    id: string;
    doctor_notes?: string;
    final_diagnosis?: string;
    approved_at?: string;
  };
}

export default function ExamViewPage() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [exam, setExam] = useState<ExamData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoom, setZoom] = useState(100);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchExamData();
    }
  }, [id]);

  const fetchExamData = async () => {
    try {
      const { data, error } = await supabase
        .from("exams")
        .select(`
          id,
          exam_type,
          eye,
          exam_date,
          equipment,
          clinical_indication,
          status,
          patients (id, name),
          exam_images (id, image_url, eye),
          ai_analysis (
            id,
            quality_score,
            findings,
            biomarkers,
            measurements,
            diagnosis,
            recommendations,
            risk_classification
          ),
          reports (id, doctor_notes, final_diagnosis, approved_at)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      const examData: ExamData = {
        id: data.id,
        exam_type: data.exam_type,
        eye: data.eye,
        exam_date: data.exam_date,
        equipment: data.equipment,
        clinical_indication: data.clinical_indication,
        status: data.status,
        patient: data.patients as any,
        images: data.exam_images as any[],
        analysis: (data.ai_analysis as any[])?.[0],
        report: (data.reports as any[])?.[0],
      };

      setExam(examData);
      setDoctorNotes(examData.report?.doctor_notes || "");
    } catch (error) {
      console.error("Error fetching exam:", error);
      toast({
        title: "Erro ao carregar exame",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!exam) return;
    setIsSaving(true);

    try {
      if (exam.report?.id) {
        await supabase
          .from("reports")
          .update({ doctor_notes: doctorNotes })
          .eq("id", exam.report.id);
      } else {
        await supabase.from("reports").insert({
          exam_id: exam.id,
          ai_analysis_id: exam.analysis?.id,
          doctor_notes: doctorNotes,
        });
      }

      toast({ title: "Rascunho salvo!" });
      fetchExamData();
    } catch (error) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!exam || !profile) return;
    setIsApproving(true);

    try {
      // Update or create report
      if (exam.report?.id) {
        await supabase
          .from("reports")
          .update({
            doctor_notes: doctorNotes,
            approved_at: new Date().toISOString(),
            approved_by: profile.id,
          })
          .eq("id", exam.report.id);
      } else {
        await supabase.from("reports").insert({
          exam_id: exam.id,
          ai_analysis_id: exam.analysis?.id,
          doctor_notes: doctorNotes,
          approved_at: new Date().toISOString(),
          approved_by: profile.id,
        });
      }

      // Update exam status
      await supabase.from("exams").update({ status: "approved" }).eq("id", exam.id);

      toast({ title: "Laudo aprovado com sucesso!" });
      fetchExamData();
    } catch (error) {
      toast({ title: "Erro ao aprovar", variant: "destructive" });
    } finally {
      setIsApproving(false);
    }
  };

  const handleExportPdf = async () => {
    if (!exam || !profile) return;
    
    setIsExporting(true);
    try {
      // Fetch patient data
      const { data: patientData } = await supabase
        .from("patients")
        .select("name, birth_date, record_number, gender")
        .eq("id", exam.patient.id)
        .single();

      // Get image as base64 for PDF
      let imageBase64: string | null = null;
      if (exam.images[0]?.image_url) {
        imageBase64 = await fetchImageAsBase64(exam.images[0].image_url);
      }

      // Prepare report data
      const reportData: ReportData = {
        exam: {
          id: exam.id,
          exam_type: exam.exam_type,
          eye: exam.eye,
          exam_date: exam.exam_date,
          equipment: exam.equipment,
          clinical_indication: exam.clinical_indication,
          status: exam.status,
        },
        patient: {
          name: patientData?.name || exam.patient.name,
          birth_date: patientData?.birth_date || undefined,
          record_number: patientData?.record_number || undefined,
          gender: patientData?.gender || undefined,
        },
        analysis: exam.analysis,
        doctorNotes,
        profile: {
          full_name: profile.full_name,
          crm: profile.crm,
          crm_uf: profile.crm_uf,
          clinic_name: profile.clinic_name || undefined,
          clinic_address: profile.clinic_address || undefined,
          clinic_phone: profile.clinic_phone || undefined,
          clinic_cnpj: profile.clinic_cnpj || undefined,
          clinic_logo_url: profile.clinic_logo_url || undefined,
          signature_url: profile.signature_url || undefined,
          include_logo_in_pdf: profile.include_logo_in_pdf ?? true,
          include_signature_in_pdf: profile.include_signature_in_pdf ?? true,
        },
        imageUrl: imageBase64 || exam.images[0]?.image_url,
        approvedAt: exam.report?.approved_at || undefined,
      };

      // Generate PDF
      const blob = await generateExamPdf(reportData);

      // Upload to storage
      const { url } = await uploadPdfToStorage(blob, exam.id);
      if (url) {
        await updateReportPdfUrl(exam.id, url);
      }

      // Download locally
      const filename = generatePdfFilename(
        patientData?.name || exam.patient.name,
        exam.exam_type,
        exam.exam_date
      );
      downloadPdf(blob, filename);

      toast({ title: "PDF gerado com sucesso!" });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({ 
        title: "Erro ao gerar PDF", 
        description: "Tente novamente",
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <div className="grid gap-6 lg:grid-cols-5">
            <Skeleton className="h-[500px] lg:col-span-3" />
            <Skeleton className="h-[500px] lg:col-span-2" />
          </div>
        </main>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardHeader />
        <main className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Exame não encontrado</h1>
          <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="mb-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{examTypeLabels[exam.exam_type]}</h1>
              <Badge
                variant={exam.status === "approved" ? "default" : "secondary"}
                className={exam.status === "approved" ? "bg-success" : ""}
              >
                {exam.status === "approved" ? "Aprovado" : "Pendente"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {exam.patient.name}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {getEyeLabel(exam.eye)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(exam.exam_date).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="disclaimer mb-6 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="text-sm">
            <strong>LAUDO PRELIMINAR GERADO POR INTELIGÊNCIA ARTIFICIAL</strong> — 
            Este documento é um auxílio diagnóstico e requer obrigatoriamente a validação 
            e assinatura de médico oftalmologista habilitado.
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Image Section */}
          <div className="lg:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Imagem do Exame</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setZoom((z) => Math.max(50, z - 25))}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-sm w-12 text-center">{zoom}%</span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setZoom((z) => Math.min(200, z + 25))}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative overflow-auto bg-muted rounded-lg" style={{ maxHeight: "500px" }}>
                  {exam.images[selectedImageIndex] ? (
                    <img
                      src={exam.images[selectedImageIndex].image_url}
                      alt="Exam"
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
                      className="transition-transform"
                    />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      Imagem não disponível
                    </div>
                  )}
                </div>

                {/* Thumbnails */}
                {exam.images.length > 1 && (
                  <div className="flex gap-2 mt-4">
                    {exam.images.map((img, idx) => (
                      <button
                        key={img.id}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`h-16 w-16 rounded border-2 overflow-hidden ${
                          selectedImageIndex === idx ? "border-primary" : "border-transparent"
                        }`}
                      >
                        <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Analysis Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Análise da IA</CardTitle>
              </CardHeader>
              <CardContent>
                {exam.analysis ? (
                  <Accordion type="multiple" defaultValue={["findings", "biomarkers"]}>
                    {/* Quality */}
                    {exam.analysis.quality_score && (
                      <AccordionItem value="quality">
                        <AccordionTrigger>Qualidade da Imagem</AccordionTrigger>
                        <AccordionContent>
                          <Badge
                            variant="outline"
                            className={
                              exam.analysis.quality_score === "Boa"
                                ? "status-normal"
                                : exam.analysis.quality_score === "Moderada"
                                ? "status-borderline"
                                : "status-abnormal"
                            }
                          >
                            {exam.analysis.quality_score}
                          </Badge>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Findings */}
                    {exam.analysis.findings && (
                      <AccordionItem value="findings">
                        <AccordionTrigger>Achados</AccordionTrigger>
                        <AccordionContent>
                          <div className="prose prose-sm max-w-none">
                            {typeof exam.analysis.findings === "string" ? (
                              <p>{exam.analysis.findings}</p>
                            ) : (
                              <pre className="text-xs bg-muted p-2 rounded overflow-auto">
                                {JSON.stringify(exam.analysis.findings, null, 2)}
                              </pre>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Biomarkers */}
                    {exam.analysis.biomarkers && (
                      <AccordionItem value="biomarkers">
                        <AccordionTrigger>Biomarcadores</AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-wrap gap-2">
                            {Array.isArray(exam.analysis.biomarkers) ? (
                              exam.analysis.biomarkers.map((b: string, i: number) => (
                                <Badge key={i} variant="outline">
                                  {b}
                                </Badge>
                              ))
                            ) : (
                              <pre className="text-xs bg-muted p-2 rounded overflow-auto w-full">
                                {JSON.stringify(exam.analysis.biomarkers, null, 2)}
                              </pre>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Diagnosis */}
                    {exam.analysis.diagnosis && exam.analysis.diagnosis.length > 0 && (
                      <AccordionItem value="diagnosis">
                        <AccordionTrigger>Impressão Diagnóstica</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside space-y-1">
                            {exam.analysis.diagnosis.map((d: string, i: number) => (
                              <li key={i}>{d}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}

                    {/* Recommendations */}
                    {exam.analysis.recommendations && exam.analysis.recommendations.length > 0 && (
                      <AccordionItem value="recommendations">
                        <AccordionTrigger>Recomendações</AccordionTrigger>
                        <AccordionContent>
                          <ul className="list-disc list-inside space-y-1">
                            {exam.analysis.recommendations.map((r: string, i: number) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    )}
                  </Accordion>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Análise em processamento...</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={fetchExamData}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Atualizar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Doctor Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações do Médico</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Adicione suas observações aqui..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  rows={4}
                  disabled={exam.status === "approved"}
                />

                {exam.status !== "approved" && (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleSaveDraft} disabled={isSaving}>
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Rascunho"}
                    </Button>
                    <Button onClick={handleApprove} disabled={isApproving} className="flex-1">
                      {isApproving ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="h-4 w-4 mr-2" />
                      )}
                      Aprovar Laudo
                    </Button>
                  </div>
                )}

                {exam.status === "approved" && (
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleExportPdf}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4 mr-2" />
                      )}
                      Exportar PDF
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Share2 className="h-4 w-4 mr-2" />
                      Compartilhar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
