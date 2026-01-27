import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LayerItem } from "./LayerItem";
import { BiomarkersDisplay } from "./BiomarkersDisplay";
import { MeasurementsTable } from "./MeasurementsTable";
import { eyeLabels, getQualityInfo } from "./analysisLabels";
import { Check, AlertCircle, Eye } from "lucide-react";

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
  const qualityInfo = analysis.quality_score 
    ? getQualityInfo(analysis.quality_score) 
    : null;
  
  // Extract layer groups from findings
  const vitreoretinalInterface = findings.vitreoretinal_interface || findings.interface_vitreorretiniana || findings.mli;
  const retinalSurface = findings.retinal_surface || findings.superficie_retiniana;
  const innerLayers = findings.inner_layers || findings.camadas_internas;
  const outerLayers = findings.outer_layers || findings.camadas_externas;
  const rpeComplex = findings.rpe_choroid_complex || findings.complexo_epr || findings.epr;
  const choroid = findings.choroid || findings.coroide;
  const fovealDepression = findings.foveal_depression || findings.depressao_foveal;
  const clinicalNotes = findings.clinical_notes || findings.notas_clinicas;
  
  // Handle both structured and flat layer data
  const renderLayers = (layers: any, groupName: string) => {
    if (!layers) return null;
    
    if (typeof layers === "string") {
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">{groupName}</h5>
          <p className="text-sm text-muted-foreground">{layers}</p>
        </div>
      );
    }
    
    if (typeof layers === "object" && !Array.isArray(layers)) {
      const entries = Object.entries(layers).filter(([key]) => !key.startsWith("_"));
      if (entries.length === 0) return null;
      
      // Check if it's a single layer with status/description
      if (layers.status || layers.description) {
        return (
          <div className="bg-muted/30 rounded-lg p-3">
            <h5 className="font-medium text-sm mb-2">{groupName}</h5>
            <LayerItem layerKey={groupName} data={layers} />
          </div>
        );
      }
      
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">{groupName}</h5>
          <div className="space-y-1">
            {entries.map(([key, value]) => (
              <LayerItem key={key} layerKey={key} data={value as any} />
            ))}
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
      
      {/* Vitreoretinal Interface */}
      {vitreoretinalInterface && renderLayers(vitreoretinalInterface, "Interface Vitreorretiniana")}
      
      {/* Retinal Surface */}
      {retinalSurface && renderLayers(retinalSurface, "Superfície Retiniana")}
      
      {/* Foveal Depression */}
      {fovealDepression && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Depressão Foveal</h5>
          {typeof fovealDepression === "string" ? (
            <p className="text-sm text-muted-foreground">{fovealDepression}</p>
          ) : (
            <LayerItem layerKey="foveal_depression" data={fovealDepression} />
          )}
        </div>
      )}
      
      {/* Inner Retinal Layers */}
      {innerLayers && renderLayers(innerLayers, "Camadas Retinianas Internas")}
      
      {/* Outer Retinal Layers */}
      {outerLayers && renderLayers(outerLayers, "Camadas Retinianas Externas")}
      
      {/* RPE-Choroid Complex */}
      {rpeComplex && renderLayers(rpeComplex, "Complexo EPR-Coriocapilar")}
      
      {/* Choroid */}
      {choroid && renderLayers(choroid, "Coroide")}
      
      {/* Generic layers if no structured data */}
      {findings.layers && !innerLayers && !outerLayers && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Camadas Retinianas</h5>
          {typeof findings.layers === "string" ? (
            <p className="text-sm text-muted-foreground">{findings.layers}</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(findings.layers).map(([key, value]) => (
                <LayerItem key={key} layerKey={key} data={value as any} />
              ))}
            </div>
          )}
        </div>
      )}
      
      <Separator />
      
      {/* Measurements */}
      <MeasurementsTable measurements={analysis.measurements} />
      
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
