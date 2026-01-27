import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getQualityInfo, getStatusInfo, measurementLabels } from "./analysisLabels";
import { Check, AlertCircle, Eye, ArrowLeftRight, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface BilateralOctNerveDisplayProps {
  analysis: {
    quality_score?: string;
    optic_nerve_analysis?: {
      bilateral?: boolean;
      od?: {
        rnfl?: any;
        optic_disc?: any;
        clinical_notes?: string;
      };
      oe?: {
        rnfl?: any;
        optic_disc?: any;
        clinical_notes?: string;
      };
      comparison?: {
        od_oe_asymmetry?: { significant?: boolean; description?: string };
        rnfl_asymmetry_percentage?: number;
        symmetry?: string;
      };
    };
    biomarkers?: {
      bilateral?: boolean;
      od?: any;
      oe?: any;
    };
    findings?: {
      bilateral?: boolean;
      staging?: string;
      overall_clinical_notes?: string;
    };
    diagnosis?: string[];
    recommendations?: string[];
    risk_classification?: string;
  };
}

function RnflSectorDisplay({ rnfl, eye }: { rnfl: any; eye: string }) {
  if (!rnfl) return null;
  
  const sectors = ['average', 'superior', 'inferior', 'nasal', 'temporal'];
  const sectorLabels: Record<string, string> = {
    average: 'Média',
    superior: 'Superior',
    inferior: 'Inferior',
    nasal: 'Nasal',
    temporal: 'Temporal'
  };
  
  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm flex items-center gap-2">
        <Activity className="h-4 w-4" />
        CFNR (RNFL)
      </h5>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Setor</TableHead>
            <TableHead className="text-right">Espessura</TableHead>
            <TableHead className="text-center">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sectors.map(sector => {
            const data = rnfl[sector];
            if (!data) return null;
            
            const statusInfo = getStatusInfo(data.classification || 'normal');
            
            return (
              <TableRow key={sector}>
                <TableCell className="font-medium">{sectorLabels[sector]}</TableCell>
                <TableCell className="text-right font-mono">
                  {data.value ? `${data.value} ${data.unit || 'μm'}` : '-'}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={cn("text-xs", statusInfo.color)}>
                    {statusInfo.label}
                  </Badge>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      
      {rnfl.defect_pattern && rnfl.defect_pattern !== 'nenhum' && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Padrão de Defeito:</span> {rnfl.defect_pattern}
        </div>
      )}
      
      {rnfl.thinning_location && rnfl.thinning_location.length > 0 && (
        <div className="text-sm text-muted-foreground">
          <span className="font-medium">Afinamento:</span> {rnfl.thinning_location.join(', ')}
        </div>
      )}
    </div>
  );
}

function OpticDiscDisplay({ opticDisc }: { opticDisc: any }) {
  if (!opticDisc) return null;
  
  return (
    <div className="space-y-2">
      <h5 className="font-medium text-sm">Disco Óptico</h5>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {opticDisc.cd_ratio_average && (
          <div className="bg-background/50 rounded p-2">
            <span className="text-muted-foreground">Relação E/D:</span>{' '}
            <span className="font-mono font-medium">
              {opticDisc.cd_ratio_average.value || '-'}
            </span>
            {opticDisc.cd_ratio_average.classification && (
              <Badge 
                variant="outline" 
                className={cn("ml-2 text-xs", getStatusInfo(opticDisc.cd_ratio_average.classification).color)}
              >
                {getStatusInfo(opticDisc.cd_ratio_average.classification).label}
              </Badge>
            )}
          </div>
        )}
        
        {opticDisc.rim_area && (
          <div className="bg-background/50 rounded p-2">
            <span className="text-muted-foreground">Área Rima:</span>{' '}
            <span className="font-mono font-medium">
              {opticDisc.rim_area.value ? `${opticDisc.rim_area.value} mm²` : '-'}
            </span>
          </div>
        )}
        
        <div className="bg-background/50 rounded p-2 col-span-2">
          <span className="text-muted-foreground">Regra ISNT:</span>{' '}
          <Badge 
            variant="outline" 
            className={cn("ml-2 text-xs", opticDisc.isnt_rule?.preserved ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}
          >
            {opticDisc.isnt_rule?.preserved ? "Preservada" : "Violada"}
          </Badge>
          {opticDisc.isnt_rule?.violated_sectors && opticDisc.isnt_rule.violated_sectors.length > 0 && (
            <span className="text-xs text-muted-foreground ml-2">
              ({opticDisc.isnt_rule.violated_sectors.join(', ')})
            </span>
          )}
        </div>
      </div>
      
      {/* Findings */}
      <div className="flex flex-wrap gap-1 mt-2">
        {opticDisc.notch?.present && (
          <Badge variant="destructive" className="text-xs">Notch presente</Badge>
        )}
        {opticDisc.disc_hemorrhage?.present && (
          <Badge variant="destructive" className="text-xs">Hemorragia de disco</Badge>
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

function SingleEyeNerveDisplay({ data, eye }: { data: any; eye: string }) {
  if (!data) return null;
  
  return (
    <div className="space-y-4">
      <RnflSectorDisplay rnfl={data.rnfl} eye={eye} />
      <Separator />
      <OpticDiscDisplay opticDisc={data.optic_disc} />
      
      {data.clinical_notes && (
        <div className="bg-muted/30 rounded-lg p-3 mt-3">
          <p className="text-sm">{data.clinical_notes}</p>
        </div>
      )}
    </div>
  );
}

export function BilateralOctNerveDisplay({ analysis }: BilateralOctNerveDisplayProps) {
  const opticNerve = analysis.optic_nerve_analysis || {};
  const comparison = opticNerve.comparison;
  const qualityInfo = analysis.quality_score ? getQualityInfo(analysis.quality_score) : null;
  
  const isSymmetric = comparison?.symmetry === 'simetrico' || !comparison?.od_oe_asymmetry?.significant;
  
  // Risk classification badge
  const getRiskBadge = (risk: string | undefined) => {
    if (!risk) return null;
    const colors: Record<string, string> = {
      baixo: "bg-green-50 text-green-700 border-green-200",
      moderado: "bg-yellow-50 text-yellow-700 border-yellow-200",
      alto: "bg-red-50 text-red-700 border-red-200"
    };
    return (
      <Badge variant="outline" className={colors[risk] || ""}>
        Risco Glaucomatoso: {risk.charAt(0).toUpperCase() + risk.slice(1)}
      </Badge>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Global Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-primary" />
          <span className="font-semibold">Análise Bilateral - Nervo Óptico</span>
        </div>
        <div className="flex items-center gap-2">
          {qualityInfo && (
            <Badge variant="outline" className={qualityInfo.color}>
              Qualidade: {qualityInfo.label}
            </Badge>
          )}
          {getRiskBadge(analysis.risk_classification)}
        </div>
      </div>
      
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
            <SingleEyeNerveDisplay data={opticNerve.od} eye="od" />
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
            <SingleEyeNerveDisplay data={opticNerve.oe} eye="oe" />
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
              {comparison.rnfl_asymmetry_percentage && (
                <Badge variant="outline" className="text-xs">
                  Assimetria CFNR: {comparison.rnfl_asymmetry_percentage}%
                </Badge>
              )}
            </div>
            
            {comparison.od_oe_asymmetry?.description && (
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-sm">{comparison.od_oe_asymmetry.description}</p>
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
