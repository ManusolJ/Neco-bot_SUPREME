export default interface Meme {
  success: boolean;
  data: Data;
}

export interface Data {
  url: string;
  page_url: string;
}
