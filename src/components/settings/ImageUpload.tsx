import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  bucket: string;
  currentUrl?: string | null;
  onUpload: (url: string) => void;
  onRemove?: () => void;
  maxSizeKB?: number;
  accept?: string;
  aspectRatio?: string;
  className?: string;
  label?: string;
  description?: string;
}

export function ImageUpload({
  bucket,
  currentUrl,
  onUpload,
  onRemove,
  maxSizeKB = 500,
  accept = "image/png, image/jpeg, image/webp",
  aspectRatio = "1/1",
  className,
  label = "Upload de imagem",
  description = "PNG, JPG ou WebP",
}: ImageUploadProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentUrl || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions (max 800px while maintaining aspect ratio)
        const maxDim = 800;
        let { width, height } = img;

        if (width > height && width > maxDim) {
          height = (height / width) * maxDim;
          width = maxDim;
        } else if (height > maxDim) {
          width = (width / height) * maxDim;
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Failed to compress image"));
            }
          },
          "image/jpeg",
          0.8
        );
      };

      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleFile = useCallback(
    async (file: File) => {
      // Validate file type
      const validTypes = ["image/png", "image/jpeg", "image/webp"];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Use PNG, JPG ou WebP",
          variant: "destructive",
        });
        return;
      }

      // Check file size
      if (file.size > maxSizeKB * 1024 * 10) {
        // Allow 10x for compression
        toast({
          title: "Arquivo muito grande",
          description: `O arquivo deve ter menos de ${maxSizeKB * 10}KB antes da compressão`,
          variant: "destructive",
        });
        return;
      }

      setIsUploading(true);

      try {
        // Compress the image
        const compressedBlob = await compressImage(file);

        // Check compressed size
        if (compressedBlob.size > maxSizeKB * 1024) {
          toast({
            title: "Imagem muito grande",
            description: `Após compressão, a imagem ainda é maior que ${maxSizeKB}KB. Use uma imagem menor.`,
            variant: "destructive",
          });
          setIsUploading(false);
          return;
        }

        // Generate unique filename
        const ext = "jpg"; // Always save as jpg after compression
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, compressedBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);

        setPreview(urlData.publicUrl);
        onUpload(urlData.publicUrl);

        toast({ title: "Imagem enviada!" });
      } catch (error) {
        console.error("Upload error:", error);
        toast({
          title: "Erro no upload",
          description: "Tente novamente",
          variant: "destructive",
        });
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, maxSizeKB, onUpload, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = async () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
    onRemove?.();
  };

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {preview && onRemove && (
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            <X className="h-4 w-4 mr-1" />
            Remover
          </Button>
        )}
      </div>

      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg transition-colors cursor-pointer overflow-hidden",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          isUploading && "pointer-events-none opacity-50"
        )}
        style={{ aspectRatio }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
        />

        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-contain bg-muted"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4">
            {isUploading ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-8 w-8 mb-2" />
                <span className="text-sm text-center">
                  Arraste uma imagem ou clique para selecionar
                </span>
              </>
            )}
          </div>
        )}

        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {description}. Máximo {maxSizeKB}KB após compressão.
      </p>
    </div>
  );
}
