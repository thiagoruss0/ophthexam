import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getQualityInfo, getStatusInfo } from "./analysisLabels";
import { Check, AlertCircle, Eye, ArrowLeftRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface BilateralRetinographyDisplayProps {
  analysis: {
    quality_score?: string;
    retinography_analysis?: {
      bilateral?: boolean;
      od?: {
        optic_disc?: any;
        macula?: any;
        vessels?: any;
        retina_general?: any;
        clinical_notes?: string;
      };
      oe?: {
        optic_disc?: any;
        macula?: any;
        vessels?: any;
        retina_general?: any;
        clinical_notes?: string;
      };
      comparison?: {
        symmetry?: string;
        asymmetry_details?: string;
        notes?: string;
      };
      classifications?: any;
      urgency?: string;
    };
    findings?: {
      bilateral?: boolean;
      overall_clinical_notes?: string;
    };
    diagnosis?: string[];
    recommendations?: string[];
  };
}

function OpticDiscSection({ opticDisc }: { opticDisc: any }) {
  if (!opticDisc) return null;
  
  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm">Disco Óptico</h5>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-background/50 rounded p-2">
          <span className="text-muted-foreground">Cor:</span>{' '}
          <span className="font-medium capitalize">{opticDisc.color || '-'}</span>
        </div>
        <div className="bg-background/50 rounded p-2">
          <span className="text-muted-foreground">Bordas:</span>{' '}
          <span className="font-medium capitalize">{opticDisc.borders || '-'}</span>
        </div>
        {opticDisc.cd_ratio_estimated && (
          <div className="bg-background/50 rounded p-2 col-span-2">
            <span className="text-muted-foreground">Relação E/D estimada:</span>{' '}
            <span className="font-mono font-medium">{opticDisc.cd_ratio_estimated.value || '-'}</span>
            {opticDisc.cd_ratio_estimated.confidence && (
              <span className="text-xs text-muted-foreground ml-2">
                (confiança: {opticDisc.cd_ratio_estimated.confidence})
              </span>
            )}
          </div>
        )}
        {opticDisc.isnt_rule !== undefined && (
          <div className="bg-background/50 rounded p-2 col-span-2">
            <span className="text-muted-foreground">Regra ISNT:</span>{' '}
            <Badge 
              variant="outline" 
              className={cn("ml-2 text-xs", opticDisc.isnt_rule?.preserved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}
            >
              {opticDisc.isnt_rule?.preserved ? "Preservada" : "Violada"}
            </Badge>
          </div>
        )}
      </div>
      
      {/* Glaucoma probability */}
      {opticDisc.glaucoma_probability && (
        <div className="mt-2">
          <Badge 
            variant="outline" 
            className={cn("text-xs",
              opticDisc.glaucoma_probability === 'baixa' && "bg-green-50 text-green-700",
              opticDisc.glaucoma_probability === 'moderada' && "bg-yellow-50 text-yellow-700",
              opticDisc.glaucoma_probability === 'alta' && "bg-red-50 text-red-700"
            )}
          >
            Probabilidade de Glaucoma: {opticDisc.glaucoma_probability}
          </Badge>
        </div>
      )}
      
      {/* Findings badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {opticDisc.notch?.present && (
          <Badge variant="destructive" className="text-xs">Notch</Badge>
        )}
        {opticDisc.disc_hemorrhage?.present && (
          <Badge variant="destructive" className="text-xs">Hemorragia</Badge>
        )}
        {opticDisc.peripapillary_atrophy?.present && (
          <Badge variant="outline" className="text-xs">
            Atrofia peripapilar {opticDisc.peripapillary_atrophy.type}
          </Badge>
        )}
      </div>
    </div>
  );
}

function MaculaSection({ macula }: { macula: any }) {
  if (!macula) return null;
  
  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm">Mácula</h5>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-background/50 rounded p-2">
          <span className="text-muted-foreground">Reflexo Foveal:</span>{' '}
          <span className="font-medium capitalize">{macula.foveal_reflex || '-'}</span>
        </div>
        <div className="bg-background/50 rounded p-2">
          <span className="text-muted-foreground">Pigmentação:</span>{' '}
          <span className="font-medium capitalize">{macula.pigmentation || '-'}</span>
        </div>
      </div>
      
      {/* Findings badges */}
      <div className="flex flex-wrap gap-1 mt-2">
        {macula.drusas?.present && (
          <Badge variant="outline" className="text-xs">
            Drusas {macula.drusas.size} {macula.drusas.type}
          </Badge>
        )}
        {macula.hemorrhages?.present && (
          <Badge variant="destructive" className="text-xs">Hemorragias</Badge>
        )}
        {macula.edema_signs?.present && (
          <Badge variant="destructive" className="text-xs">Sinais de Edema</Badge>
        )}
        {macula.atrophy?.present && (
          <Badge variant="outline" className="text-xs">Atrofia {macula.atrophy.type}</Badge>
        )}
      </div>
    </div>
  );
}

function VesselsSection({ vessels }: { vessels: any }) {
  if (!vessels) return null;
  
  const findings = [];
  if (vessels.arteriolar_narrowing?.present) findings.push("Estreitamento arteriolar");
  if (vessels.av_nicking?.present) findings.push("Cruzamento AV");
  if (vessels.microaneurysms?.present) findings.push(`Microaneurismas (${vessels.microaneurysms.quantity || '-'})`);
  
  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm">Vasos</h5>
      <div className="text-sm">
        {vessels.av_ratio && (
          <div className="bg-background/50 rounded p-2 mb-2">
            <span className="text-muted-foreground">Relação A/V:</span>{' '}
            <span className="font-medium">{vessels.av_ratio.value || '-'}</span>
            {vessels.av_ratio.classification && (
              <Badge variant="outline" className="ml-2 text-xs">
                {vessels.av_ratio.classification}
              </Badge>
            )}
          </div>
        )}
        
        {findings.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {findings.map((f, i) => (
              <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SingleEyeRetinographyDisplay({ data, eye }: { data: any; eye: string }) {
  if (!data) return null;
  
  return (
    <div className="space-y-4">
      <OpticDiscSection opticDisc={data.optic_disc} />
      <Separator />
      <MaculaSection macula={data.macula} />
      <Separator />
      <VesselsSection vessels={data.vessels} />
      
      {data.clinical_notes && (
        <div className="bg-muted/30 rounded-lg p-3 mt-3">
          <p className="text-sm">{data.clinical_notes}</p>
        </div>
      )}
    </div>
  );
}

export function BilateralRetinographyDisplay({ analysis }: BilateralRetinographyDisplayProps) {
  const retinography = analysis.retinography_analysis || {};
  const comparison = retinography.comparison;
  const qualityInfo = analysis.quality_score ? getQualityInfo(analysis.quality_score) : null;
  
  const isSymmetric = comparison?.symmetry === 'simetrico';
  
  // Classifications section
  const renderClassifications = () => {
    const classifications = retinography.classifications;
    if (!classifications) return null;
    
    const items = [];
    if (classifications.diabetic_retinopathy && classifications.diabetic_retinopathy !== 'ausente') {
      items.push({ label: 'Retinopatia Diabética', value: classifications.diabetic_retinopathy });
    }
    if (classifications.hypertensive_retinopathy && classifications.hypertensive_retinopathy !== 'ausente') {
      items.push({ label: 'Retinopatia Hipertensiva', value: classifications.hypertensive_retinopathy });
    }
    if (classifications.amd && classifications.amd !== 'ausente') {
      items.push({ label: 'DMRI', value: classifications.amd });
    }
    if (classifications.glaucoma_suspect && classifications.glaucoma_suspect !== 'nao') {
      items.push({ label: 'Suspeita de Glaucoma', value: classifications.glaucoma_suspect });
    }
    
    if (items.length === 0) return null;
    
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <Badge key={i} variant="outline" className="text-xs">
            {item.label}: {item.value.replace(/_/g, ' ')}
          </Badge>
        ))}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Global Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <span className="font-semibold">Análise Bilateral - Retinografia</span>
        </div>
        <div className="flex items-center gap-2">
          {qualityInfo && (
            <Badge variant="outline" className={qualityInfo.color}>
              Qualidade: {qualityInfo.label}
            </Badge>
          )}
          {retinography.urgency && retinography.urgency !== 'rotina' && (
            <Badge 
              variant={retinography.urgency === 'urgente' ? 'destructive' : 'default'}
              className="text-xs"
            >
              {retinography.urgency === 'urgente' ? 'URGENTE' : 'Preferencial'}
            </Badge>
          )}
        </div>
      </div>
      
      {/* Classifications */}
      {renderClassifications()}
      
      <Separator />
      
      {/* Bilateral Display */}
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
            <SingleEyeRetinographyDisplay data={retinography.od} eye="od" />
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
            <SingleEyeRetinographyDisplay data={retinography.oe} eye="oe" />
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
      {analysis.findings?.overall_clinical_notes && (
        <>
          <Separator />
          <div className="space-y-2">
            <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Notas Clínicas Gerais
            </h4>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap">{analysis.findings.overall_clinical_notes}</p>
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
