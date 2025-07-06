export interface ImageClassification {
  time: number;
  image: Image;
  predictions: Prediction[];
  top: string;
  confidence: number;
  image_path: string;
  prediction_type: string;
}

interface Image {
  width: number;
  height: number;
}

interface Prediction {
  class: string;
  confidence: number;
}
