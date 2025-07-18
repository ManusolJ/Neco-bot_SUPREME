export interface TriviaREST {
  responseCode: number;
  results: Result[];
}

export interface Result {
  type: string;
  difficulty: string;
  category: string;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}
