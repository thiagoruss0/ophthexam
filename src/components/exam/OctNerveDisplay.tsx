import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BiomarkersDisplay } from "./BiomarkersDisplay";
import { eyeLabels, getQualityInfo, getStatusInfo } from "./analysisLabels";
import { Check, AlertCircle, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { BilateralOctNerveDisplay } from "./BilateralOctNerveDisplay";

interface OctNerveDisplayProps {
  analysis: {
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    measurements?: any;
    optic_nerve_analysis?: any;
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
  eye: string;
}

export function OctNerveDisplay({ analysis, eye }: OctNerveDisplayProps) {
  const findings = analysis.findings || {};
  const nerveAnalysis = analysis.optic_nerve_analysis || findings.optic_nerve || {};
  
  // Check if bilateral analysis
  const isBilateral = nerveAnalysis.bilateral === true || findings.bilateral === true;
  
  if (isBilateral && (nerveAnalysis.od || nerveAnalysis.oe)) {
    return <BilateralOctNerveDisplay analysis={analysis} />;
  }
  
  const qualityInfo = analysis.quality_score 
    ? getQualityInfo(analysis.quality_score) 
    : null;
  
  // Extract nerve-specific data
  const discAppearance = nerveAnalysis.disc_appearance || nerveAnalysis.aparencia_disco;
  const cupDiscRatio = nerveAnalysis.cup_disc_ratio || nerveAnalysis.relacao_ed || analysis.measurements?.cup_disc_ratio;
  const rimAnalysis = nerveAnalysis.rim_analysis || nerveAnalysis.analise_rima;
  const rnflAnalysis = nerveAnalysis.rnfl_analysis || nerveAnalysis.cfnr || findings.cfnr;
  const clinicalNotes = findings.clinical_notes || findings.notas_clinicas || nerveAnalysis.clinical_notes;
  
  // RNFL quadrant data
  const rnflQuadrants = analysis.measurements?.rnfl_quadrants || nerveAnalysis.rnfl_quadrants || {};
  
  const getRnflStatus = (value: number, quadrant: string) => {
    // Reference values vary by quadrant
    const refs: Record<string, { min: number; borderline: number }> = {
      superior: { min: 100, borderline: 80 },
      inferior: { min: 100, borderline: 80 },
      nasal: { min: 60, borderline: 50 },
      temporal: { min: 50, borderline: 40 },
      average: { min: 80, borderline: 70 },
    };
    
    const ref = refs[quadrant.toLowerCase()] || refs.average;
    if (value >= ref.min) return getStatusInfo("normal");
    if (value >= ref.borderline) return getStatusInfo("borderline");
    return getStatusInfo("anormal");
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
      
      {/* Disc Appearance */}
      {discAppearance && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Aparência do Disco Óptico</h5>
          {typeof discAppearance === "string" ? (
            <p className="text-sm text-muted-foreground">{discAppearance}</p>
          ) : (
            <div className="space-y-1 text-sm">
              {discAppearance.color && <p>Cor: {discAppearance.color}</p>}
              {discAppearance.margins && <p>Margens: {discAppearance.margins}</p>}
              {discAppearance.description && <p>{discAppearance.description}</p>}
            </div>
          )}
        </div>
      )}
      
      {/* Cup/Disc Ratio */}
      {cupDiscRatio && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Relação Escavação/Disco (E/D)</h5>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold">
              {typeof cupDiscRatio === "object" ? cupDiscRatio.value : cupDiscRatio}
            </span>
            <Badge 
              variant="outline"
              className={cn(
                typeof cupDiscRatio === "object" && cupDiscRatio.classification
                  ? getStatusInfo(cupDiscRatio.classification).color
                  : parseFloat(String(cupDiscRatio)) > 0.6 
                    ? "status-abnormal" 
                    : parseFloat(String(cupDiscRatio)) > 0.5 
                      ? "status-borderline"
                      : "status-normal"
              )}
            >
              {typeof cupDiscRatio === "object" && cupDiscRatio.classification
                ? cupDiscRatio.classification
                : parseFloat(String(cupDiscRatio)) > 0.6 
                  ? "Aumentada" 
                  : parseFloat(String(cupDiscRatio)) > 0.5 
                    ? "Limítrofe"
                    : "Normal"
              }
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Referência: &lt; 0.5 (Normal), 0.5-0.6 (Limítrofe), &gt; 0.6 (Suspeito)
          </p>
        </div>
      )}
      
      {/* Rim Analysis */}
      {rimAnalysis && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Análise da Rima Neural</h5>
          {typeof rimAnalysis === "string" ? (
            <p className="text-sm text-muted-foreground">{rimAnalysis}</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 text-sm">
              {rimAnalysis.superior && (
                <div>Superior: {rimAnalysis.superior}</div>
              )}
              {rimAnalysis.inferior && (
                <div>Inferior: {rimAnalysis.inferior}</div>
              )}
              {rimAnalysis.nasal && (
                <div>Nasal: {rimAnalysis.nasal}</div>
              )}
              {rimAnalysis.temporal && (
                <div>Temporal: {rimAnalysis.temporal}</div>
              )}
              {rimAnalysis.description && (
                <p className="col-span-2 text-muted-foreground">{rimAnalysis.description}</p>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* RNFL Analysis */}
      {(rnflAnalysis || Object.keys(rnflQuadrants).length > 0) && (
        <div className="space-y-3">
          <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
            Camada de Fibras Nervosas da Retina (CFNR)
          </h4>
          
          {typeof rnflAnalysis === "string" && (
            <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
              {rnflAnalysis}
            </p>
          )}
          
          {Object.keys(rnflQuadrants).length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quadrante</TableHead>
                  <TableHead className="text-right">Espessura</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(rnflQuadrants).map(([quadrant, value]) => {
                  const numValue = typeof value === "object" ? (value as any).value : value;
                  const status = getRnflStatus(Number(numValue), quadrant);
                  
                  return (
                    <TableRow key={quadrant}>
                      <TableCell className="font-medium capitalize">{quadrant}</TableCell>
                      <TableCell className="text-right font-mono">{numValue} µm</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={status.color}>
                          {status.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
      
      {/* Global RNFL Average */}
      {analysis.measurements?.avg_rnfl && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">CFNR Média Global</h5>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-mono font-bold">
              {analysis.measurements.avg_rnfl} µm
            </span>
            <Badge 
              variant="outline"
              className={getRnflStatus(Number(analysis.measurements.avg_rnfl), "average").color}
            >
              {getRnflStatus(Number(analysis.measurements.avg_rnfl), "average").label}
            </Badge>
          </div>
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
