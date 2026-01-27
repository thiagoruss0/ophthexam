import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eraser, Save, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignaturePadProps {
  currentUrl?: string | null;
  onSave: (url: string) => void;
  profileId: string;
  className?: string;
}

export function SignaturePad({
  currentUrl,
  onSave,
  profileId,
  className,
}: SignaturePadProps) {
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDrawing, setHasDrawing] = useState(false);
  const [mode, setMode] = useState<"draw" | "upload">(currentUrl ? "upload" : "draw");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Set drawing style
    ctx.strokeStyle = "#1e3a5f";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Fill with white background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  }, [mode]);

  const getCoords = useCallback(
    (e: React.MouseEvent | React.TouchEvent): { x: number; y: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      return {
        x: clientX - rect.left,
        y: clientY - rect.top,
      };
    },
    []
  );

  const startDrawing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const coords = getCoords(e);
      if (!coords) return;

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    },
    [getCoords]
  );

  const draw = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing) return;

      const coords = getCoords(e);
      if (!coords) return;

      const ctx = canvasRef.current?.getContext("2d");
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasDrawing(true);
    },
    [isDrawing, getCoords]
  );

  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setHasDrawing(false);
  }, []);

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawing) {
      toast({
        title: "Desenhe sua assinatura primeiro",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
          "image/png"
        );
      });

      // Upload to Supabase Storage
      const fileName = `${profileId}/${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get signed URL (private bucket)
      const { data: urlData, error: urlError } = await supabase.storage
        .from("signatures")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (urlError) throw urlError;

      onSave(urlData.signedUrl);
      toast({ title: "Assinatura salva!" });
    } catch (error) {
      console.error("Error saving signature:", error);
      toast({
        title: "Erro ao salvar assinatura",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Use uma imagem PNG ou JPG",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      // Upload to Supabase Storage
      const fileName = `${profileId}/${Date.now()}.${file.name.split(".").pop()}`;
      const { error: uploadError } = await supabase.storage
        .from("signatures")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get signed URL (private bucket)
      const { data: urlData, error: urlError } = await supabase.storage
        .from("signatures")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);

      if (urlError) throw urlError;

      onSave(urlData.signedUrl);
      toast({ title: "Assinatura enviada!" });
    } catch (error) {
      console.error("Error uploading signature:", error);
      toast({
        title: "Erro ao enviar assinatura",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Assinatura Digital</span>
        <div className="flex gap-2">
          <Button
            variant={mode === "draw" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("draw")}
          >
            Desenhar
          </Button>
          <Button
            variant={mode === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("upload")}
          >
            Enviar Imagem
          </Button>
        </div>
      </div>

      {mode === "draw" ? (
        <>
          <div
            className="border rounded-lg overflow-hidden bg-white touch-none"
            style={{ height: 150 }}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              disabled={!hasDrawing || isSaving}
            >
              <Eraser className="h-4 w-4 mr-1" />
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={saveSignature}
              disabled={!hasDrawing || isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar Assinatura
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Desenhe sua assinatura usando o mouse ou touch
          </p>
        </>
      ) : (
        <>
          {currentUrl ? (
            <div className="border rounded-lg p-4 bg-muted/50">
              <img
                src={currentUrl}
                alt="Assinatura atual"
                className="max-h-24 mx-auto"
              />
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                Nenhuma assinatura enviada
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg"
            onChange={handleFileUpload}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1" />
            )}
            {currentUrl ? "Trocar Imagem" : "Enviar Imagem"}
          </Button>

          <p className="text-xs text-muted-foreground">
            PNG ou JPG com fundo transparente ou branco. Recomendado 300x100px.
          </p>
        </>
      )}
    </div>
  );
}
