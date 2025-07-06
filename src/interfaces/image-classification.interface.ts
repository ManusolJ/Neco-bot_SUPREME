export default interface ImageClassification {
  predictions: Prediction[];
  confidence: number;
}

interface Prediction {
  class: string;
  confidence: number;
}
