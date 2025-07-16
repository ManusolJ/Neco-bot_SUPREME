declare global {
  namespace NodeJS {
    interface ProcessEnv {
      BOT_TOKEN: string;
      CLIENT_ID: string;
      GUILD_ID: string;
      DB_HOST: string;
      DB_USER: string;
      DB_PASSWORD: string;
      DATABASE: string;

      ADMIN_ROLE: string;
      BOT_ROLE: string;
      HOLE_ROLE: string;
      FUNNY_ROLE: string;
      CULTIST_ROLE: string;
      HERETIC_ROLE: string;

      MAIN_VOICE_CHANNEL: string;
      FUNNY_CHAIR_CHANNEL: string;

      LOBOTOMITE_CHANNEL: string;
      COPYPASTA_CHANNEL: string;
      NECO_MESSAGES_CHANNEL: string;
      NECO_ALTAR_CHANNEL: string;

      COPYPASTA_URL: string;
      ROBOFLOW_URL: string;
      TRIVIA_URL: string;

      ROBOFLOW_API_KEY: string;
      MODEL_NAME: string;
      MODEL_VERSION: string;

      USER_JAN: string;
    }
  }
}

export {};
