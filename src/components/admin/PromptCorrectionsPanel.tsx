import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle,
  Eye,
  RefreshCw,
  Trash2,
  Zap,
  Target,
  ShieldAlert,
  Lightbulb,
  Play,
  Clock,
  TrendingUp,
} from "lucide-react";

interface PromptConfig {
  id: string;
  exam_type: string;
  config_type: string;
  content: {
    target: string;
    type: string;
    message: string;
    suggestion?: string[];
    criteria?: string[];
    characteristics?: string[];
    severity?: string;
    feedback_count?: number;
    error_rate?: number;
  };
  priority: number;
  is_active: boolean;
  source_feedback_count: number;
  error_rate: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

interface AnalysisLog {
  id: string;
  analysis_period_start: string;
  analysis_period_end: string;
  total_feedback_analyzed: number;
  corrections_generated: number;
  created_at: string;
}

const EXAM_TYPE_LABELS: Record<string, string> = {
  oct_macular: "OCT Macular",
  oct_nerve: "OCT Nervo",
  retinography: "Retinografia",
};

const CONFIG_TYPE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  correction: {
    label: "Correção",
    icon: Target,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  exclusion: {
    label: "Exclusão",
    icon: ShieldAlert,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  emphasis: {
    label: "Ênfase",
    icon: Lightbulb,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },
};

export function PromptCorrectionsPanel() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isRunningAnalysis, setIsRunningAnalysis] = useState(false);
  const [configs, setConfigs] = useState<PromptConfig[]>([]);
  const [analysisLogs, setAnalysisLogs] = useState<AnalysisLog[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<PromptConfig | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch prompt configs
      const { data: configData, error: configError } = await supabase
        .from("prompt_configs")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (configError) throw configError;
      setConfigs((configData as PromptConfig[]) || []);

      // Fetch analysis logs
      const { data: logData, error: logError } = await supabase
        .from("feedback_analysis_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (logError) throw logError;
      setAnalysisLogs((logData as AnalysisLog[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const runFeedbackAnalysis = async () => {
    setIsRunningAnalysis(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-feedback");

      if (error) throw error;

      toast({
        title: "Análise concluída",
        description: `${data.total_corrections_generated || 0} correções geradas a partir de ${data.total_feedback_analyzed || 0} feedbacks.`,
      });

      fetchData();
    } catch (error) {
      console.error("Error running analysis:", error);
      toast({
        title: "Erro ao executar análise",
        description: "Verifique os logs do sistema.",
        variant: "destructive",
      });
    } finally {
      setIsRunningAnalysis(false);
    }
  };

  const toggleConfigActive = async (config: PromptConfig) => {
    try {
      const { error } = await supabase
        .from("prompt_configs")
        .update({ is_active: !config.is_active })
        .eq("id", config.id);

      if (error) throw error;

      toast({
        title: config.is_active ? "Correção desativada" : "Correção ativada",
      });

      fetchData();
    } catch (error) {
      console.error("Error toggling config:", error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const deleteConfig = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta correção?")) return;

    try {
      const { error } = await supabase
        .from("prompt_configs")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({ title: "Correção excluída" });
      fetchData();
    } catch (error) {
      console.error("Error deleting config:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const activeConfigs = configs.filter((c) => c.is_active);
  const inactiveConfigs = configs.filter((c) => !c.is_active);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com estatisticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Correções Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold">{activeConfigs.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por Tipo de Exame
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {Object.entries(
                activeConfigs.reduce((acc, c) => {
                  acc[c.exam_type] = (acc[c.exam_type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([type, count]) => (
                <Badge key={type} variant="secondary">
                  {EXAM_TYPE_LABELS[type] || type}: {count}
                </Badge>
              ))}
              {activeConfigs.length === 0 && (
                <span className="text-sm text-muted-foreground">Nenhuma</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Última Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">
                {analysisLogs[0]
                  ? new Date(analysisLogs[0].created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "Nunca executada"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Executar Análise
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runFeedbackAnalysis}
              disabled={isRunningAnalysis}
              className="w-full"
            >
              {isRunningAnalysis ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Analisar Feedback
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Correções Ativas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Correções Ativas
              </CardTitle>
              <CardDescription>
                Ajustes automáticos aplicados aos prompts de análise
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeConfigs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhuma correção ativa</p>
              <p className="text-sm mt-1">
                Execute a análise de feedback para gerar correções automáticas
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Exame</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Taxa de Erro</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Expira em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeConfigs.map((config) => {
                  const typeInfo = CONFIG_TYPE_INFO[config.config_type];
                  const TypeIcon = typeInfo?.icon || Target;

                  return (
                    <TableRow key={config.id}>
                      <TableCell>
                        <Badge className={typeInfo?.color}>
                          <TypeIcon className="h-3 w-3 mr-1" />
                          {typeInfo?.label || config.config_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {EXAM_TYPE_LABELS[config.exam_type] || config.exam_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {config.content.target}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-4 w-4 text-red-500" />
                          <span>{((config.error_rate || 0) * 100).toFixed(1)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{config.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        {config.expires_at
                          ? new Date(config.expires_at).toLocaleDateString("pt-BR")
                          : "Nunca"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedConfig(config)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes da Correção</DialogTitle>
                                <DialogDescription>
                                  {config.content.target}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <h4 className="font-semibold mb-2">Mensagem</h4>
                                  <p className="text-sm bg-muted p-3 rounded">
                                    {config.content.message}
                                  </p>
                                </div>

                                {config.content.suggestion && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Sugestões</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                      {config.content.suggestion.map((s, i) => (
                                        <li key={i}>{s}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {config.content.criteria && (
                                  <div>
                                    <h4 className="font-semibold mb-2">Critérios</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">
                                      {config.content.criteria.map((c, i) => (
                                        <li key={i}>{c}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-muted-foreground">Feedbacks analisados:</span>
                                    <span className="ml-2 font-medium">
                                      {config.source_feedback_count}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Criado em:</span>
                                    <span className="ml-2 font-medium">
                                      {new Date(config.created_at).toLocaleDateString("pt-BR")}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Switch
                            checked={config.is_active}
                            onCheckedChange={() => toggleConfigActive(config)}
                          />

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteConfig(config.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Análises */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Histórico de Análises
          </CardTitle>
          <CardDescription>
            Execuções recentes do pipeline de análise de feedback
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analysisLogs.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              Nenhuma análise executada ainda
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Período Analisado</TableHead>
                  <TableHead>Feedbacks</TableHead>
                  <TableHead>Correções Geradas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                    <TableCell>
                      {new Date(log.analysis_period_start).toLocaleDateString("pt-BR")} -{" "}
                      {new Date(log.analysis_period_end).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>{log.total_feedback_analyzed}</TableCell>
                    <TableCell>
                      <Badge variant={log.corrections_generated > 0 ? "default" : "secondary"}>
                        {log.corrections_generated}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Correções Inativas */}
      {inactiveConfigs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-5 w-5" />
              Correções Inativas ({inactiveConfigs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {inactiveConfigs.map((config) => (
                <div
                  key={config.id}
                  className="flex items-center justify-between p-2 bg-muted/50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{config.exam_type}</Badge>
                    <span className="text-sm">{config.content.target}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={() => toggleConfigActive(config)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteConfig(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
