import { supabase } from "@/integrations/supabase/client";

// ============= IMAGE METADATA =============

export interface ImageMetadata {
  imageUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
  fileSize: number | null;
  quality: string | null;
  eye: "od" | "oe" | "both";
  sequence: number | null;
  augmentations?: ImageAugmentation[];
}

export interface ImageAugmentation {
  type: "rotation" | "flip" | "brightness" | "contrast" | "noise" | "crop";
  parameters: Record<string, number | string | boolean>;
}

// ============= GROUND TRUTH LABELS =============

export interface GroundTruthLabel {
  examId: string;
  imageUrl: string;
  eye: "od" | "oe";
  
  // Classification labels
  primaryDiagnosis: string | null;
  secondaryDiagnoses: string[];
  confirmedByDoctor: boolean;
  
  // Doctor corrections
  originalAiDiagnosis: string[];
  diagnosisAdded: string[];
  diagnosisRemoved: string[];
  
  // Quality assessment
  imageQuality: string | null;
  qualityCorrect: boolean;
  
  // Pathology annotations
  pathologyTags: string[];
  caseDifficulty: "easy" | "medium" | "hard" | null;
  
  // Bounding boxes for detection tasks
  boundingBoxes?: BoundingBox[];
  
  // Segmentation masks
  segmentationMasks?: SegmentationMask[];
}

export interface BoundingBox {
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence?: number;
}

export interface SegmentationMask {
  label: string;
  maskUrl?: string;
  polygonPoints?: Array<{ x: number; y: number }>;
}

// ============= DATASET SPLIT =============

export interface DatasetSplit {
  trainSet: MLTrainingRecord[];
  validationSet: MLTrainingRecord[];
  testSet: MLTrainingRecord[];
  splitRatios: { train: number; validation: number; test: number };
  stratifiedBy: string | null;
  totalRecords: number;
  splitDate: string;
}

export interface MLTrainingRecord {
  examId: string;
  examType: "oct_macular" | "oct_nerve" | "retinography";
  images: ImageMetadata[];
  groundTruth: GroundTruthLabel;
  aiAnalysis: Record<string, unknown> | null;
  teachingNotes: string | null;
  overallRating: number | null;
  isReferenceCase: boolean;
}

// ============= EXPORT FORMATS =============

export interface COCOExport {
  info: {
    description: string;
    version: string;
    year: number;
    contributor: string;
    date_created: string;
  };
  licenses: Array<{ id: number; name: string; url: string }>;
  images: COCOImage[];
  annotations: COCOAnnotation[];
  categories: COCOCategory[];
}

export interface COCOImage {
  id: number;
  file_name: string;
  width: number;
  height: number;
  exam_id: string;
  eye: string;
}

export interface COCOAnnotation {
  id: number;
  image_id: number;
  category_id: number;
  bbox?: [number, number, number, number];
  segmentation?: number[][];
  area?: number;
  iscrowd: number;
}

export interface COCOCategory {
  id: number;
  name: string;
  supercategory: string;
}

export interface YOLOExport {
  images: Array<{
    imagePath: string;
    labelPath: string;
  }>;
  classes: string[];
  dataYaml: string;
}

export interface CSVExportRow {
  exam_id: string;
  image_url: string;
  exam_type: string;
  eye: string;
  primary_diagnosis: string;
  secondary_diagnoses: string;
  pathology_tags: string;
  case_difficulty: string;
  image_quality: string;
  is_reference_case: boolean;
  overall_rating: number | null;
  doctor_confirmed: boolean;
}

// ============= FETCH FUNCTIONS =============

/**
 * Fetch complete ML training records with all metadata
 */
export async function fetchMLTrainingRecords(
  options: {
    minRating?: number;
    examTypes?: Array<"oct_macular" | "oct_nerve" | "retinography">;
    onlyReferenceCases?: boolean;
    limit?: number;
  } = {}
): Promise<MLTrainingRecord[]> {
  const { minRating = 0, examTypes, onlyReferenceCases = false, limit = 1000 } = options;

  let query = supabase
    .from("ai_feedback")
    .select(`
      exam_id,
      diagnosis_correct,
      diagnosis_added,
      diagnosis_removed,
      pathology_tags,
      case_difficulty,
      overall_rating,
      teaching_notes,
      is_reference_case,
      quality_feedback,
      quality_correct,
      exams!inner(
        exam_type,
        eye,
        exam_images(image_url, eye, sequence),
        ai_analysis(
          findings,
          biomarkers,
          measurements,
          diagnosis,
          recommendations,
          quality_score,
          raw_response
        )
      )
    `)
    .gte("overall_rating", minRating)
    .limit(limit);

  if (onlyReferenceCases) {
    query = query.eq("is_reference_case", true);
  }

  if (examTypes && examTypes.length > 0) {
    query = query.in("exams.exam_type", examTypes);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).map((item: any) => ({
    examId: item.exam_id,
    examType: item.exams?.exam_type,
    images: (item.exams?.exam_images || []).map((img: any) => ({
      imageUrl: img.image_url,
      width: null,
      height: null,
      format: extractFormat(img.image_url),
      fileSize: null,
      quality: item.exams?.ai_analysis?.[0]?.quality_score || null,
      eye: img.eye,
      sequence: img.sequence,
    })),
    groundTruth: {
      examId: item.exam_id,
      imageUrl: item.exams?.exam_images?.[0]?.image_url || "",
      eye: item.exams?.eye || "od",
      primaryDiagnosis: item.diagnosis_correct?.[0] || null,
      secondaryDiagnoses: item.diagnosis_correct?.slice(1) || [],
      confirmedByDoctor: item.overall_rating !== null,
      originalAiDiagnosis: item.exams?.ai_analysis?.[0]?.diagnosis || [],
      diagnosisAdded: item.diagnosis_added || [],
      diagnosisRemoved: item.diagnosis_removed || [],
      imageQuality: item.exams?.ai_analysis?.[0]?.quality_score || null,
      qualityCorrect: item.quality_correct === "correct",
      pathologyTags: item.pathology_tags || [],
      caseDifficulty: item.case_difficulty,
      boundingBoxes: [],
      segmentationMasks: [],
    },
    aiAnalysis: item.exams?.ai_analysis?.[0] || null,
    teachingNotes: item.teaching_notes,
    overallRating: item.overall_rating,
    isReferenceCase: item.is_reference_case || false,
  }));
}

/**
 * Split dataset into train/validation/test sets with optional stratification
 */
export async function splitDataset(
  records: MLTrainingRecord[],
  options: {
    trainRatio?: number;
    validationRatio?: number;
    testRatio?: number;
    stratifyBy?: "examType" | "diagnosis" | "difficulty";
    seed?: number;
  } = {}
): Promise<DatasetSplit> {
  const {
    trainRatio = 0.7,
    validationRatio = 0.15,
    testRatio = 0.15,
    stratifyBy,
    seed = 42,
  } = options;

  // Validate ratios
  const totalRatio = trainRatio + validationRatio + testRatio;
  if (Math.abs(totalRatio - 1) > 0.001) {
    throw new Error(`Split ratios must sum to 1.0, got ${totalRatio}`);
  }

  // Seeded random shuffle
  const shuffled = seededShuffle([...records], seed);

  let trainSet: MLTrainingRecord[] = [];
  let validationSet: MLTrainingRecord[] = [];
  let testSet: MLTrainingRecord[] = [];

  if (stratifyBy) {
    // Stratified split
    const groups = groupBy(shuffled, (r) => getStratifyKey(r, stratifyBy));
    
    for (const group of Object.values(groups)) {
      const trainCount = Math.floor(group.length * trainRatio);
      const valCount = Math.floor(group.length * validationRatio);
      
      trainSet.push(...group.slice(0, trainCount));
      validationSet.push(...group.slice(trainCount, trainCount + valCount));
      testSet.push(...group.slice(trainCount + valCount));
    }
  } else {
    // Simple random split
    const trainCount = Math.floor(shuffled.length * trainRatio);
    const valCount = Math.floor(shuffled.length * validationRatio);
    
    trainSet = shuffled.slice(0, trainCount);
    validationSet = shuffled.slice(trainCount, trainCount + valCount);
    testSet = shuffled.slice(trainCount + valCount);
  }

  return {
    trainSet,
    validationSet,
    testSet,
    splitRatios: { train: trainRatio, validation: validationRatio, test: testRatio },
    stratifiedBy: stratifyBy || null,
    totalRecords: records.length,
    splitDate: new Date().toISOString(),
  };
}

// ============= EXPORT FUNCTIONS =============

/**
 * Export dataset in COCO format for object detection/segmentation
 */
export function exportToCOCO(records: MLTrainingRecord[]): COCOExport {
  const categories: COCOCategory[] = [];
  const categoryMap = new Map<string, number>();
  let categoryId = 1;

  // Collect all unique diagnoses as categories
  records.forEach((record) => {
    const diagnoses = [
      record.groundTruth.primaryDiagnosis,
      ...record.groundTruth.secondaryDiagnoses,
    ].filter(Boolean);

    diagnoses.forEach((diag) => {
      if (diag && !categoryMap.has(diag)) {
        categoryMap.set(diag, categoryId);
        categories.push({
          id: categoryId,
          name: diag,
          supercategory: record.examType,
        });
        categoryId++;
      }
    });
  });

  const images: COCOImage[] = [];
  const annotations: COCOAnnotation[] = [];
  let imageId = 1;
  let annotationId = 1;

  records.forEach((record) => {
    record.images.forEach((img) => {
      images.push({
        id: imageId,
        file_name: img.imageUrl.split("/").pop() || `image_${imageId}.jpg`,
        width: img.width || 1024,
        height: img.height || 1024,
        exam_id: record.examId,
        eye: img.eye,
      });

      // Create annotation for each diagnosis
      const diagnoses = [
        record.groundTruth.primaryDiagnosis,
        ...record.groundTruth.secondaryDiagnoses,
      ].filter(Boolean);

      diagnoses.forEach((diag) => {
        if (diag) {
          annotations.push({
            id: annotationId++,
            image_id: imageId,
            category_id: categoryMap.get(diag) || 0,
            iscrowd: 0,
          });
        }
      });

      imageId++;
    });
  });

  return {
    info: {
      description: "Ophthalmology Exam Dataset",
      version: "1.0",
      year: new Date().getFullYear(),
      contributor: "OphthExam AI Training",
      date_created: new Date().toISOString(),
    },
    licenses: [
      {
        id: 1,
        name: "Medical Research License",
        url: "",
      },
    ],
    images,
    annotations,
    categories,
  };
}

/**
 * Export dataset in YOLO format for object detection
 */
export function exportToYOLO(records: MLTrainingRecord[]): YOLOExport {
  const classes: string[] = [];
  const classMap = new Map<string, number>();

  // Collect all unique diagnoses as classes
  records.forEach((record) => {
    const diagnoses = [
      record.groundTruth.primaryDiagnosis,
      ...record.groundTruth.secondaryDiagnoses,
    ].filter(Boolean);

    diagnoses.forEach((diag) => {
      if (diag && !classMap.has(diag)) {
        classMap.set(diag, classes.length);
        classes.push(diag);
      }
    });
  });

  const images = records.flatMap((record, recordIdx) =>
    record.images.map((img, imgIdx) => {
      const imagePath = img.imageUrl;
      const labelPath = `labels/${record.examId}_${imgIdx}.txt`;
      
      return { imagePath, labelPath };
    })
  );

  // Generate data.yaml content
  const dataYaml = `
# YOLO Dataset Configuration
# Generated: ${new Date().toISOString()}

train: ./images/train
val: ./images/val
test: ./images/test

nc: ${classes.length}
names: [${classes.map((c) => `'${c}'`).join(", ")}]
`.trim();

  return {
    images,
    classes,
    dataYaml,
  };
}

/**
 * Export dataset as CSV for tabular ML models
 */
export function exportToCSV(records: MLTrainingRecord[]): CSVExportRow[] {
  const rows: CSVExportRow[] = [];

  records.forEach((record) => {
    record.images.forEach((img) => {
      rows.push({
        exam_id: record.examId,
        image_url: img.imageUrl,
        exam_type: record.examType,
        eye: img.eye,
        primary_diagnosis: record.groundTruth.primaryDiagnosis || "",
        secondary_diagnoses: record.groundTruth.secondaryDiagnoses.join(";"),
        pathology_tags: record.groundTruth.pathologyTags.join(";"),
        case_difficulty: record.groundTruth.caseDifficulty || "",
        image_quality: record.groundTruth.imageQuality || "",
        is_reference_case: record.isReferenceCase,
        overall_rating: record.overallRating,
        doctor_confirmed: record.groundTruth.confirmedByDoctor,
      });
    });
  });

  return rows;
}

/**
 * Convert CSV rows to CSV string
 */
export function csvToString(rows: CSVExportRow[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]) as (keyof CSVExportRow)[];
  const headerLine = headers.join(",");
  
  const dataLines = rows.map((row) =>
    headers
      .map((key) => {
        const value = row[key];
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      })
      .join(",")
  );

  return [headerLine, ...dataLines].join("\n");
}

/**
 * Get dataset statistics for ML training
 */
export function getDatasetStatistics(records: MLTrainingRecord[]): {
  totalRecords: number;
  byExamType: Record<string, number>;
  byDifficulty: Record<string, number>;
  diagnosisDistribution: Record<string, number>;
  avgRating: number;
  referenceCasesCount: number;
  totalImages: number;
} {
  const byExamType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const diagnosisDistribution: Record<string, number> = {};
  let totalRating = 0;
  let ratingCount = 0;
  let referenceCasesCount = 0;
  let totalImages = 0;

  records.forEach((record) => {
    // Count by exam type
    byExamType[record.examType] = (byExamType[record.examType] || 0) + 1;

    // Count by difficulty
    const difficulty = record.groundTruth.caseDifficulty || "unknown";
    byDifficulty[difficulty] = (byDifficulty[difficulty] || 0) + 1;

    // Count diagnoses
    const diagnoses = [
      record.groundTruth.primaryDiagnosis,
      ...record.groundTruth.secondaryDiagnoses,
    ].filter(Boolean);
    
    diagnoses.forEach((diag) => {
      if (diag) {
        diagnosisDistribution[diag] = (diagnosisDistribution[diag] || 0) + 1;
      }
    });

    // Rating
    if (record.overallRating !== null) {
      totalRating += record.overallRating;
      ratingCount++;
    }

    // Reference cases
    if (record.isReferenceCase) {
      referenceCasesCount++;
    }

    // Images
    totalImages += record.images.length;
  });

  return {
    totalRecords: records.length,
    byExamType,
    byDifficulty,
    diagnosisDistribution,
    avgRating: ratingCount > 0 ? totalRating / ratingCount : 0,
    referenceCasesCount,
    totalImages,
  };
}

// ============= HELPER FUNCTIONS =============

function extractFormat(url: string): string | null {
  const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match ? match[1].toLowerCase() : null;
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const result = [...array];
  let currentSeed = seed;

  const random = () => {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    return currentSeed / 233280;
  };

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function groupBy<T>(array: T[], keyFn: (item: T) => string): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

function getStratifyKey(
  record: MLTrainingRecord,
  stratifyBy: "examType" | "diagnosis" | "difficulty"
): string {
  switch (stratifyBy) {
    case "examType":
      return record.examType;
    case "diagnosis":
      return record.groundTruth.primaryDiagnosis || "unknown";
    case "difficulty":
      return record.groundTruth.caseDifficulty || "unknown";
    default:
      return "default";
  }
}
