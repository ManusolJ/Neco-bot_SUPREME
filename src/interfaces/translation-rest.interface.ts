export interface TranslationREST {
  data: Data;
}

export interface Data {
  translations: Translation[];
}

export interface Translation {
  translatedText: string;
}
