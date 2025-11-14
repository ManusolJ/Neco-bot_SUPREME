export default interface DetectionResponse {
  status: "success" | "fail" | "error" | "lowConfidence";
  message: string;
}
