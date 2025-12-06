
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

export const DISEASE_DESCRIPTIONS: string[] = [
  "면포(블랙헤드/화이트헤드), 붉은 구진, 농포(고름), 결절 등이 관찰되며 피지 과다 분비로 인한 번들거림이 특징적입니다.", // Acne
  "심한 건조증, 피부가 거칠고 두꺼워짐(태선화), 긁은 상처 자국 및 붉은 발진이 관찰됩니다.", // Atopic Dermatitis
  "특이적인 병변이 관찰되지 않으며, 피부 톤이 대체로 균일하고 매끄러운 상태입니다.", // Normal
  "경계가 뚜렷한 붉은 판 위에 '은백색의 두꺼운 각질(인설)'이 덮여 있어 피부가 두꺼워 보입니다.", // Psoriasis
  "안면 중앙부(코, 양 뺨)의 지속적인 홍반(붉은기), 모세혈관 확장(실핏줄) 및 화끈거림이 동반된 붉은 구진이 관찰됩니다.", // Rosacea
  "붉은 병변과 그 위에 덮인 '노랗고 기름진 각질(인설)'이 관찰됩니다." // Seborrheic Dermatitis
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