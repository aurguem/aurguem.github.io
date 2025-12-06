
import { AnalysisResult, PreprocessingType, InputLayout } from '../types';
import { DISEASE_LABELS, KOREAN_LABELS } from '../constants';

// Declare ORT globally (loaded via script tag)
declare const ort: any;

// Helper: Yield execution
const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 10));

// Setup ONNX Environment
const setupBackend = async () => {
  try {
    ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
    ort.env.wasm.simd = true;
    console.log("ONNX Runtime Initialized");
  } catch (err) {
    console.error("ONNX initialization failed:", err);
  }
};

setupBackend();

/**
 * Load ONNX Model from URL (Auto-Download)
 */
export const loadModelFromUrl = async (
  url: string, 
  onProgress?: (progress: number, detail: string) => void
): Promise<any> => {
  try {
    if (onProgress) onProgress(0.01, "서버 연결 중...");
    
    // Fetch with progress
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`모델 다운로드 실패 (${response.status}): ${response.statusText}`);
    }

    // Security Check: Ensure we got a binary file, not a Google Drive HTML warning page
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
        throw new Error("다운로드 링크가 바이너리 파일이 아닌 웹페이지(HTML)를 반환했습니다. (구글 드라이브 바이러스 스캔 경고 등)");
    }

    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    let loaded = 0;
    const reader = response.body?.getReader();
    const chunks = [];

    if (!reader) throw new Error("브라우저가 스트리밍을 지원하지 않습니다.");

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loaded += value.length;

        if (total > 0 && onProgress) {
             // 10% to 80% assigned for download
             const fetchProgress = 0.1 + ((loaded / total) * 0.7); 
             const mb = (loaded / (1024 * 1024)).toFixed(1);
             const totalMb = (total / (1024 * 1024)).toFixed(1);
             onProgress(fetchProgress, `모델 다운로드 중... (${mb}MB / ${totalMb}MB)`);
        } else if (onProgress) {
             onProgress(0.5, `모델 다운로드 중... (${(loaded / (1024 * 1024)).toFixed(1)}MB)`);
        }
    }

    // Combine chunks
    if (onProgress) onProgress(0.85, "바이너리 병합 중...");
    await yieldToUI();
    
    const arrayBuffer = new Uint8Array(loaded);
    let position = 0;
    for (const chunk of chunks) {
        arrayBuffer.set(chunk, position);
        position += chunk.length;
    }
    
    if (onProgress) onProgress(0.9, "ONNX 세션 생성 중...");
    await yieldToUI();

    // Create Inference Session
    const session = await ort.InferenceSession.create(arrayBuffer, {
        executionProviders: ['wasm'],
        graphOptimizationLevel: 'all'
    });

    if (onProgress) onProgress(0.95, "워밍업 (Warmup)...");
    await yieldToUI();

    // Warmup (Try standard NCHW first, catch errors if model expects NHWC)
    try {
        const inputName = session.inputNames[0];
        // Default to [1, 3, 224, 224] for warmup safety
        const dummyInput = new Float32Array(1 * 3 * 224 * 224).fill(0.5);
        const tensor = new ort.Tensor('float32', dummyInput, [1, 3, 224, 224]);
        const feeds = { [inputName]: tensor };
        await session.run(feeds);
    } catch (e) {
        // Ignore warmup errors (likely dimension mismatch which is handled in analyzeImage)
    }

    if (onProgress) onProgress(1.0, "준비 완료!");
    return session;

  } catch (error) {
    console.error("Critical Load Error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(msg);
  }
};

/**
 * Manual Softmax implementation
 */
const softmax = (logits: number[]): number[] => {
    const maxLogit = Math.max(...logits);
    const scores = logits.map(l => Math.exp(l - maxLogit));
    const sumScores = scores.reduce((a, b) => a + b, 0);
    return scores.map(s => s / sumScores);
};

/**
 * Preprocess Image: Resize, Crop, Normalize, Transpose
 */
const preprocessImage = (
    img: HTMLImageElement, 
    preprocessing: PreprocessingType,
    colorSpace: 'RGB' | 'BGR' | 'Grayscale',
    useCenterCrop: boolean,
    layout: InputLayout
): Float32Array => {
    const targetSize = 224;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error("Canvas context failed");

    // 1. Draw Image (Resize / Center Crop)
    if (useCenterCrop) {
        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - minDim) / 2;
        const sy = (img.naturalHeight - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
    } else {
        ctx.drawImage(img, 0, 0, targetSize, targetSize);
    }

    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    const { data } = imageData; // RGBA Uint8ClampedArray

    // 2. Prepare Float32Array
    const float32Data = new Float32Array(3 * targetSize * targetSize);
    
    // ImageNet Constants
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let i = 0; i < targetSize * targetSize; i++) {
        // Source indices (RGBA)
        const i4 = i * 4;
        let r = data[i4];
        let g = data[i4 + 1];
        let b = data[i4 + 2];

        // Color Space Conversion
        if (colorSpace === 'BGR') {
            const temp = r; r = b; b = temp;
        } else if (colorSpace === 'Grayscale') {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = g = b = gray;
        }

        // Normalization Logic
        let rNorm = r; 
        let gNorm = g; 
        let bNorm = b;

        if (preprocessing === 'normalize_0_1') {
            rNorm = r / 255.0;
            gNorm = g / 255.0;
            bNorm = b / 255.0;
        } else if (preprocessing === 'normalize_minus_1_1') {
            rNorm = (r / 127.5) - 1.0;
            gNorm = (g / 127.5) - 1.0;
            bNorm = (b / 127.5) - 1.0;
        } else if (preprocessing === 'normalize_imagenet') {
            rNorm = (r / 255.0 - mean[0]) / std[0];
            gNorm = (g / 255.0 - mean[1]) / std[1];
            bNorm = (b / 255.0 - mean[2]) / std[2];
        } else {
            // raw_0_255
            rNorm = r; gNorm = g; bNorm = b;
        }

        // Assign Data based on Layout
        if (layout === 'NHWC') {
            // Interleaved: R G B R G B ...
            // shape: [1, 224, 224, 3]
            float32Data[i * 3] = rNorm;
            float32Data[i * 3 + 1] = gNorm;
            float32Data[i * 3 + 2] = bNorm;
        } else {
            // NCHW (Planar): RRR... GGG... BBB...
            // shape: [1, 3, 224, 224]
            float32Data[i] = rNorm;
            float32Data[targetSize * targetSize + i] = gNorm;
            float32Data[2 * targetSize * targetSize + i] = bNorm;
        }
    }

    return float32Data;
};

export const analyzeImage = async (
  session: any, // ORT InferenceSession
  imageFile: File,
  preprocessing: PreprocessingType = 'normalize_0_1',
  customLabels?: string[],
  colorSpace: 'RGB' | 'BGR' | 'Grayscale' = 'RGB',
  forceSoftmax: boolean = false,
  useCenterCrop: boolean = false,
  sharpeningFactor: number = 1.0,
  layout: InputLayout = 'NHWC'
): Promise<AnalysisResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const imgElement = new Image();
      imgElement.src = event.target?.result as string;
      imgElement.onload = async () => {
        try {
            // 1. Preprocess
            const inputTensorData = preprocessImage(imgElement, preprocessing, colorSpace, useCenterCrop, layout);
            
            // 2. Create ONNX Tensor
            const inputName = session.inputNames[0];
            const outputName = session.outputNames[0];
            
            const dims = layout === 'NHWC' ? [1, 224, 224, 3] : [1, 3, 224, 224];
            const tensor = new ort.Tensor('float32', inputTensorData, dims);
            
            // 3. Run Inference
            const feeds = { [inputName]: tensor };
            const results = await session.run(feeds);
            
            const outputData = results[outputName].data; // Float32Array
            
            // 4. Post-Process (Softmax & Sharpening)
            let predictionData = Array.from(outputData) as number[];

            const sum = predictionData.reduce((a, b) => a + b, 0);
            if (forceSoftmax || sum < 0.9 || sum > 1.1) {
                predictionData = softmax(predictionData);
            }

            if (sharpeningFactor > 1.0) {
                 const powered = predictionData.map(p => Math.pow(Math.max(0, p), sharpeningFactor));
                 const pSum = powered.reduce((a, b) => a + b, 0);
                 if (pSum > 0) predictionData = powered.map(p => p / pSum);
            }

            // 5. Result Mapping
            let maxProb = -1;
            let maxIndex = 0;
            predictionData.forEach((prob, index) => {
                if (prob > maxProb) {
                  maxProb = prob;
                  maxIndex = index;
                }
            });

            const labelsToUse = (customLabels && customLabels.length > 0) ? customLabels : DISEASE_LABELS;
            const koreanLabelsToUse = (customLabels && customLabels.length > 0) ? customLabels : KOREAN_LABELS;

            const labelIndex = maxIndex < labelsToUse.length ? maxIndex : 0;
            const diagnosis = labelsToUse[labelIndex];
            const koreanLabel = (customLabels && customLabels.length > 0) ? diagnosis : koreanLabelsToUse[labelIndex];

            resolve({
                id: Math.random().toString(36).substr(2, 9),
                fileName: imageFile.name,
                diagnosis: diagnosis as any,
                koreanLabel: koreanLabel,
                confidence: maxProb,
                probabilities: predictionData, 
                timestamp: Date.now(),
                thumbnailUrl: imgElement.src
            });

        } catch (e) {
          reject(e);
        }
      };
      imgElement.onerror = reject;
    };
    reader.readAsDataURL(imageFile);
  });
};
