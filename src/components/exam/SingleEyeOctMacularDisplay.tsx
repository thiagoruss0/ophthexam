import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LayerItem } from "./LayerItem";
import { BiomarkersDisplay } from "./BiomarkersDisplay";
import { MeasurementsTable } from "./MeasurementsTable";
import { eyeLabels, getQualityInfo } from "./analysisLabels";
import { Eye } from "lucide-react";

interface SingleEyeOctMacularDisplayProps {
  findings: {
    layers?: any;
    foveal_depression?: any;
    retinal_surface?: any;
    inner_layers?: any;
    outer_layers?: any;
    rpe_choroid_complex?: any;
    clinical_notes?: string;
  };
  biomarkers?: any;
  measurements?: any;
  qualityScore?: string;
  eye: string;
  showHeader?: boolean;
}

export function SingleEyeOctMacularDisplay({ 
  findings, 
  biomarkers, 
  measurements,
  qualityScore,
  eye,
  showHeader = true
}: SingleEyeOctMacularDisplayProps) {
  const qualityInfo = qualityScore ? getQualityInfo(qualityScore) : null;
  
  // Extract layer groups from findings
  const layers = findings?.layers || {};
  const vitreoretinalInterface = layers.vitreoretinal_interface || layers.interface_vitreorretiniana || layers.mli;
  const retinalSurface = findings?.retinal_surface || layers.retinal_surface;
  const innerLayers = findings?.inner_layers || layers.inner_layers;
  const outerLayers = findings?.outer_layers || layers.outer_layers;
  const rpeComplex = findings?.rpe_choroid_complex || layers.rpe_choroid_complex;
  const fovealDepression = findings?.foveal_depression || layers.foveal_depression;
  const clinicalNotes = findings?.clinical_notes;
  
  const renderLayers = (layersData: any, groupName: string) => {
    if (!layersData) return null;
    
    if (typeof layersData === "string") {
      return (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">{groupName}</h5>
          <p className="text-sm text-muted-foreground">{layersData}</p>
        </div>
      );
    }
    
    if (typeof layersData === "object" && !Array.isArray(layersData)) {
      // Check if it's a single layer with status/description
      if (layersData.status || layersData.description) {
        return (
          <div className="bg-muted/30 rounded-lg p-3">
            <LayerItem layerKey={groupName} data={layersData} />
          </div>
        );
      }
      
      const entries = Object.entries(layersData).filter(([key]) => !key.startsWith("_"));
      if (entries.length === 0) return null;
      
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
  
  // Build individual layer items
  const renderIndividualLayers = () => {
    const layerKeys = [
      'cfnr', 'ccg', 'cpi', 'cni', // inner layers
      'cpe', 'cne', 'zona_elipsoide', // outer layers
      'epr', 'membrana_bruch', 'coroide' // rpe complex
    ];
    
    const innerLayerKeys = ['cfnr', 'ccg', 'cpi', 'cni'];
    const outerLayerKeys = ['cpe', 'cne', 'zona_elipsoide'];
    const rpeLayerKeys = ['epr', 'membrana_bruch', 'coroide'];
    
    const hasDetailedLayers = layerKeys.some(key => layers[key]);
    
    if (!hasDetailedLayers) {
      return (
        <>
          {innerLayers && renderLayers(innerLayers, "Camadas Retinianas Internas")}
          {outerLayers && renderLayers(outerLayers, "Camadas Retinianas Externas")}
          {rpeComplex && renderLayers(rpeComplex, "Complexo EPR-Coriocapilar")}
        </>
      );
    }
    
    return (
      <>
        {/* Inner Layers */}
        {innerLayerKeys.some(key => layers[key]) && (
          <div className="bg-muted/30 rounded-lg p-3">
            <h5 className="font-medium text-sm mb-2">Camadas Retinianas Internas</h5>
            <div className="space-y-1">
              {innerLayerKeys.map(key => layers[key] && (
                <LayerItem key={key} layerKey={key} data={layers[key]} />
              ))}
            </div>
          </div>
        )}
        
        {/* Outer Layers */}
        {outerLayerKeys.some(key => layers[key]) && (
          <div className="bg-muted/30 rounded-lg p-3">
            <h5 className="font-medium text-sm mb-2">Camadas Retinianas Externas</h5>
            <div className="space-y-1">
              {outerLayerKeys.map(key => layers[key] && (
                <LayerItem key={key} layerKey={key} data={layers[key]} />
              ))}
            </div>
          </div>
        )}
        
        {/* RPE Complex */}
        {rpeLayerKeys.some(key => layers[key]) && (
          <div className="bg-muted/30 rounded-lg p-3">
            <h5 className="font-medium text-sm mb-2">Complexo EPR-Coriocapilar</h5>
            <div className="space-y-1">
              {rpeLayerKeys.map(key => layers[key] && (
                <LayerItem key={key} layerKey={key} data={layers[key]} />
              ))}
            </div>
          </div>
        )}
      </>
    );
  };
  
  return (
    <div className="space-y-3">
      {/* Header with Eye and Quality */}
      {showHeader && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <span className="font-semibold text-lg">{eyeLabels[eye] || eye}</span>
            </div>
            {qualityInfo && (
              <Badge variant="outline" className={qualityInfo.color}>
                Qualidade: {qualityInfo.label}
              </Badge>
            )}
          </div>
          <Separator />
        </>
      )}
      
      {/* Vitreoretinal Interface */}
      {vitreoretinalInterface && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Interface Vitreorretiniana</h5>
          {typeof vitreoretinalInterface === "string" ? (
            <p className="text-sm text-muted-foreground">{vitreoretinalInterface}</p>
          ) : (
            <LayerItem layerKey="vitreoretinal_interface" data={vitreoretinalInterface} />
          )}
        </div>
      )}
      
      {/* Retinal Surface */}
      {retinalSurface && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Superfície Retiniana</h5>
          {typeof retinalSurface === "string" ? (
            <p className="text-sm text-muted-foreground">{retinalSurface}</p>
          ) : (
            <LayerItem layerKey="retinal_surface" data={retinalSurface} />
          )}
        </div>
      )}
      
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
      
      {/* Detailed Layers */}
      {renderIndividualLayers()}
      
      {/* Measurements - Always show central foveal thickness */}
      {measurements && (
        <div className="space-y-2">
          <MeasurementsTable measurements={measurements} compact />
        </div>
      )}
      
      {/* Biomarkers */}
      {biomarkers && <BiomarkersDisplay biomarkers={biomarkers} />}
      
      {/* Clinical Notes */}
      {clinicalNotes && (
        <div className="bg-muted/30 rounded-lg p-3">
          <h5 className="font-medium text-sm mb-2">Notas Clínicas</h5>
          <p className="text-sm whitespace-pre-wrap">{clinicalNotes}</p>
        </div>
      )}
    </div>
  );
}
