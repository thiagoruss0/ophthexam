import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, Eye, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface Exam {
  id: string;
  exam_type: string;
  eye: string;
  exam_date: string;
  status: string;
  patient_name: string;
  patient_id: string;
}

const examTypeLabels: Record<string, string> = {
  oct_macular: "OCT Macular",
  oct_nerve: "OCT N.O.",
  retinography: "Retinografia",
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  analyzing: { label: "Analisando", variant: "secondary" },
  analyzed: { label: "Analisado", variant: "outline" },
  approved: { label: "Aprovado", variant: "default" },
};

export default function HistoryPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 20;

  useEffect(() => {
    if (profile?.id) {
      fetchExams();
    }
  }, [profile?.id, search, typeFilter, statusFilter, dateFrom, dateTo, page]);

  const fetchExams = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("exams")
        .select(`
          id,
          exam_type,
          eye,
          exam_date,
          status,
          patients (id, name)
        `, { count: "exact" })
        .eq("doctor_id", profile?.id)
        .order("exam_date", { ascending: false })
        .range((page - 1) * perPage, page * perPage - 1);

      if (typeFilter && (typeFilter === "oct_macular" || typeFilter === "oct_nerve" || typeFilter === "retinography")) {
        query = query.eq("exam_type", typeFilter);
      }

      if (statusFilter && (statusFilter === "pending" || statusFilter === "analyzing" || statusFilter === "analyzed" || statusFilter === "approved")) {
        query = query.eq("status", statusFilter);
      }

      if (dateFrom) {
        query = query.gte("exam_date", dateFrom);
      }

      if (dateTo) {
        query = query.lte("exam_date", dateTo);
      }

      const { data, count, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Client-side search for patient name
      if (search) {
        filteredData = filteredData.filter((exam) =>
          (exam.patients as any)?.name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setExams(
        filteredData.map((exam) => ({
          id: exam.id,
          exam_type: exam.exam_type,
          eye: exam.eye,
          exam_date: exam.exam_date,
          status: exam.status,
          patient_name: (exam.patients as any)?.name || "—",
          patient_id: (exam.patients as any)?.id,
        }))
      );

      setTotalPages(Math.ceil((count || 0) / perPage));
    } catch (error) {
      console.error("Error fetching exams:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    if (!profile?.id) return;
    
    setIsExporting(true);
    try {
      // Fetch ALL exams without pagination, applying the same filters
      let query = supabase
        .from("exams")
        .select(`
          id,
          exam_type,
          eye,
          exam_date,
          status,
          patients (id, name)
        `)
        .eq("doctor_id", profile.id)
        .order("exam_date", { ascending: false });

      if (typeFilter && (typeFilter === "oct_macular" || typeFilter === "oct_nerve" || typeFilter === "retinography")) {
        query = query.eq("exam_type", typeFilter);
      }

      if (statusFilter && (statusFilter === "pending" || statusFilter === "analyzing" || statusFilter === "analyzed" || statusFilter === "approved")) {
        query = query.eq("status", statusFilter);
      }

      if (dateFrom) {
        query = query.gte("exam_date", dateFrom);
      }

      if (dateTo) {
        query = query.lte("exam_date", dateTo);
      }

      const { data, error } = await query;

      if (error) throw error;

      let filteredData = data || [];

      // Apply client-side search filter
      if (search) {
        filteredData = filteredData.filter((exam) =>
          (exam.patients as any)?.name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Build CSV content
      const header = ["Paciente", "Tipo de Exame", "Olho", "Data", "Status"];
      const rows = filteredData.map((exam) => [
        (exam.patients as any)?.name || "—",
        examTypeLabels[exam.exam_type] || exam.exam_type,
        getEyeLabel(exam.eye),
        new Date(exam.exam_date).toLocaleDateString("pt-BR"),
        statusLabels[exam.status]?.label || exam.status,
      ]);

      // Use semicolon as separator for Brazilian Excel compatibility
      const csvContent = [header, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(";"))
        .join("\n");

      // Add BOM for UTF-8 encoding
      const bom = "\ufeff";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });

      // Create download
      const today = new Date().toISOString().split("T")[0];
      const filename = `exames_${today}.csv`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "CSV exportado com sucesso!" });
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast({ title: "Erro ao exportar CSV", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Histórico de Exames</h1>
            <p className="text-muted-foreground">Visualize e gerencie todos os exames realizados</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por paciente..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tipo de exame" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="oct_macular">OCT Macular</SelectItem>
                  <SelectItem value="oct_nerve">OCT Nervo Óptico</SelectItem>
                  <SelectItem value="retinography">Retinografia</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="analyzing">Analisando</SelectItem>
                  <SelectItem value="analyzed">Analisado</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2 items-center">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  placeholder="Data inicial"
                  className="w-[150px]"
                />
                <span className="text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  placeholder="Data final"
                  className="w-[150px]"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Olho</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    </TableRow>
                  ))
                ) : exams.length > 0 ? (
                  exams.map((exam) => (
                    <TableRow key={exam.id}>
                      <TableCell>
                        <Link
                          to={`/paciente/${exam.patient_id}`}
                          className="font-medium hover:text-primary transition-colors"
                        >
                          {exam.patient_name}
                        </Link>
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                      <TableCell>{getEyeLabel(exam.eye)}</TableCell>
                      <TableCell>
                        {new Date(exam.exam_date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusLabels[exam.status]?.variant || "secondary"}>
                          {statusLabels[exam.status]?.label || exam.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link to={`/exame/${exam.id}`}>
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhum exame encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
