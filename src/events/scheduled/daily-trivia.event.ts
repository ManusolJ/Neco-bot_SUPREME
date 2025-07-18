import { Client, Poll, PollLayoutType } from "discord.js";
import cron from "node-cron";
import he from "he";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";
import { Result, TriviaREST } from "@interfaces/trivia-rest.interface";
import { TranslationREST } from "@interfaces/translation-rest.interface";
import chaosBuilder from "@utils/build-chaos.util";

// API configuration
const TRIVIA_URL = process.env.TRIVIA_URL;
const TRANSLATE_URL = process.env.TRANSLATION_URL;
const TRANSLATE_API_KEY = process.env.TRANSLATION_API_KEY;

// Discord configuration
const GUILD_ID = process.env.GUILD_ID;
const MESSAGE_CHANNEL_ID = process.env.NECO_MESSAGES_CHANNEL;

// Trivia settings
const AMOUNT_OF_QUESTIONS = "1";
const WAIT_TIME_BETWEEN_MESSAGES = 2000;
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 4;

// Known issues and TODOs (commented out for production)
// ...

/**
 * Daily trivia event handler
 * Posts a translated trivia question and rewards correct answers
 */
export default function dailyTrivia(client: Client): void {
  client.once("ready", () => {
    // Schedule daily at 5:30 PM Madrid time
    cron.schedule("30 18 * * *", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

/**
 * Executes the daily trivia workflow
 * - Fetches question
 * - Translates to Spanish
 * - Creates poll
 * - Rewards winners
 */
async function scheduledTask(client: Client): Promise<void> {
  // Validate environment variables
  if (!TRIVIA_URL || !GUILD_ID || !MESSAGE_CHANNEL_ID || !TRANSLATE_URL || !TRANSLATE_API_KEY) {
    console.error("Undefined variables in the environment.");
    return;
  }

  const necoService = await NecoService.getInstance();
  const guild = client.guilds.cache.get(GUILD_ID);

  if (!guild) {
    console.error("Error retrieving the guild.");
    return;
  }

  const channel = guild.channels.cache.get(MESSAGE_CHANNEL_ID);
  if (!channel || !channel.isTextBased()) {
    console.error("Error retrieving the message channel.");
    return;
  }

  const messageService = new MessageService(channel);

  // Fetch and validate trivia question
  const triviaQuestion: TriviaREST | null = await fetchTriviaQuestion();

  if (!triviaQuestion || !triviaQuestion.results || triviaQuestion.results.length === 0) {
    console.error("Error fetching trivia question.");
    return;
  }

  const question = triviaQuestion.results[0];
  if (!question ||!question.question || !question.correct_answer || !question.incorrect_answers) {
    console.error("Invalid trivia question format.");
    return;
  }

  // Sanitize HTML entities and translate to Spanish
  const sanitizedQuestion = sanitizeQuestion(question);
  if (!sanitizedQuestion) {
    console.error("Error sanitizing trivia question.");
    return;
  }

  const translatedQuestion = await translateQuestion(sanitizedQuestion);
  if (!translatedQuestion) {
    console.error("Error translating trivia question.");
    return;
  }

  // Helper for timed delays
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Announce trivia sequence
  await messageService.send("NYAHAHAHA!!! Hora de una preguntita...");
  await delay(WAIT_TIME_BETWEEN_MESSAGES);

  const questionType = translatedQuestion.type === "multiple" ? "opciones" : "verdadero o falso";

  const difficultyDisplayLevels: Record<string, string> = {
    easy: "facil",
    medium: "medio",
    hard: "dificil",
  };

  const difficultyLevel = difficultyDisplayLevels[translatedQuestion.difficulty] || "desconocido";

  await messageService.send(
    `Veamos... Hoy voy a hacer un pregunta de trivia tipo...${questionType} y de dificultad ${difficultyLevel}.`
  );
  await delay(WAIT_TIME_BETWEEN_MESSAGES);

  // Create poll with shuffled answers
  const shuffledAnswers = shuffleAnswers([translatedQuestion.correct_answer, ...translatedQuestion.incorrect_answers]);

  const pollMsg = await messageService.send({
    poll: {
      question: { text: translatedQuestion.question },
      answers: shuffledAnswers.map((item) => ({ text: item, emoji: "" })),
      allowMultiselect: false,
      duration: 1, // 1 hour duration
      layoutType: PollLayoutType.Default,
    },
  });

  const poll = pollMsg.poll;
  if (!poll || poll.expiresTimestamp) {
    console.error("Poll setup failed");
    return;
  }

  // Schedule poll closing
  const msUntilExpiry = poll.expiresTimestamp - Date.now();
  const buffer = 500; // 500ms buffer

  setTimeout(async () => {
    await poll.end();
    await messageService.send("Se acabo el tiempo! Veamos quien ha acertado...");
    await delay(WAIT_TIME_BETWEEN_MESSAGES);

    // Identify correct answer
    const correct = poll.answers.find((a) => a.text === translatedQuestion.correct_answer);
    if (!correct) {
      console.error("Correct answer not found");
      return await messageService.sendError("NYAHAAAAA! No pude encontrar la respuesta!");
    }

    // Process winners and losers
    const winners = await correct.fetchVoters();
    const winnerCount = winners.size;

    const loserCollections = await Promise.all(
      poll.answers.filter((a) => a.text !== translatedQuestion.correct_answer).map((a) => a.fetchVoters())
    );

    const losers = loserCollections.flatMap((c) => Array.from(c.values())).filter((user) => !winners.has(user.id));

    const loserCount = losers.length;

    // Handle different outcome scenarios
    if (winnerCount === 0 && loserCount === 0) {
      await messageService.send("Nadie ha votado!? Pues que os den! -10000 puntos para todos >:3");
    } else if (winnerCount === 0) {
      await messageService.send(
        "Ningun usuario ha acertado, lmao. Bastante patetico. En fin, no pasa nada. Lavaos el pilk del cerebro e intendadlo mañana."
      );
    } else {
      // Announce winners and distribute rewards
      const winnerNames = Array.from(winners.values())
        .map((u) => u.username)
        .join(", ");
      await messageService.send(`Los ganadores son: ${winnerNames}! Felicidades!`);

      for (const [userId, user] of winners) {
        const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);
        if (await necoService.checkAgentExists(userId)) {
          const agent = await necoService.getAgent(userId);
          if (agent) {
            await necoService.manipulateAgentBalance(userId, agent.balance + reward);
          }
        } else {
          await necoService.createAgent(userId);
          await necoService.manipulateAgentBalance(userId, reward);
        }
      }

      // Mock losers
      const loserNames = losers.map((u) => u.username).join(", ");
      await messageService.send(`Los perdedores son: ${loserNames}. No os preocupeis... Por ahora.`);
    }
  }, msUntilExpiry + buffer);
}

/** Fetches random trivia question from API */
async function fetchTriviaQuestion(): Promise<TriviaREST | null> {
  // Configure random question parameters
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

/** Translates question and answers to Spanish */
async function translateQuestion(question: Result): Promise<Result | null> {
  const data = new URLSearchParams();
  data.append("target", "es");
  data.append("source", "en");
  data.append("format", "text");
  data.append("key", TRANSLATE_API_KEY);

  // Add all text components to translation request
  [question.question, question.correct_answer, ...question.incorrect_answers].forEach((str) => data.append("q", str));

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
      question: translations[0].translatedText,
      correct_answer: translations[1].translatedText,
      incorrect_answers: translations.slice(2).map((t) => t.translatedText),
    };
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}

/** Decodes HTML entities in question data */
function sanitizeQuestion(question: Result): Result {
  return {
    ...question,
    question: he.decode(question.question),
    correct_answer: he.decode(question.correct_answer),
    incorrect_answers: question.incorrect_answers.map((ans) => he.decode(ans)),
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
