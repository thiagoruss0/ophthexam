import { Badge } from "@/components/ui/badge";
import { Check, X, AlertTriangle } from "lucide-react";
import { getBiomarkerLabel } from "./analysisLabels";
import { cn } from "@/lib/utils";

interface BiomarkerData {
  present?: boolean;
  severity?: string;
  location?: string;
  type?: string;
  description?: string;
}

interface BiomarkersDisplayProps {
  biomarkers: Record<string, BiomarkerData | boolean> | string[] | null;
}

export function BiomarkersDisplay({ biomarkers }: BiomarkersDisplayProps) {
  if (!biomarkers) return null;
  
  // Handle array of strings
  if (Array.isArray(biomarkers)) {
    if (biomarkers.length === 0) return null;
    
    return (
      <div className="space-y-3">
        <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Biomarcadores
        </h4>
        <div className="flex flex-wrap gap-2">
          {biomarkers.map((biomarker, index) => (
            <Badge 
              key={index} 
              variant="outline"
              className="status-abnormal"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {biomarker}
            </Badge>
          ))}
        </div>
      </div>
    );
  }
  
  // Handle object format
  const entries = Object.entries(biomarkers);
  if (entries.length === 0) return null;
  
  const presentBiomarkers: Array<{ key: string; data: BiomarkerData }> = [];
  const absentBiomarkers: string[] = [];
  
  entries.forEach(([key, value]) => {
    const label = getBiomarkerLabel(key);
    
    if (typeof value === "boolean") {
      if (value) {
        presentBiomarkers.push({ key: label, data: { present: true } });
      } else {
        absentBiomarkers.push(label);
      }
    } else if (typeof value === "object" && value !== null) {
      if (value.present === true || value.present === undefined) {
        presentBiomarkers.push({ key: label, data: value });
      } else {
        absentBiomarkers.push(label);
      }
    }
  });
  
  const getSeverityColor = (severity?: string) => {
    if (!severity) return "status-abnormal";
    const s = severity.toLowerCase();
    if (s.includes("leve") || s.includes("mild")) return "status-borderline";
    if (s.includes("moderado") || s.includes("moderate")) return "status-abnormal";
    if (s.includes("grave") || s.includes("severe")) return "bg-red-600 text-white border-red-600";
    return "status-abnormal";
  };
  
  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
        Biomarcadores
      </h4>
      
      <div className="flex flex-wrap gap-2">
        {/* Present biomarkers */}
        {presentBiomarkers.map(({ key, data }, index) => (
          <Badge 
            key={`present-${index}`}
            variant="outline"
            className={cn("gap-1", getSeverityColor(data.severity))}
            title={[data.location, data.type, data.description].filter(Boolean).join(" - ")}
          >
            <X className="h-3 w-3" />
            {key}
            {data.severity && (
              <span className="text-xs opacity-80">({data.severity})</span>
            )}
          </Badge>
        ))}
        
        {/* Absent biomarkers */}
        {absentBiomarkers.map((label, index) => (
          <Badge 
            key={`absent-${index}`}
            variant="outline"
            className="status-normal gap-1"
          >
            <Check className="h-3 w-3" />
            Sem {label}
          </Badge>
        ))}
      </div>
      
      {/* Details for present biomarkers */}
      {presentBiomarkers.some(b => b.data.location || b.data.description) && (
        <div className="mt-2 space-y-1">
          {presentBiomarkers.map(({ key, data }, index) => {
            if (!data.location && !data.description) return null;
            return (
              <p key={`detail-${index}`} className="text-xs text-muted-foreground">
                <strong>{key}:</strong>{" "}
                {[data.location, data.description].filter(Boolean).join(" - ")}
              </p>
            );
          })}
        </div>
      )}
    </div>
  );
}
