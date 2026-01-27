import { OctMacularDisplay } from "./OctMacularDisplay";
import { OctNerveDisplay } from "./OctNerveDisplay";
import { RetinographyDisplay } from "./RetinographyDisplay";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, Check, Eye } from "lucide-react";
import { eyeLabels, getQualityInfo } from "./analysisLabels";

interface AnalysisDisplayProps {
  examType: string;
  analysis: {
    id?: string;
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    measurements?: any;
    optic_nerve_analysis?: any;
    retinography_analysis?: any;
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
  eye: string;
}

// Generic fallback display for unknown exam types
function GenericDisplay({ analysis, eye }: { analysis: AnalysisDisplayProps["analysis"]; eye: string }) {
  const qualityInfo = analysis.quality_score 
    ? getQualityInfo(analysis.quality_score) 
    : null;
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <span className="font-semibold">{eyeLabels[eye] || eye}</span>
        </div>
        {qualityInfo && (
          <Badge variant="outline" className={qualityInfo.color}>
            Qualidade: {qualityInfo.label}
          </Badge>
        )}
      </div>
      
      <Separator />
      
      {/* Findings */}
      {analysis.findings && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Achados
          </h4>
          <div className="bg-muted/30 rounded-lg p-3">
            {typeof analysis.findings === "string" ? (
              <p className="text-sm whitespace-pre-wrap">{analysis.findings}</p>
            ) : (
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(analysis.findings, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
      
      {/* Biomarkers */}
      {analysis.biomarkers && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Biomarcadores
          </h4>
          <div className="flex flex-wrap gap-2">
            {Array.isArray(analysis.biomarkers) ? (
              analysis.biomarkers.map((b: string, i: number) => (
                <Badge key={i} variant="outline">{b}</Badge>
              ))
            ) : typeof analysis.biomarkers === "object" ? (
              Object.entries(analysis.biomarkers).map(([key, value], i) => (
                <Badge key={i} variant="outline">
                  {key}: {String(value)}
                </Badge>
              ))
            ) : (
              <Badge variant="outline">{String(analysis.biomarkers)}</Badge>
            )}
          </div>
        </div>
      )}
      
      <Separator />
      
      {/* Diagnosis */}
      {analysis.diagnosis && analysis.diagnosis.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Impressão Diagnóstica
          </h4>
          <ul className="space-y-1">
            {analysis.diagnosis.map((d, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                <span>{d}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Recommendations */}
      {analysis.recommendations && analysis.recommendations.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Recomendações
          </h4>
          <ul className="space-y-1">
            {analysis.recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function AnalysisDisplay({ examType, analysis, eye }: AnalysisDisplayProps) {
  switch (examType) {
    case "oct_macular":
      return <OctMacularDisplay analysis={analysis} eye={eye} />;
    case "oct_nerve":
      return <OctNerveDisplay analysis={analysis} eye={eye} />;
    case "retinography":
      return <RetinographyDisplay analysis={analysis} eye={eye} />;
    default:
      return <GenericDisplay analysis={analysis} eye={eye} />;
  }
}
