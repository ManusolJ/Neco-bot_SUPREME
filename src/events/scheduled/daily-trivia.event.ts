import { Client, PollLayoutType } from "discord.js";
import cron from "node-cron";
import he from "he";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";
import chaosBuilder from "@utils/build-chaos.util";
import { RawResult, TriviaQuestion, TriviaREST } from "@interfaces/trivia-rest.interface";
import { TranslationREST } from "@interfaces/translation-rest.interface";

// API configuration
const TRIVIA_URL = process.env.TRIVIA_URL;
const TRANSLATE_URL = process.env.TRANSLATION_URL;
const TRANSLATE_API_KEY = process.env.TRANSLATION_API_KEY;

// Discord configuration
const GUILD_ID = process.env.GUILD_ID;
const MESSAGE_CHANNEL_ID = process.env.NECO_MESSAGES_CHANNEL;

// Trivia settings
const AMOUNT_OF_QUESTIONS = "1";
const WAIT_TIME_BETWEEN_MESSAGES = 3000;
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 4;

/**
 * Daily trivia event handler
 * Posts a translated trivia question and rewards correct answers
 *
 * @param client Discord client instance
 *
 * @returns {void}
 */
export default function dailyTrivia(client: Client): void {
  client.once("ready", () => {
    // Schedule daily at 5:30 PM Madrid time
    cron.schedule("30 17 * * *", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

/**
 * Executes the daily trivia workflow
 *
 * @param client Discord client instance
 *
 * @returns {Promise<void>}
 */
async function scheduledTask(client: Client): Promise<void> {
  try {
    // Validate environment variables
    if (!TRIVIA_URL || !GUILD_ID || !MESSAGE_CHANNEL_ID || !TRANSLATE_URL || !TRANSLATE_API_KEY) {
      throw new Error("Missing environment variables.");
    }

    const necoService = await NecoService.getInstance();

    // Validate and fetch guild
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
      throw new Error("Guild retrieval failed");
    }

    // Validate and fetch channel
    const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      throw new Error("Invalid message channel or not text-based");
    }

    const messageService = new MessageService(channel);

    // Fetch and validate trivia question
    const triviaQuestion: TriviaREST | null = await fetchTriviaQuestion();
    if (!triviaQuestion || !triviaQuestion.results || triviaQuestion.results.length === 0) {
      throw new Error("Error fetching trivia qusetion.");
    }

    const rawQuestion: RawResult = triviaQuestion.results[0];

    // Convert raw question to structured format
    const question: TriviaQuestion = {
      question: rawQuestion.question,
      correctAnswer: rawQuestion.correct_answer,
      incorrectAnswers: rawQuestion.incorrect_answers,
      type: rawQuestion.type,
      difficulty: rawQuestion.difficulty,
      category: rawQuestion.category,
    };

    if (!question || !question.question || !question.correctAnswer || !question.incorrectAnswers) {
      throw new Error("Invalid trivia question data.");
    }

    // ! TRANSLATION DISABLED FOR NOW DUE TO API LIMITS
    // Sanitize HTML entities and translate to Spanish
    // const sanitizedQuestion = sanitizeQuestion(question);

    // if (!sanitizedQuestion) {
    //   throw new Error("Error sanitizing trivia question.");
    // }

    // Translate question and answers
    // const translatedQuestion = await translateQuestion(sanitizedQuestion);

    // if (!translatedQuestion) {
    //   throw new Error("Error translating trivia question.");
    // }

    // Helper for timed delays
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    // Announce trivia sequence
    const startMsg = `NYAHAAAAA! Ahora toca trivia! Vamos a ver que pregunta me invento hoy...`;
    await messageService.send(startMsg);
    await delay(WAIT_TIME_BETWEEN_MESSAGES);

    const questionType = question.type === "multiple" ? "options" : "true/false";

    // const difficultyDisplayLevels: Record<string, string> = {
    //   easy: "facil",
    //   medium: "medio",
    //   hard: "dificil",
    // };

    const difficultyLevel = question.difficulty || "unknown";

    // Announce question type and difficulty
    const questionMsg = `Veamos... Hoy voy a hacer un pregunta de trivia tipo...${questionType} y de dificultad ${difficultyLevel}.`;
    await messageService.send(questionMsg);
    await delay(WAIT_TIME_BETWEEN_MESSAGES);

    // Create poll with shuffled answers
    const shuffledAnswers = shuffleAnswers([question.correctAnswer, ...question.incorrectAnswers]);

    const pollMsg = await messageService.send({
      poll: {
        question: { text: question.question },
        answers: shuffledAnswers.map((item) => ({ text: item, emoji: "" })),
        allowMultiselect: false,
        duration: 1, // 1 hour duration
        layoutType: PollLayoutType.Default,
      },
    });

    const poll = pollMsg.poll;

    if (!poll || !poll.expiresTimestamp) {
      throw new Error("Poll creation failed.");
    }

    // Schedule poll closing
    const msUntilExpiry = poll.expiresTimestamp - Date.now();
    const buffer = 500; // 500ms buffer

    setTimeout(async () => {
      const endMsg = `La trivia ha terminado! Veamos los resultados...`;
      await messageService.send(endMsg);
      await delay(WAIT_TIME_BETWEEN_MESSAGES);

      // Identify correct answer
      const correct = poll.answers.find((a) => a.text === question.correctAnswer);
      if (!correct) {
        await messageService.sendError("NYAHAAAAA! No pude encontrar la respuesta!");
        throw new Error("Correct answer not found in poll.");
      }

      const correctAnswerMsg = `La respuesta correcta era: ${question.correctAnswer}.`;
      await messageService.send(correctAnswerMsg);

      // Process winners and losers
      const winners = await correct.fetchVoters();
      const winnerCount = winners.size;

      const loserCollections = await Promise.all(
        poll.answers.filter((a) => a.text !== question.correctAnswer).map((a) => a.fetchVoters())
      );

      const losers = loserCollections.flatMap((c) => Array.from(c.values())).filter((user) => !winners.has(user.id));

      const loserCount = losers.length;

      const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);

      // Handle different outcome scenarios
      if (winnerCount === 0 && loserCount === 0) {
        // No votes at all
        const noVotesMsg = "Nadie ha votado??!?!? Que desastre! -10000 puntos para todos >:3";
        return await messageService.send(noVotesMsg);
      } else if (winnerCount === 0) {
        // No winners, only losers
        const noWinnersMsg = `Nadie ha acertado, lmao. Bastante patetico. En fin, no pasa nada. Lavaos el pilk del cerebro e intendadlo mañana.`;
        return await messageService.send(noWinnersMsg);
      } else if (winnerCount > 0 && loserCount == 0) {
        // All participants are winners
        const allWinnersMsg = `Todos han acertado! Increible! No os preocupeis, todos recibireis una bonita recompensa de ${reward} puntos.`;
        await messageService.send(allWinnersMsg);

        for (const [userId, user] of winners) {
          await necoService.increaseAgentBalance(userId, reward);
        }
      } else {
        // Announce winners and distribute rewards
        const winnerNames = Array.from(winners.values())
          .map((u) => u.username)
          .join(", ");
        const congratsMsg = `Los ganadores son: ${winnerNames}! Felicidades! Para vosotros hay ${reward} puntos por ser taaaaan listos!`;
        await messageService.send(congratsMsg);

        for (const [userId, user] of winners) {
          await necoService.increaseAgentBalance(userId, reward);
        }

        // Mock losers
        const loserNames = losers.map((u) => u.username).join(", ");
        const loserMsg = `Los perdedores son: ${loserNames}. Para vosotros... Una colleja en las bolas. Por bobos.`;
        return await messageService.send(loserMsg);
      }
    }, msUntilExpiry + buffer);
  } catch (error) {
    console.error("Error in daily trivia task:", error);
  }
}

/** Fetches random trivia question from API */
async function fetchTriviaQuestion(): Promise<TriviaREST | null> {
  // Configure question parameters
  const types = ["multiple", "boolean"];
  const difficulties = ["easy", "medium", "hard"];

  const params = new URLSearchParams({
    amount: AMOUNT_OF_QUESTIONS,
    difficulty: difficulties[Math.floor(Math.random() * difficulties.length)],
    type: types[Math.floor(Math.random() * types.length)],
  });

  try {
    const response = await fetch(`${TRIVIA_URL}?${params}`);
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error("Trivia API error:", error);
    return null;
  }
}

// !  Translation currently disabled due to API limits
/** Translates question and answers to Spanish */
async function translateQuestion(question: TriviaQuestion): Promise<TriviaQuestion | null> {
  const data = new URLSearchParams();
  data.append("target", "es");
  data.append("source", "en");
  data.append("format", "text");
  data.append("key", TRANSLATE_API_KEY);

  // Add all text components to translation request
  [question.question, question.correctAnswer, ...question.incorrectAnswers].forEach((str) => data.append("q", str));

  try {
    const response = await fetch(TRANSLATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: data,
    });

    if (!response.ok) throw new Error(`Translation failed: ${response.statusText}`);

    const {
      data: { translations },
    }: TranslationREST = await response.json();

    if (!translations || translations.length < 3) {
      throw new Error("Incomplete translation");
    }

    return {
      ...question,
      question: translations[0].translatedText.toLowerCase(),
      correctAnswer: translations[1].translatedText.toLowerCase(),
      incorrectAnswers: translations.slice(2).map((t) => t.translatedText.toLowerCase()),
    };
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}

/** Decodes HTML entities in question data */
function sanitizeQuestion(question: TriviaQuestion): TriviaQuestion {
  return {
    ...question,
    question: he.decode(question.question),
    correctAnswer: he.decode(question.correctAnswer),
    incorrectAnswers: question.incorrectAnswers.map((ans) => he.decode(ans)),
  };
}

/** Randomizes answer order */
function shuffleAnswers(answers: string[]): string[] {
  const shuffled = [...answers];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
