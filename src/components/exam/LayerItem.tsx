import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { getStatusInfo, getLayerLabel } from "./analysisLabels";
import { cn } from "@/lib/utils";

interface LayerItemProps {
  layerKey: string;
  data: {
    status?: string;
    description?: string;
    details?: string;
    reflectivity?: string;
    thickness?: string;
  } | string;
}

export function LayerItem({ layerKey, data }: LayerItemProps) {
  const label = getLayerLabel(layerKey);
  
  // Handle string data
  if (typeof data === "string") {
    return (
      <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
        <div className="flex-1">
          <span className="font-medium text-sm">{label}</span>
          <p className="text-sm text-muted-foreground mt-0.5">{data}</p>
        </div>
      </div>
    );
  }
  
  const status = data.status || "normal";
  const statusInfo = getStatusInfo(status);
  const description = data.description || data.details || "";
  
  const getStatusIcon = (statusColor: string) => {
    if (statusColor.includes("normal")) {
      return <Check className="h-3.5 w-3.5" />;
    }
    if (statusColor.includes("abnormal")) {
      return <AlertCircle className="h-3.5 w-3.5" />;
    }
    if (statusColor.includes("borderline")) {
      return <AlertTriangle className="h-3.5 w-3.5" />;
    }
    return <Info className="h-3.5 w-3.5" />;
  };
  
  return (
    <div className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
      <Badge 
        variant="outline" 
        className={cn(
          "shrink-0 gap-1",
          statusInfo.color
        )}
      >
        {getStatusIcon(statusInfo.color)}
        {statusInfo.label}
      </Badge>
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm">{label}</span>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
        {data.reflectivity && (
          <p className="text-xs text-muted-foreground">
            Refletividade: {data.reflectivity}
          </p>
        )}
        {data.thickness && (
          <p className="text-xs text-muted-foreground">
            Espessura: {data.thickness}
          </p>
        )}
      </div>
    </div>
  );
}
