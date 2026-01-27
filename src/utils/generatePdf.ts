import { pdf } from "@react-pdf/renderer";
import React from "react";
import { ExamReportPdf, ReportData } from "@/components/pdf/ExamReportPdf";
import { supabase } from "@/integrations/supabase/client";

export type { ReportData } from "@/components/pdf/ExamReportPdf";

/**
 * Generates a PDF blob from exam report data
 */
export async function generateExamPdf(data: ReportData): Promise<Blob> {
  const element = React.createElement(ExamReportPdf, { data }) as React.ReactElement;
  const blob = await pdf(element).toBlob();
  return blob;
}

/**
 * Downloads a PDF blob as a file
 */
export function downloadPdf(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Uploads a PDF blob to Supabase Storage
 */
export async function uploadPdfToStorage(
  blob: Blob, 
  examId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const fileName = `${examId}/${Date.now()}.pdf`;
    
    const { error: uploadError } = await supabase.storage
      .from("report-pdfs")
      .upload(fileName, blob, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get signed URL for private bucket
    const { data: urlData, error: urlError } = await supabase.storage
      .from("report-pdfs")
      .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

    if (urlError) {
      throw urlError;
    }

    return { url: urlData.signedUrl, error: null };
  } catch (error) {
    console.error("Error uploading PDF:", error);
    return { url: null, error: error as Error };
  }
}

/**
 * Generates a safe filename for the PDF
 */
export function generatePdfFilename(
  patientName: string, 
  examType: string, 
  examDate: string
): string {
  const safeName = patientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9\s]/g, "") // Remove special chars
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .toLowerCase();
  
  const formattedDate = new Date(examDate).toISOString().split("T")[0];
  
  const examTypeLabels: Record<string, string> = {
    oct_macular: "oct_macular",
    oct_nerve: "oct_nervo",
    retinography: "retinografia",
  };
  
  return `laudo_${safeName}_${examTypeLabels[examType] || examType}_${formattedDate}.pdf`;
}

/**
 * Updates the report record with the PDF URL
 */
export async function updateReportPdfUrl(
  examId: string, 
  pdfUrl: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from("reports")
      .update({ pdf_url: pdfUrl })
      .eq("exam_id", examId);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error("Error updating report PDF URL:", error);
    return { error: error as Error };
  }
}

/**
 * Fetches an image URL and converts it to a base64 data URL for PDF embedding
 * This is needed because react-pdf sometimes has issues with remote URLs
 */
export async function fetchImageAsBase64(imageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;
    
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error fetching image:", error);
    return null;
  }
}
