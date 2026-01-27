import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BiomarkersDisplay } from "./BiomarkersDisplay";
import { eyeLabels, getQualityInfo, getStatusInfo } from "./analysisLabels";
import { Check, AlertCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";

interface RetinographyDisplayProps {
  analysis: {
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    measurements?: any;
    retinography_analysis?: any;
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
  eye: string;
}

export function RetinographyDisplay({ analysis, eye }: RetinographyDisplayProps) {
  const findings = analysis.findings || {};
  const retinoAnalysis = analysis.retinography_analysis || {};
  const qualityInfo = analysis.quality_score 
    ? getQualityInfo(analysis.quality_score) 
    : null;
  
  // Extract retinography-specific data
  const opticDisc = retinoAnalysis.optic_disc || findings.optic_disc || findings.disco_optico;
  const macula = retinoAnalysis.macula || findings.macula;
  const vessels = retinoAnalysis.vessels || findings.vessels || findings.vasos;
  const periphery = retinoAnalysis.periphery || findings.periphery || findings.periferia;
  const clinicalNotes = findings.clinical_notes || findings.notas_clinicas || retinoAnalysis.clinical_notes;
  
  const renderSection = (data: any, title: string) => {
    if (!data) return null;
    
    if (typeof data === "string") {
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">{title}</h5>
          <p className="text-sm text-muted-foreground">{data}</p>
        </div>
      );
    }
    
    if (typeof data === "object") {
      const status = data.status ? getStatusInfo(data.status) : null;
      
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h5 className="font-medium text-sm">{title}</h5>
            {status && (
              <Badge variant="outline" className={status.color}>
                {status.label}
              </Badge>
            )}
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            {data.color && <p>Cor: {data.color}</p>}
            {data.margins && <p>Margens: {data.margins}</p>}
            {data.appearance && <p>Aparência: {data.appearance}</p>}
            {data.reflex && <p>Reflexo: {data.reflex}</p>}
            {data.caliber && <p>Calibre: {data.caliber}</p>}
            {data.ratio && <p>Relação A/V: {data.ratio}</p>}
            {data.description && <p>{data.description}</p>}
            
            {/* Handle nested findings */}
            {data.findings && Array.isArray(data.findings) && (
              <ul className="list-disc list-inside mt-2">
                {data.findings.map((f: string, i: number) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  return (
    <div className="space-y-4">
      {/* Header with Eye and Quality */}
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
      
      {/* Optic Disc */}
      {renderSection(opticDisc, "Disco Óptico")}
      
      {/* Macula */}
      {renderSection(macula, "Mácula")}
      
      {/* Vessels */}
      {renderSection(vessels, "Vasos Retinianos")}
      
      {/* Periphery */}
      {renderSection(periphery, "Retina Periférica")}
      
      {/* Generic findings if no structured data */}
      {!opticDisc && !macula && !vessels && Object.keys(findings).length > 0 && (
        <div className="space-y-3">
          {Object.entries(findings).map(([key, value]) => {
            if (key === "clinical_notes" || key === "notas_clinicas") return null;
            if (key.startsWith("_")) return null;
            
            const title = key
              .replace(/_/g, " ")
              .replace(/\b\w/g, l => l.toUpperCase());
            
            return renderSection(value, title);
          })}
        </div>
      )}
      
      <Separator />
      
      {/* Biomarkers */}
      <BiomarkersDisplay biomarkers={analysis.biomarkers} />
      
      {/* Clinical Notes */}
      {clinicalNotes && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Notas Clínicas
          </h4>
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-sm whitespace-pre-wrap">{clinicalNotes}</p>
          </div>
        </div>
      )}
      
      <Separator />
      
      {/* Risk Classification */}
      {analysis.risk_classification && (
        <div className="space-y-2">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Classificação de Risco
          </h4>
          <Badge 
            variant="outline"
            className={cn(
              "text-base py-1 px-3",
              analysis.risk_classification.toLowerCase().includes("alto") || 
              analysis.risk_classification.toLowerCase().includes("high")
                ? "status-abnormal"
                : analysis.risk_classification.toLowerCase().includes("moderado") ||
                  analysis.risk_classification.toLowerCase().includes("moderate")
                  ? "status-borderline"
                  : "status-normal"
            )}
          >
            {analysis.risk_classification}
          </Badge>
        </div>
      )}
      
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
