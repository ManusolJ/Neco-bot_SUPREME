import type { User } from "discord.js";

/**
 * @file Utility function to build random messages for various contexts.
 *
 * @param option Message category type
 * @param user Optional target user
 * @param level Insult severity level
 * @returns Formatted message string
 */
export default function randomMessageBuilder(option: string, user?: User, level?: string): string {
  // Create user mention if available
  const displayName = user ? `<@${user.id}>` : "Criatura";

  switch (option) {
    case "cheer":
      return buildMessage(cheerMessages, displayName);
    case "altar":
      return buildMessage(altarMessages, displayName);
    case "copypasta":
      return buildMessage(copypastaMessages, displayName);
    case "beg":
      return buildMessage(begMessages, displayName);
    case "begFail":
      return buildMessage(failMessages, displayName);
    case "timer":
      return buildMessage(timerMessages, displayName);
    case "monsterSuccess":
      return buildMessage(monsterSuccessMessages, displayName);
    case "monsterFail":
      return buildMessage(monsterFailMessages, displayName);
    case "insult": {
      // Get messages for specified insult level
      const messages = insultmessages[level as keyof typeof insultmessages] ?? insultmessages.light;
      return randomizeMessage(messages);
    }
    default:
      return ""; // Return empty for unknown options
  }
}

/**
 * Builds message with user mention replacement
 *
 * @param messages Message pool array
 * @param name User mention to insert
 *
 * @returns Formatted message with user mention
 */
function buildMessage(messages: string[], name: string): string {
  return replaceName(randomizeMessage(messages), name);
}

/**
 * Selects random message from pool
 *
 * @param messages Message pool array
 *
 * @return Randomly selected message or empty string if pool is empty
 */
function randomizeMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)] ?? "";
}

/**
 * Replaces placeholder with user mention
 *
 * @param message Template message with 'user' placeholder
 * @param name User mention to insert
 *
 * @return Formatted message with user mention
 */
function replaceName(message: string, name: string): string {
  return message.replace(/user/g, name);
}

const cheerMessages: string[] = [
  `¡Felicidades user, mi esbirro del caos! Te regalo una caja misteriosa: 10% glitter, 90% gasolina y un manual de cómo evitar impuestos. ¡Nya~!`,
  `¡Gran exito user, mi criatura turbia! Celebra con una pipe bomb de confeti y un ladrillo bendito. Si no sobrevives, hay turrón en el infierno. ¡Burunyaa~!`,
  `¡user, mi criatura! Premio: Un viaje gratis en ambulancia + 3 ladrillos con carita feliz. ¡El seguro médico no cubre Neco-asalto!`,
  `¡Felicidades, user! Tu trofeo: Un pastel con dinamita y una hooker muerta en el ático. ¡Sopla las velas... si te atreves!`,
  `¡Enhorabuena user! Te mereces: Un abrazo incómodo y una bolsa de basura llameante. Devuélveme la bolsa.`,
  `¡Felicidades, aliado del lado no blanco! Recibe este manual: *Cómo domar una paloma con problemas* + 5kg de arroz. ¡La revolución empieza mañana!`,
];

const copypastaMessages: string[] = [
  `user... ¿Sabías que el 99% de los shitposters no lavan sus manos después de usar Discord? Tú no eres diferente. Te veo, user. Siempre presente, siempre perturbador.`,
  `Mira user, no te odio, pero si tu cuenta fuera un NFT la denunciaría por crímenes de guerra. Cada vez que escribes algo, un furro gana poder en esta dimensión.`,
  `user, deja de postear como si tu teclado tuviera trauma. ¿Necesitas ayuda? ¿Un ladrillo? ¿Una pala?`,
  `Hay dos tipos de personas en este servidor, user: los que ignoran la degeneración y los que la encarnan. Adivina cuál eres tú.`,
  `user, te quiero... pero si fueras una variable en mi código, estarías dentro de un bloque try-catch con un throw inmediato.`,
  `Cada vez que user postea, un moderador se replantea su vida. Y un pato muere. Déjalo ya.`,
  `user, tu energía me recuerda a una tostadora poseída por un shitposter. Caótica. Inestable. Totalmente aceptada aquí.`,
  `Te he observado por mucho tiempo, user... Y he llegado a una conclusión clara: eres un NPC generado por el algoritmo del caos.`,
  `No es personal, user, pero si fueras un archivo de sistema, yo te hacia rm -rf sin respaldo.`,
];

const altarMessages: string[] = [
  `Buen aporte, user. El altar ha empezado a emitir ruidos... no sé si de aprobación o sufrimiento.`,
  `Hmm... eso fue raro, user. Raro en el buen sentido. Creo.`,
  `Ese shitpost me quitó dos neuronas pero me dejó una revelación. Te lo permito.`,
  `user, estás a un paso de convertirte en un emisario del caos. No sé si felicitarte o alertar a las autoridades.`,
  `Contenido basura aprobado. El altar hace una voltereta, o suena como si lo intentara.`,
  `Eso fue tan cursed que el altar dejó de funcionar. Bien jugado, user.`,
  `Esperaba nada y aún así lograste desconcertarme. Aquí tienes un cabezazo simbólico.`,
  `¿Qué fue eso, user? El altar ha dejado de responder. Eso suele ser buena señal.`,
  `Sigue shitposteando así, user, y vamos a necesitar un exorcismo. Uno bueno.`,
  `Alimento aceptado. El altar sonríe... o al menos pulsa con menos ira.`,
  `¡Increíble! El meme me reventó una sinapsis. El altar vibra con intensidad moderada... No se si eso es buena señal.`,
  `Meme entregado. Mente destruida. El caos agradece tu contribución, user.`,
];

const begMessages: string[] = [
  `¿Pidiendo puntos, user~? Qué patético... Pero está bien, aqui tienes`,
  `Burunyaa~ ¿De verdad has caído tan bajo como para suplicar? Toma, un ladrillo y esto de propina: `,
  `Oye user, normalmente no doy limosnas, pero tu carita de abandono me ha tocado el alma. Toma tus migajas`,
  `Mira user, no me das pena, me das contenido. Aquí tienes tus puntos. Ahora baila, pequeño bufon.`,
  `¿Otra vez pidiendo? Qué cringe... Aquí tienes. Y recuerda: el caos no se mendiga, se provoca.`,
  `¡Nya~! Me has entretenido con tu miseria. Toma unos puntitos... pero prométeme que vas a hacer algo estúpido con ellos.`,
  `Te pareces a un NPC rogando por monedas. Toma tus puntos y lárgate antes de que me arrepienta.`,
  `Burunya~ tus súplicas me alimentan. Aquí tienes. Usa estos puntos con irresponsabilidad.`,
  `Te doy estos puntos user, pero no porque los merezcas… sino porque estoy aburrida y necesito que hagas algo ridículo.`,
  `Una súplica más y me transformo en Hacienda. Aquí tienes. Pero no me hables por 24 horas.`,
  `user, esto no es caridad, es inversión en caos. Toma tus puntos. No me decepciones.`,
];

const failMessages = [
  "¡Ni rogando lograste algo, nyaha~!",
  "Menos suerte que un furro en juicio divino.",
  "Ni vendiendo tu alma, user... triste.",
];

const timerMessages: string[] = [
  `¡Nyaha~! ¡Se acabó el tiempo, user! Espero que hayas hecho algo productivo... o al menos caótico.`,
  `*Tira una bomba de confeti* ¡Despierta, user! El tiempo no espera a nadie. Ni siquiera a ti.`,
  `¡Brrr~! ¡Tu temporizador ha explotado en confeti y caos! Hora de actuar, user.`,
  `¡DING DING!~ Tu tiempo terminó. ¿Te levantaste? ¿Te duchaste? ¿O simplemente existes?`,
  `Nyaa~ ¡Tu timer ha sonado! Y no me hagas repetirlo, user, o gritaré en binario.`,
  `*Reproduce bocina de payaso* ¡Levántate, criatura de sombras! Tu tiempo se ha agotado.`,
  `¡ALERTA DE CAOS! user, el universo te está empujando... y yo también.`,
  `Burunya~ ¡Se acabó el tiempo! Pero tranquilo, no hay prisa... sólo decepción.`,
  `*Aparece flotando* El ciclo ha terminado, user. El caos te llama.`,
  `¡Wakey wakey, user~! Tu temporizador ha expirado. ¿Ahora qué vas a romper?`,
  `Tu tiempo acabó, nyah~ Espero que no estés haciendo gooning.`,
  `¡Vamos, user! Ya es hora de dejar de procrastinar. ¡El caos no se invoca solo!`,
];

const insultmessages = {
  light: [
    "¿Eso fue un intento de insulto o simplemente tropezaste con el teclado?",
    "Honestamente, he leído spam más ofensivo que eso.",
    "Tu abuela grita con más convicción cuando se le enfría el café.",
    "Sigue así y te doy una medalla por participación. De cartón mojado.",
  ],
  medium: [
    "¿Por qué tan agresivo? ¿Se acabó el Nesquik?",
    "Tu nivel de frustración es audible. Y preocupante.",
    "Deja de proyectar, no eres un proyector. Eres un meme a medio renderizar.",
    "¿Todo bien en casa? Porque tu ira huele a problemas emocionales.",
  ],
  heavy: [
    "Ese insulto tuvo más esfuerzo que impacto. Agradezco el intento.",
    "Con ese veneno deberías estar en un club de poesía tóxica.",
    "Sí, eso dolió... a la gramática.",
    "Incluso mi sombra te quiere ignorar. Y no tiene cara.",
  ],
  ultra: [
    "Insulto detectado: 9/10 en intensidad, 2/10 en coherencia.",
    "Eso fue tan hostil que mi antivirus lo marcó como amenaza.",
    "¿Estás bien? Porque ese comentario grita 'no he dormido en tres días'.",
    "¿Quieres un abrazo, un psicólogo, o drogas? Porque algo necesitas.",
  ],
};

const monsterSuccessMessages: string[] = [
  "Felicidades user! Has conseguido unos cuantos puntos!... A cambio de hacer piedras del riñon, pero a quien le importa eso, eh?",
  "¡user, maestro caótico! Cada vez que mandas un monster, un catalan consigue escapar de cataluña.",
  "Aplausos para user: unos de mis mas devotos... devotos. Uh, si lo que sea.",
  "¡Éxito! user, puedo oler el dulce, dulce olor de... quimicos con cafeina. Disfruta tus puntos.",
  "Que buen monstruo tienes ahi, user. Y la lata de bebida energetica tambien es bien adecuada.",
  "Vaya! Que buen monstruo tienes ahi, pillin... Has demonstrado tu devocion por las tradiciones, asi que te regalo unos cuantos puntos. No te lo gastes todo slapeando las bolas de jan",
];

const monsterFailMessages: string[] = [
  "…Huh, user? Eso no parece Monster. No hay puntos para mamaguevos.",
  "Ni rastro de Monster, user. Intenta usar tu compresion lectora para comprender que... quiero fotos de Monsters.",
  "No todos los recipientes verdes son Monster, user. Sigue intentado usar tus neuronas.",
  "Fallaste, user. Voy a tener que tacharte de la lista de 'buenas criaturas'... y añadirte a la lista de 'Exterminio express™'",
  "Nada por aquí, user. Quizá estabas sosteniendo tus pensamientos... Vacios e intangibles.",
];
