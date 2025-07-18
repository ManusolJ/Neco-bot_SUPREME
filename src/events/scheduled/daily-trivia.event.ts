import { Client, Poll, PollLayoutType, User } from "discord.js";
import cron from "node-cron";
import he from "he";

import NecoService from "@services/neco.service";
import MessageService from "@services/message.service";
import { Result, TriviaREST } from "@interfaces/trivia-rest.interface";
import { TranslationREST } from "@interfaces/translation-rest.interface";
import chaosBuilder from "@utils/build-chaos.util";

const TRIVIA_URL = process.env.TRIVIA_URL;
const TRANSLATE_URL = process.env.TRANSLATION_URL;
const TRANSLATE_API_KEY = process.env.TRANSLATION_API_KEY;

const GUILD_ID = process.env.GUILD_ID;
const MESSAGE_CHANNEL_ID = process.env.NECO_MESSAGES_CHANNEL;

const AMOUNT_OF_QUESTIONS = "1";

const WAIT_TIME_BETWEEN_MESSAGES = 2000;
const MINIMUM_REWARD = 1;
const MAXIMUM_REWARD = 4;

export default function dailyTrivia(client: Client): void {
  client.once("ready", () => {
    cron.schedule("53 03 * * *", async () => scheduledTask(client), {
      timezone: "Europe/Madrid",
    });
  });
}

async function scheduledTask(client: Client): Promise<void> {
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

  const triviaQuestion: TriviaREST | null = await fetchTriviaQuestion();

  if (!triviaQuestion || !triviaQuestion.results || triviaQuestion.results.length === 0) {
    console.error("Error fetching trivia question.");
    return;
  }

  const question = triviaQuestion.results[0];

  if (!question || !question.question || !question.correctAnswer || !question.incorrectAnswers) {
    console.error("Invalid trivia question format.");
    return;
  }

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

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const msg = `NYAHAHAHA!!! Hora de una preguntita... Al que la conteste bien, le llamare un buen chico!... Y le dare un par de puntitos.`;
  await messageService.send(msg);
  await delay(WAIT_TIME_BETWEEN_MESSAGES);

  const followUpMsg = `Veamos... Hoy voy a hacer un pregunta de trivia tipo...${translatedQuestion.type} y de dificultad ${translatedQuestion.difficulty}.`;
  await messageService.send(followUpMsg);
  await delay(WAIT_TIME_BETWEEN_MESSAGES);

  const questionMsg = `Ahi va! Pregunta: ${translatedQuestion.question}`;
  await messageService.send(questionMsg);

  const shuffledAnswers = shuffleAnswers([translatedQuestion.correctAnswer, ...translatedQuestion.incorrectAnswers]);

  const pollMsg = await messageService.send({
    poll: {
      question: { text: translatedQuestion.question },
      answers: shuffledAnswers.map((item) => ({ text: item, emoji: "" })),
      allowMultiselect: false,
      duration: 1,
      layoutType: PollLayoutType.Default,
    },
  });

  const poll = pollMsg.poll;

  if (!poll) {
    console.error("Poll failed to start.");
    return;
  }

  const expiresTs = poll.expiresTimestamp;

  if (!expiresTs) {
    console.error("Poll expiration timestamp is not set.");
    return;
  }

  const msUntilExpiry = expiresTs - Date.now();
  const buffer = 500;

  setTimeout(async () => {
    await poll.end();
    const endMsg = "Se acabo el tiempo! Veamos quien ha acertado...";
    await messageService.send(endMsg);
    await delay(WAIT_TIME_BETWEEN_MESSAGES);

    const correct = poll.answers.find((a) => a.text === translatedQuestion.correctAnswer);

    if (!correct) {
      console.error("Correct answer not found in poll answers.");
      const errorMsg = "NYAHAAAAA! No pude encontrar la respuesta correcta en la trivia!";
      return await messageService.sendError(errorMsg);
    }

    const winners = await correct.fetchVoters();
    const winnerCount = winners.size;

    const loserCollections = await Promise.all(
      poll.answers.filter((a) => a.text !== translatedQuestion.correctAnswer).map((a) => a.fetchVoters())
    );

    const losers = loserCollections
      .flatMap((collection) => Array.from(collection.values()))
      .filter((user: User) => !winners.has(user.id));

    const loserCount = losers.length;

    if (winnerCount === 0 && loserCount === 0) {
      const noVoteMsg = "Ningun usuario ha votado en la trivia... Pues que os den.";
      return await messageService.send(noVoteMsg);
    } else if (winnerCount === 0) {
      const noWinnerMsg = "Ningun usuario ha acertado la trivia... Bastante patetico.";
      return await messageService.send(noWinnerMsg);
    } else {
      const winnerNames = Array.from(winners.values())
        .map((user: User) => user.username)
        .join(", ");
      const winnerMsg = `Los ganadores son: ${winnerNames}! Felicidades por usar vuestras neuronas! Como recompensa, os he dado un par de puntitos.`;
      await messageService.send(winnerMsg);

      for (const [userId, user] of winners) {
        const reward = chaosBuilder(MINIMUM_REWARD, MAXIMUM_REWARD);
        if (await necoService.checkAgentExists(userId)) {
          const agent = await necoService.getAgent(userId);
          if (!agent) {
            console.error(`Agent not found for user ${userId}`);
            continue;
          }
          const newBalance = agent.balance + reward;
          await necoService.manipulateAgentBalance(userId, newBalance);
        } else {
          await necoService.createAgent(userId);
          await necoService.manipulateAgentBalance(userId, reward);
        }
      }

      const mockingMsg = `Los perdedores son: ${losers
        .map((user: User) => user.username)
        .join(", ")}. No os preocupeis, no os voy a castigar... Por ahora.`;

      return await messageService.send(mockingMsg);
    }
  }, msUntilExpiry + buffer);
}

async function fetchTriviaQuestion(): Promise<TriviaREST | null> {
  const availableTypes = ["multiple", "boolean"];
  const availableDifficulties = ["easy", "medium", "hard"];

  const questionType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  const difficulty = availableDifficulties[Math.floor(Math.random() * availableDifficulties.length)];

  const params = new URLSearchParams({
    amount: AMOUNT_OF_QUESTIONS,
    difficulty,
    type: questionType,
  });

  const url = `${TRIVIA_URL}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    console.error(`Error fetching trivia question: ${response.statusText}`);
    return null;
  }

  const triviaData: TriviaREST = await response.json();

  return triviaData ?? null;
}

async function translateQuestion(question: Result): Promise<Result | null> {
  const targetLanguage = "es";
  const sourceLanguage = "en";
  const format = "text";

  const allStrings = [question.question, question.correctAnswer, ...question.incorrectAnswers];

  const data = new URLSearchParams();
  data.append("target", targetLanguage);
  data.append("source", sourceLanguage);
  data.append("format", format);
  data.append("key", TRANSLATE_API_KEY);

  allStrings.forEach((str) => data.append("q", str));

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

    if (!translations || translations.length !== allStrings.length) {
      throw new Error("Invalid translation response");
    }

    return {
      ...question,
      question: translations[0].translatedText,
      correctAnswer: translations[1].translatedText,
      incorrectAnswers: translations.slice(2).map((t) => t.translatedText),
    };
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}

function sanitizeQuestion(question: Result): Result {
  return {
    ...question,
    question: he.decode(question.question),
    correctAnswer: he.decode(question.correctAnswer),
    incorrectAnswers: question.incorrectAnswers.map((ans) => he.decode(ans)),
  };
}

function shuffleAnswers(answers: string[]): string[] {
  const a = answers.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
