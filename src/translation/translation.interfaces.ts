export interface TranslateTextResponse {
  translation: string;
}

export interface TranslateJsonResponse<T = any> {
  data: T;
}