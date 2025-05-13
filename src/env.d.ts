declare global {
  namespace NodeJS {
    interface ProcessEnv {
      CONFIG: {
        BOT_TOKEN: string;
        CLIENT_ID: string;
        GUILD_ID: string;
        DB_HOST: string;
        DB_USER: string;
        DB_PASSWORD: string;
        DATABASE: string;
      };
      ROLES: {
        ADMIN_ROLE: string;
        BOT_ROLE: string;
        HOLE_ROLE: string;
        FUNNY_ROLE: string;
        CULTIST_ROLE: string;
      };
      VOICE_CHANNELS: {
        MAIN_VOICE_CHANNEL: string;
        FUNNY_CHAIR_CHANNEL: string;
      };
      TEXT_CHANNELS: {
        LOBOTOMITE_CHANNEL: string;
        COPYPASTA_CHANNEL: string;
        NECO_MESSAGES_CHANNEL: string;
        NECO_ALTAR_CHANNEL: string;
      };
      URLs: {
        COPYPASTA_URL: string;
      };
      REACTIONS: {
        BAREN_CLAP: string;
        BAREN_FACE: string;
        NECO_MOCK: string;
        NECO_CRY: string;
        NECO_SCOLD: string;
        NECO_YEAH: string;
        NECO_DANCE: string;
        NECO_GANG: string;
      };
    }
  }
}

export {};
