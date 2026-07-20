import { useState, useRef } from "react";
import { Upload, FileText, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import { validateUpload } from "@/lib/uploadValidator";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface AttachmentsBlockProps {
  images: File[];
  onImagesChange: (files: File[]) => void;
  pdfs: File[];
  onPdfsChange: (files: File[]) => void;
}

export function AttachmentsBlock({
  images,
  onImagesChange,
  pdfs,
  onPdfsChange,
}: AttachmentsBlockProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    const filesArray = Array.from(fileList);

    filesArray.forEach((file) => {
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const contextType = isPdf ? "purchase-pdf" : "purchase-image";
      const currentList = isPdf ? pdfs : images;
      const limit = 2;

      // Validação local usando o uploadValidator
      const validation = validateUpload(file, {
        type: contextType,
        maxFiles: limit,
        currentFiles: currentList.length,
      });

      if (!validation.valid) {
        toast.error(`Erro no arquivo "${file.name}": ${validation.error}`);
        return;
      }

      // Adiciona na lista correspondente
      if (isPdf) {
        onPdfsChange([...pdfs, file]);
        toast.success(`PDF "${file.name}" adicionado.`);
      } else {
        onImagesChange([...images, file]);
        toast.success(`Imagem "${file.name}" adicionada.`);
      }
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
  };

  const handleRemoveImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index);
    onImagesChange(updated);
  };

  const handleRemovePdf = (index: number) => {
    const updated = pdfs.filter((_, i) => i !== index);
    onPdfsChange(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-2">
        <h4 className="text-sm font-semibold text-foreground">Comprovantes & Anexos (Opcional)</h4>
      </div>

      {/* Área de Drag & Drop */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-all gap-2 text-center",
          isDragOver
            ? "border-primary bg-primary/5 text-primary scale-[0.99]"
            : "border-border bg-card/20 hover:bg-card/40 text-muted-foreground hover:text-foreground"
        )}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/png, image/jpeg, image/webp, application/pdf"
          className="hidden"
          multiple
        />

        <div className="p-3 rounded-full bg-background border border-border">
          <Upload className="w-5 h-5 text-primary" />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-semibold">
            Arraste arquivos ou clique para fazer upload
          </p>
          <p className="text-[10px] text-muted-foreground">
            Imagens (Max 2 de até 5MB) • PDFs (Max 2 de até 10MB)
          </p>
        </div>
      </div>

      {/* Lista de Arquivos Carregados */}
      {(images.length > 0 || pdfs.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Imagens */}
          {images.map((file, idx) => (
            <div
              key={`img-${idx}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40 relative"
            >
              <div className="p-2 rounded bg-primary/10 text-primary">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveImage(idx);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}

          {/* PDFs */}
          {pdfs.map((file, idx) => (
            <div
              key={`pdf-${idx}`}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card/40 relative"
            >
              <div className="p-2 rounded bg-blue-500/10 text-blue-500">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{file.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemovePdf(idx);
                }}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Utilitário de cn para simplificar se o import for de local diferente
import { cn } from "@/lib/utils";
