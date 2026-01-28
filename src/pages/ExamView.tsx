import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { AiFeedbackForm } from "@/components/exam/AiFeedbackForm";
import { AnalysisDisplay } from "@/components/exam/AnalysisDisplay";
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
  Copy,
  Star,
} from "lucide-react";

interface ExamData {
  id: string;
  exam_type: string;
  eye: string;
  exam_date: string;
  equipment?: string;
  clinical_indication?: string;
  status: string;
  created_at: string;
  updated_at: string;
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
  const [isSharing, setIsSharing] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [hasFeedback, setHasFeedback] = useState<boolean | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  // Timeout tracking for analysis
  const [analysisStartTime, setAnalysisStartTime] = useState<Date | null>(null);
  const [analysisTimeout, setAnalysisTimeout] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const fetchExamData = useCallback(async () => {
    if (!id) return;
    
    try {
      // Fetch exam data without analysis (we'll fetch it separately for ordering)
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
          created_at,
          updated_at,
          patients (id, name),
          exam_images (id, image_url, eye),
          reports (id, doctor_notes, final_diagnosis, approved_at)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Fetch the most recent analysis separately with proper ordering
      const { data: latestAnalysis } = await supabase
        .from("ai_analysis")
        .select(`
          id,
          quality_score,
          findings,
          biomarkers,
          measurements,
          diagnosis,
          recommendations,
          risk_classification,
          optic_nerve_analysis,
          retinography_analysis
        `)
        .eq("exam_id", id)
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const examData: ExamData = {
        id: data.id,
        exam_type: data.exam_type,
        eye: data.eye,
        exam_date: data.exam_date,
        equipment: data.equipment,
        clinical_indication: data.clinical_indication,
        status: data.status,
        created_at: data.created_at,
        updated_at: data.updated_at,
        patient: data.patients as any,
        images: data.exam_images as any[],
        analysis: latestAnalysis || undefined,
        report: (data.reports as any[])?.[0],
      };

      setExam(examData);
      setDoctorNotes(examData.report?.doctor_notes || "");

      // Check if feedback already exists
      if (profile?.id && examData.status === "approved") {
        const { data: feedbackData } = await supabase
          .from("ai_feedback")
          .select("id")
          .eq("exam_id", id)
          .eq("doctor_id", profile.id)
          .maybeSingle();
        
        setHasFeedback(!!feedbackData);
      }
    } catch (error) {
      console.error("Error fetching exam:", error);
      toast({
        title: "Erro ao carregar exame",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [id, toast, profile?.id]);

  useEffect(() => {
    if (id) {
      fetchExamData();
    }
  }, [id, fetchExamData]);

  // Auto-refresh when status is "analyzing"
  useEffect(() => {
    if (exam?.status !== "analyzing") return;

    const interval = setInterval(() => {
      fetchExamData();
    }, 5000);

    return () => clearInterval(interval);
  }, [exam?.status, fetchExamData]);

  // Timeout detection for analysis (2 minutes = 120 seconds)
  useEffect(() => {
    if (exam?.status !== "analyzing") {
      setAnalysisStartTime(null);
      setAnalysisTimeout(false);
      setElapsedSeconds(0);
      return;
    }

    // Set start time based on exam's updated_at
    if (!analysisStartTime) {
      setAnalysisStartTime(new Date(exam.updated_at || exam.created_at));
    }

    const checkTimeout = setInterval(async () => {
      const startTime = analysisStartTime || new Date(exam.updated_at || exam.created_at);
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsedSeconds(elapsed);

      if (elapsed >= 120 && !analysisTimeout) { // 2 minutes
        setAnalysisTimeout(true);
        
        // Revert status to pending
        await supabase
          .from("exams")
          .update({ status: "pending" })
          .eq("id", exam.id);
        
        toast({
          title: "Tempo limite excedido",
          description: "A análise não foi concluída em 2 minutos. Você pode tentar novamente.",
          variant: "destructive",
        });

        fetchExamData();
      }
    }, 1000);

    return () => clearInterval(checkTimeout);
  }, [exam?.status, exam?.id, exam?.updated_at, exam?.created_at, analysisStartTime, analysisTimeout, toast, fetchExamData]);

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

  const handleShare = async () => {
    if (!exam) return;
    
    setIsSharing(true);
    try {
      const { data, error } = await supabase.functions.invoke('share-report', {
        body: { exam_id: exam.id },
      });

      if (error) throw error;

      // Copy to clipboard
      await navigator.clipboard.writeText(data.share_url);

      const expiresAt = new Date(data.expires_at);
      toast({ 
        title: "Link copiado!", 
        description: `Válido até ${expiresAt.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
      });
    } catch (error) {
      console.error("Error sharing report:", error);
      toast({ 
        title: "Erro ao compartilhar", 
        description: "Tente novamente",
        variant: "destructive" 
      });
    } finally {
      setIsSharing(false);
    }
  };

  const handleReanalyze = async () => {
    if (!exam) return;

    const confirmed = window.confirm(
      "Deseja substituir a análise atual? Esta ação não pode ser desfeita."
    );
    if (!confirmed) return;

    setIsReanalyzing(true);
    try {
      // Delete ALL existing analyses for this exam (cleanup orphans)
      await supabase
        .from("ai_analysis")
        .delete()
        .eq("exam_id", exam.id);

      // Update exam status to analyzing
      await supabase
        .from("exams")
        .update({ status: "analyzing" })
        .eq("id", exam.id);

      // Call analyze-image function
      const { error } = await supabase.functions.invoke("analyze-image", {
        body: { exam_id: exam.id },
      });

      if (error) throw error;

      toast({ title: "Re-análise iniciada!" });

      // Reload after 3 seconds
      setTimeout(() => {
        fetchExamData();
      }, 3000);
    } catch (error) {
      console.error("Error reanalyzing:", error);
      toast({ 
        title: "Erro ao re-analisar", 
        description: "Tente novamente",
        variant: "destructive" 
      });
    } finally {
      setIsReanalyzing(false);
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
                {exam.status === "approved" ? "Aprovado" : exam.status === "analyzing" ? "Analisando" : "Pendente"}
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
        <div className="space-y-6">
          {/* Image Section - Full Width */}
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
              <div 
                className="relative bg-muted rounded-lg flex items-center justify-center"
                style={{ 
                  height: "calc(60vh - 100px)",
                  minHeight: "300px",
                  maxHeight: "500px",
                  overflow: zoom > 100 ? "auto" : "hidden"
                }}
              >
                {exam.images[selectedImageIndex] ? (
                  <img
                    src={exam.images[selectedImageIndex].image_url}
                    alt="Exam"
                    style={{ 
                      maxWidth: zoom === 100 ? "100%" : `${zoom}%`,
                      maxHeight: zoom === 100 ? "100%" : `${zoom}%`,
                      objectFit: "contain",
                      transition: "all 0.2s ease"
                    }}
                    className="rounded"
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

          {/* Analysis Section - Full Width Below Image */}
          <div className="space-y-4">
            {/* Analysis Status Cards */}
            {exam.status === "analyzing" && (
              <Card className={elapsedSeconds >= 60 ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800" : "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"}>
                <CardContent className="py-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <Loader2 className={`h-10 w-10 animate-spin ${elapsedSeconds >= 60 ? "text-yellow-600" : "text-blue-600"}`} />
                    <div>
                      <h3 className={`font-semibold ${elapsedSeconds >= 60 ? "text-yellow-900 dark:text-yellow-100" : "text-blue-900 dark:text-blue-100"}`}>
                        {elapsedSeconds >= 60 ? "Análise demorando mais que o normal..." : "Análise em andamento"}
                      </h3>
                      <p className={`text-sm mt-1 ${elapsedSeconds >= 60 ? "text-yellow-700 dark:text-yellow-300" : "text-blue-700 dark:text-blue-300"}`}>
                        {elapsedSeconds >= 60 
                          ? `Tempo decorrido: ${Math.floor(elapsedSeconds / 60)}:${String(elapsedSeconds % 60).padStart(2, '0')}. Aguarde ou tente novamente.`
                          : "A IA está processando a imagem. Isso pode levar até 30 segundos."
                        }
                      </p>
                    </div>
                    {elapsedSeconds >= 60 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReanalyze}
                        disabled={isReanalyzing}
                        className="mt-2"
                      >
                        {isReanalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Tentar Novamente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Timeout/Error Card */}
            {exam.status === "pending" && !exam.analysis && (
              <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                <CardContent className="py-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-amber-900 dark:text-amber-100">
                        Análise não realizada
                      </h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        A análise de IA não foi concluída. Clique no botão abaixo para iniciar a análise.
                      </p>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleReanalyze}
                        disabled={isReanalyzing}
                        className="mt-3"
                      >
                        {isReanalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Iniciar Análise
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Análise da IA</CardTitle>
                  {exam.status !== "approved" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReanalyze}
                      disabled={isReanalyzing || exam.status === "analyzing"}
                    >
                      {isReanalyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      {exam.analysis ? "Re-analisar" : "Analisar"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {exam.analysis ? (
                  <AnalysisDisplay 
                    examType={exam.exam_type}
                    analysis={exam.analysis}
                    eye={exam.eye}
                  />
                ) : exam.status === "analyzing" ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Aguardando conclusão da análise...</p>
                    <p className="text-xs mt-2">
                      Tempo: {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Nenhuma análise disponível</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Clique em "Analisar" para iniciar a análise de IA
                    </p>
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
                    <Button onClick={handleApprove} disabled={isApproving || !exam.analysis} className="flex-1">
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
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={handleShare}
                      disabled={isSharing}
                    >
                      {isSharing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          <Copy className="h-3 w-3 mr-1" />
                        </>
                      )}
                      Compartilhar
                    </Button>
                  </div>
                )}

                {/* Feedback Section */}
                {exam.status === "approved" && hasFeedback === false && !showFeedbackForm && (
                  <Card className="mt-4 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
                    <CardContent className="py-4">
                      <div className="flex items-start gap-3">
                        <Star className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                            Avalie a Análise da IA
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Seu feedback ajuda a melhorar as análises futuras
                          </p>
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              onClick={() => setShowFeedbackForm(true)}
                            >
                              Avaliar Análise
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHasFeedback(true)}
                            >
                              Pular
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {exam.status === "approved" && showFeedbackForm && profile && (
                  <AiFeedbackForm
                    examId={exam.id}
                    analysisId={exam.analysis?.id}
                    analysis={exam.analysis}
                    doctorId={profile.id}
                    onSubmit={() => {
                      setHasFeedback(true);
                      setShowFeedbackForm(false);
                    }}
                    onSkip={() => setShowFeedbackForm(false)}
                  />
                )}

                {exam.status === "approved" && hasFeedback === true && !showFeedbackForm && (
                  <div className="mt-4 flex items-center gap-2 text-success">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Feedback registrado</span>
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
