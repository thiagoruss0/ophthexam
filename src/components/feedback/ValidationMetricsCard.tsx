import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, AlertTriangle } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchValidationMetrics,
  type ValidationMetrics,
} from "@/services/feedbackAnalytics";

export function ValidationMetricsCard() {
  const [metrics, setMetrics] = useState<ValidationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await fetchValidationMetrics();
      setMetrics(data);
    } catch (error) {
      console.error("Error loading validation metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-4">
      {/* Success Rate Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Validação de Respostas da IA
          </CardTitle>
          <CardDescription>
            {metrics.totalValidations} análises validadas com schemas Zod
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Taxa de Sucesso</span>
              <span className="font-medium">{metrics.successRate.toFixed(1)}%</span>
            </div>
            <Progress 
              value={metrics.successRate} 
              className={`h-3 ${
                metrics.successRate >= 90 
                  ? "[&>div]:bg-green-500" 
                  : metrics.successRate >= 70 
                    ? "[&>div]:bg-yellow-500" 
                    : "[&>div]:bg-red-500"
              }`}
            />
          </div>

          {/* Validation Trend */}
          {metrics.validationTrend.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Tendência (últimos 30 dias)</p>
              <div className="h-[150px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.validationTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => 
                        new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
                      }
                      className="text-xs"
                    />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toFixed(1)}%`, "Taxa de Sucesso"]}
                      labelFormatter={(label) => 
                        new Date(label).toLocaleDateString("pt-BR", { 
                          day: "2-digit", 
                          month: "long", 
                          year: "numeric" 
                        })
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="successRate"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Common Warnings */}
      {metrics.commonWarnings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Campos com Mais Warnings
            </CardTitle>
            <CardDescription className="text-xs">
              Campos que frequentemente falham validação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.commonWarnings.slice(0, 8).map((warning, i) => (
                <div key={i} className="flex items-center justify-between">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    {warning.field}
                  </code>
                  <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600">
                    {warning.count}x
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
