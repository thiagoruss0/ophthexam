import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getMeasurementLabel, getStatusInfo } from "./analysisLabels";
import { cn } from "@/lib/utils";

interface MeasurementData {
  value?: number | string;
  unit?: string;
  classification?: string;
  status?: string;
  reference_range?: string;
}

interface MeasurementsTableProps {
  measurements: Record<string, MeasurementData | number | string> | null;
  compact?: boolean;
}

// Reference ranges for common measurements
const referenceRanges: Record<string, { min: number; max: number; unit: string }> = {
  central_thickness: { min: 200, max: 300, unit: "µm" },
  central_foveal_thickness: { min: 200, max: 300, unit: "µm" },
  espessura_central: { min: 200, max: 300, unit: "µm" },
  choroidal_thickness: { min: 150, max: 350, unit: "µm" },
  avg_rnfl: { min: 80, max: 110, unit: "µm" },
  cup_disc_ratio: { min: 0.1, max: 0.5, unit: "" },
};

function getClassification(key: string, value: number): { label: string; color: string } {
  const ref = referenceRanges[key.toLowerCase().replace(/\s+/g, "_")];
  if (!ref) return { label: "", color: "" };
  
  if (value < ref.min) {
    return { label: "Reduzida", color: "status-abnormal" };
  }
  if (value > ref.max) {
    return { label: "Aumentada", color: "status-abnormal" };
  }
  return { label: "Normal", color: "status-normal" };
}

export function MeasurementsTable({ measurements, compact = false }: MeasurementsTableProps) {
  if (!measurements || Object.keys(measurements).length === 0) return null;
  
  const entries = Object.entries(measurements).filter(([key]) => {
    // Filter out metadata keys
    return !key.startsWith("_") && key !== "notes";
  });
  
  if (entries.length === 0) return null;
  
  if (compact) {
    return (
      <div className="space-y-2">
        {entries.map(([key, data]) => {
          const label = getMeasurementLabel(key);
          let value: string;
          let classification = { label: "", color: "" };
          
          if (typeof data === "number") {
            value = `${data} µm`;
            classification = getClassification(key, data);
          } else if (typeof data === "string") {
            value = data;
          } else {
            value = `${data.value}${data.unit ? ` ${data.unit}` : ""}`;
            if (data.classification || data.status) {
              classification = getStatusInfo(data.classification || data.status || "");
            } else if (typeof data.value === "number") {
              classification = getClassification(key, data.value);
            }
          }
          
          return (
            <div key={key} className="flex items-center justify-between py-1 border-b border-border/50 last:border-0">
              <span className="text-sm font-medium">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">{value}</span>
                {classification.label && (
                  <Badge variant="outline" className={cn("text-xs", classification.color)}>
                    {classification.label}
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        Medidas
      </h4>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Parâmetro</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead className="text-center">Classificação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([key, data]) => {
            const label = getMeasurementLabel(key);
            let value: string;
            let unit = "";
            let classification = { label: "", color: "" };
            let referenceRange = "";
            
            if (typeof data === "number") {
              value = String(data);
              unit = "µm";
              classification = getClassification(key, data);
              const ref = referenceRanges[key.toLowerCase().replace(/\s+/g, "_")];
              if (ref) referenceRange = `${ref.min}-${ref.max} ${ref.unit}`;
            } else if (typeof data === "string") {
              value = data;
            } else {
              value = String(data.value);
              unit = data.unit || "";
              referenceRange = data.reference_range || "";
              if (data.classification || data.status) {
                classification = getStatusInfo(data.classification || data.status || "");
              } else if (typeof data.value === "number") {
                classification = getClassification(key, data.value);
              }
            }
            
            return (
              <TableRow key={key}>
                <TableCell className="font-medium">
                  {label}
                  {referenceRange && (
                    <span className="block text-xs text-muted-foreground">
                      Ref: {referenceRange}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {value} {unit}
                </TableCell>
                <TableCell className="text-center">
                  {classification.label && (
                    <Badge variant="outline" className={classification.color}>
                      {classification.label}
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
