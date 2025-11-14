export interface TriviaREST {
  response_code: number;
  results: RawResult[];
}

export interface RawResult {
  type: string;
  difficulty: string;
  category: string;
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
}

export interface TriviaQuestion {
  type: string;
  difficulty: string;
  category: string;
  question: string;
  correctAnswer: string;
  incorrectAnswers: string[];
}
