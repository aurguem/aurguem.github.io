
import { DiseaseClass, ModelConfig } from './types';

// Updated to match user's provided index: {'Acne': 0, 'Atopic_Dermatitis': 1, 'Normal': 2, 'Psoriasis': 3, 'Rosacea': 4, 'Seborrheic_Dermatitis': 5}
export const DISEASE_LABELS: string[] = [
  'Acne', 
  'Atopic Dermatitis', 
  'Normal', 
  'Psoriasis', 
  'Rosacea', 
  'Seborrheic Dermatitis'
];

export const KOREAN_LABELS: string[] = [
  '여드름', 
  '아토피', 
  '정상', 
  '건선', 
  '주사', 
  '지루성 피부염'
];

export const MODEL_CONFIG: ModelConfig = {
  inputShape: [224, 224],
  labels: DISEASE_LABELS,
  koreanLabels: KOREAN_LABELS
};

export const CLASS_COLORS: Record<string, string> = {
  '여드름': '#ef4444', // Red-500
  '아토피': '#f97316', // Orange-500
  '정상': '#22c55e',   // Green-500
  '건선': '#64748b',   // Slate-500
  '주사': '#ec4899',   // Pink-500
  '지루성 피부염': '#eab308' // Yellow-500
};

export const CHART_COLORS = [
  '#ef4444', 
  '#f97316', 
  '#22c55e', 
  '#64748b', 
  '#ec4899', 
  '#eab308'
];

// CRITICAL: The requested Model URL with CORS Proxy
export const MODEL_URL = "https://corsproxy.io/?https://drive.google.com/uc?export=download&id=1mp1tRdasHhsxQCGqk5ppeRHaS72gTULK";
