
export type DiseaseClass = 'Acne' | 'Atopic Dermatitis' | 'Normal' | 'Psoriasis' | 'Rosacea' | 'Seborrheic Dermatitis';

export type PreprocessingType = 'normalize_0_1' | 'normalize_minus_1_1' | 'raw_0_255' | 'normalize_imagenet';

export type InputLayout = 'NCHW' | 'NHWC';

export interface AnalysisResult {
  id: string;
  fileName: string;
  diagnosis: string; // Changed to string to allow custom labels
  koreanLabel: string;
  confidence: number;
  probabilities: number[]; // Stores all 6 probabilities corresponding to labels
  timestamp: number;
  thumbnailUrl?: string;
}

export interface ModelConfig {
  inputShape: [number, number]; // e.g., [224, 224]
  labels: string[];
  koreanLabels: string[];
}

export interface DashboardStats {
  totalScanned: number;
  issuesFound: number; // Excluding 'Normal'
  distribution: Record<string, number>;
}
