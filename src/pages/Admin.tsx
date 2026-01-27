import { useEffect, useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, Clock, CheckCircle, XCircle, UserCheck, UserX, Activity } from "lucide-react";

interface PendingDoctor {
  id: string;
  user_id: string;
  full_name: string;
  crm: string;
  crm_uf: string;
  specialty: string;
  created_at: string;
}

interface AllDoctor {
  id: string;
  user_id: string;
  full_name: string;
  crm: string;
  crm_uf: string;
  specialty: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const { toast } = useToast();
  const [pendingDoctors, setPendingDoctors] = useState<PendingDoctor[]>([]);
  const [allDoctors, setAllDoctors] = useState<AllDoctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDoctors: 0,
    pendingCount: 0,
    approvedCount: 0,
    totalExams: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch pending doctors
      const { data: pending } = await supabase
        .from("profiles")
        .select("*")
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      setPendingDoctors(pending || []);

      // Fetch all doctors
      const { data: all } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      setAllDoctors(all || []);

      // Calculate stats
      const approvedCount = all?.filter((d) => d.status === "approved").length || 0;

      // Fetch total exams count
      const { count: examsCount } = await supabase
        .from("exams")
        .select("*", { count: "exact", head: true });

      setStats({
        totalDoctors: all?.length || 0,
        pendingCount: pending?.length || 0,
        approvedCount,
        totalExams: examsCount || 0,
      });
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", doctorId);

      if (error) throw error;

      toast({ title: "Médico aprovado com sucesso!" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro ao aprovar médico", variant: "destructive" });
    }
  };

  const handleReject = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended" })
        .eq("id", doctorId);

      if (error) throw error;

      toast({ title: "Cadastro rejeitado" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro ao rejeitar", variant: "destructive" });
    }
  };

  const handleSuspend = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "suspended" })
        .eq("id", doctorId);

      if (error) throw error;

      toast({ title: "Médico suspenso" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro ao suspender", variant: "destructive" });
    }
  };

  const handleReactivate = async (doctorId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ status: "approved" })
        .eq("id", doctorId);

      if (error) throw error;

      toast({ title: "Médico reativado" });
      fetchData();
    } catch (error) {
      toast({ title: "Erro ao reativar", variant: "destructive" });
    }
  };

  const specialtyLabels: Record<string, string> = {
    oftalmologia: "Oftalmologia Geral",
    retina: "Retina e Vítreo",
    glaucoma: "Glaucoma",
  };

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="container py-8">
        <h1 className="text-2xl font-bold mb-6">Painel Administrativo</h1>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Médicos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalDoctors}</div>
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
              <div className="text-3xl font-bold text-warning">{stats.pendingCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aprovados
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">{stats.approvedCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Exames
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalExams}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({stats.pendingCount})
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              Todos os Médicos
            </TabsTrigger>
          </TabsList>

          {/* Pending Tab */}
          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Médicos Aguardando Aprovação</CardTitle>
                <CardDescription>
                  Revise e aprove os cadastros de novos médicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : pendingDoctors.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CRM</TableHead>
                        <TableHead>Especialidade</TableHead>
                        <TableHead>Data Cadastro</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingDoctors.map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell className="font-medium">{doctor.full_name}</TableCell>
                          <TableCell>
                            {doctor.crm}/{doctor.crm_uf}
                          </TableCell>
                          <TableCell>{specialtyLabels[doctor.specialty]}</TableCell>
                          <TableCell>
                            {new Date(doctor.created_at).toLocaleDateString("pt-BR")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(doctor.id)}
                              >
                                <UserCheck className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <UserX className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Rejeitar Cadastro</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja rejeitar o cadastro de{" "}
                                      {doctor.full_name}? Esta ação pode ser revertida.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleReject(doctor.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Rejeitar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                    <p>Nenhum cadastro pendente de aprovação</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* All Doctors Tab */}
          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>Todos os Médicos</CardTitle>
                <CardDescription>
                  Gerencie todos os médicos cadastrados na plataforma
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CRM</TableHead>
                        <TableHead>Especialidade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allDoctors.map((doctor) => (
                        <TableRow key={doctor.id}>
                          <TableCell className="font-medium">{doctor.full_name}</TableCell>
                          <TableCell>
                            {doctor.crm}/{doctor.crm_uf}
                          </TableCell>
                          <TableCell>{specialtyLabels[doctor.specialty]}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                doctor.status === "approved"
                                  ? "default"
                                  : doctor.status === "pending"
                                  ? "secondary"
                                  : "destructive"
                              }
                              className={doctor.status === "approved" ? "bg-success" : ""}
                            >
                              {doctor.status === "approved"
                                ? "Aprovado"
                                : doctor.status === "pending"
                                ? "Pendente"
                                : "Suspenso"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {doctor.status === "approved" ? (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Suspender
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Suspender Médico</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja suspender {doctor.full_name}?
                                      O médico perderá acesso ao sistema.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleSuspend(doctor.id)}
                                    >
                                      Suspender
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            ) : doctor.status === "suspended" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleReactivate(doctor.id)}
                              >
                                Reativar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleApprove(doctor.id)}
                              >
                                Aprovar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
