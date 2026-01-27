import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LayerItem } from "./LayerItem";
import { BiomarkersDisplay } from "./BiomarkersDisplay";
import { MeasurementsTable } from "./MeasurementsTable";
import { eyeLabels, getQualityInfo } from "./analysisLabels";
import { Check, AlertCircle, Eye } from "lucide-react";
import { SingleEyeOctMacularDisplay } from "./SingleEyeOctMacularDisplay";
import { BilateralOctMacularDisplay } from "./BilateralOctMacularDisplay";

interface OctMacularDisplayProps {
  analysis: {
    quality_score?: string;
    findings?: any;
    biomarkers?: any;
    measurements?: any;
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
  eye: string;
}

export function OctMacularDisplay({ analysis, eye }: OctMacularDisplayProps) {
  const findings = analysis.findings || {};
  const biomarkers = analysis.biomarkers || {};
  const measurements = analysis.measurements || {};
  
  // Check if bilateral analysis
  const isBilateral = findings.bilateral === true && (findings.od || findings.oe);
  const isBilateralMeasurements = measurements.bilateral === true;
  const isBilateralBiomarkers = biomarkers.bilateral === true;
  
  if (isBilateral || isBilateralMeasurements) {
    return <BilateralOctMacularDisplay analysis={analysis} />;
  }
  
  // Single eye display
  const qualityInfo = analysis.quality_score 
    ? getQualityInfo(analysis.quality_score) 
    : null;
  
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
      
      <SingleEyeOctMacularDisplay
        findings={findings}
        biomarkers={analysis.biomarkers}
        measurements={analysis.measurements}
        qualityScore={analysis.quality_score}
        eye={eye}
        showHeader={false}
      />
      
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
