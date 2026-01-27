import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SingleEyeOctMacularDisplay } from "./SingleEyeOctMacularDisplay";
import { getQualityInfo } from "./analysisLabels";
import { Check, AlertCircle, Eye, ArrowLeftRight } from "lucide-react";

interface BilateralOctMacularDisplayProps {
  analysis: {
    quality_score?: string;
    findings?: {
      bilateral?: boolean;
      od?: any;
      oe?: any;
      comparison?: {
        symmetry?: string;
        asymmetry_details?: string;
        notes?: string;
      };
      overall_clinical_notes?: string;
    };
    biomarkers?: {
      bilateral?: boolean;
      od?: any;
      oe?: any;
    };
    measurements?: {
      bilateral?: boolean;
      od?: any;
      oe?: any;
    };
    diagnosis?: string[];
    recommendations?: string[];
  };
}

export function BilateralOctMacularDisplay({ analysis }: BilateralOctMacularDisplayProps) {
  const findings = analysis.findings || {};
  const biomarkers = analysis.biomarkers || {};
  const measurements = analysis.measurements || {};
  const comparison = findings.comparison;
  const qualityInfo = analysis.quality_score ? getQualityInfo(analysis.quality_score) : null;
  
  const isSymmetric = comparison?.symmetry === 'simetrico';
  
  return (
    <div className="space-y-6">
      {/* Global Quality Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <span className="font-semibold">Análise Bilateral</span>
        </div>
        {qualityInfo && (
          <Badge variant="outline" className={qualityInfo.color}>
            Qualidade Global: {qualityInfo.label}
          </Badge>
        )}
      </div>
      
      <Separator />
      
      {/* Bilateral Display - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Right Eye (OD) */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Olho Direito (OD)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SingleEyeOctMacularDisplay
              findings={findings.od || {}}
              biomarkers={biomarkers.od}
              measurements={measurements.od}
              qualityScore={findings.od?.quality?.score}
              eye="od"
              showHeader={false}
            />
          </CardContent>
        </Card>
        
        {/* Left Eye (OE) */}
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2 bg-primary/5">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Olho Esquerdo (OE)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <SingleEyeOctMacularDisplay
              findings={findings.oe || {}}
              biomarkers={biomarkers.oe}
              measurements={measurements.oe}
              qualityScore={findings.oe?.quality?.score}
              eye="oe"
              showHeader={false}
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Comparison Section */}
      {comparison && (
        <>
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-primary" />
              <h4 className="font-semibold text-sm uppercase tracking-wide">
                Comparação Bilateral
              </h4>
              <Badge 
                variant="outline" 
                className={isSymmetric ? "bg-green-50 text-green-700 border-green-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}
              >
                {isSymmetric ? "Simétrico" : "Assimétrico"}
              </Badge>
            </div>
            
            {comparison.asymmetry_details && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm">{comparison.asymmetry_details}</p>
              </div>
            )}
            
            {comparison.notes && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm">{comparison.notes}</p>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* Overall Clinical Notes */}
      {findings.overall_clinical_notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Notas Clínicas Gerais
            </h4>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap">{findings.overall_clinical_notes}</p>
            </div>
          </div>
        </>
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
