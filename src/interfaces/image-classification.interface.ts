export default interface ImageClassification {
  id: string;
  time: number;
  image: Image;
  prediction: Prediction;
}

interface Image {
  width: number;
  height: number;
}

interface Prediction {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  class: string;
  class_id: number;
  detection_id: string;
}
