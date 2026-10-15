const SAVE_KEY = "la-vie-abidjanaise-day-v1";
const DAILY_DEADLINE = 12 * 60;
const STAGES = ["breakfast", "commute", "work", "lunch", "crossTown", "evening", "final"];
const STAGE_NAMES = ["Le matin", "Le trajet", "Le Plateau", "La pause", "L’autre rive", "Le soir"];

const WEATHER = [
  {
    id: "clear",
    label: "Ciel clair",
    icon: "☀",
    roadDelay: 0,
    note: "Le ciel est ouvert ce matin. La chaleur montera doucement au fil des trajets.",
  },
  {
    id: "cloud",
    label: "Ciel voilé",
    icon: "⛅",
    roadDelay: 9,
    note: "Un ciel voilé ralentit un peu la ville; garde une marge pour les correspondances.",
  },
  {
    id: "rain",
    label: "Averse matinale",
    icon: "🌦",
    roadDelay: 21,
    note: "Une averse passe sur la lagune. Les trajets routiers prennent un peu plus de temps dans ce scénario.",
  },
];

const PLACES = {
  yopougon: { name: "Yopougon", point: [42, 139] },
  adjame: { name: "Adjamé", point: [155, 93] },
  "abobo-doume": { name: "Abobo-Doumé", point: [193, 198] },
  plateau: { name: "Le Plateau", point: [286, 86] },
  cocody: { name: "Cocody", point: [389, 49] },
  treichville: { name: "Treichville", point: [315, 177] },
};

const nextStage = {
  breakfast: "commute",
  commute: "work",
  work: "lunch",
  lunch: "crossTown",
  crossTown: "evening",
  evening: "final",
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatMoney(value) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(value);
}

function formatTime(minutes) {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  const hours = Math.floor(safeMinutes / 60) % 24;
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function randomWeather() {
  const roll = Math.random();
  if (roll < 0.36) return WEATHER[0];
  if (roll < 0.68) return WEATHER[1];
  return WEATHER[2];
}

function createInitialState() {
  const weather = randomWeather();
  return {
    version: 1,
    stage: "breakfast",
    money: 6500,
    energy: 7,
    network: 1,
    reputation: 0,
    time: 7 * 60 + 20,
    location: "yopougon",
    weatherId: weather.id,
    mapTrace: ["yopougon"],
    delivered: null,
    routeName: "",
    feedback: "",
    log: [
      {
        time: formatTime(7 * 60 + 20),
        place: "Yopougon",
        title: "Le jour se lève",
        detail: "Naya t’attend au Plateau avec un rendez-vous avant midi.",
      },
    ],
  };
}

function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || saved.version !== 1 || !STAGES.includes(saved.stage)) return null;

    const validMapTrace = Array.isArray(saved.mapTrace)
      ? saved.mapTrace.filter((place) => Object.hasOwn(PLACES, place))
      : ["yopougon"];
    const validLog = Array.isArray(saved.log)
      ? saved.log
          .filter((entry) => entry && typeof entry === "object")
          .slice(-8)
          .map((entry) => ({
            time: typeof entry.time === "string" ? entry.time : "07:20",
            place: typeof entry.place === "string" ? entry.place : "Abidjan",
            title: typeof entry.title === "string" ? entry.title : "Une étape",
            detail: typeof entry.detail === "string" ? entry.detail : "",
          }))
      : [];

    return {
      version: 1,
      stage: saved.stage,
      money: clamp(Number(saved.money) || 0, 0, 999999),
      energy: clamp(Number(saved.energy) || 0, 0, 10),
      network: clamp(Number(saved.network) || 0, 0, 5),
      reputation: clamp(Number(saved.reputation) || 0, 0, 5),
      time: clamp(Number(saved.time) || 7 * 60 + 20, 7 * 60, 23 * 60 + 59),
      location: Object.hasOwn(PLACES, saved.location) ? saved.location : "yopougon",
      weatherId: WEATHER.some((item) => item.id === saved.weatherId) ? saved.weatherId : "clear",
      mapTrace: validMapTrace.length ? validMapTrace : ["yopougon"],
      delivered: typeof saved.delivered === "boolean" ? saved.delivered : null,
      routeName: typeof saved.routeName === "string" ? saved.routeName.slice(0, 60) : "",
      feedback: typeof saved.feedback === "string" ? saved.feedback.slice(0, 400) : "",
      log: validLog.length ? validLog : createInitialState().log,
    };
  } catch {
    return null;
  }
}

let state = loadGame() || createInitialState();
let toastTimer;

function saveGame() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    const label = $("#save-label");
    if (label) label.textContent = "Sauvegardé sur cet appareil";
  } catch {
    const label = $("#save-label");
    if (label) label.textContent = "Sauvegarde indisponible";
  }
}

function getWeather() {
  return WEATHER.find((item) => item.id === state.weatherId) || WEATHER[0];
}

function addJournal(title, detail) {
  state.log.push({
    time: formatTime(state.time),
    place: PLACES[state.location]?.name || "Abidjan",
    title,
    detail,
  });
  state.log = state.log.slice(-8);
}

function mergeMapTrace(path) {
  const trace = [...state.mapTrace];
  for (const place of path) {
    if (trace[trace.length - 1] !== place) trace.push(place);
  }
  state.mapTrace = trace;
}

function makeChoice({
  id,
  icon,
  title,
  description,
  cost = 0,
  minutes = 0,
  energy = 0,
  network = 0,
  reputation = 0,
  reward = 0,
  chips = [],
  featured = false,
  travel = null,
}) {
  return { id, icon, title, description, cost, minutes, energy, network, reputation, reward, chips, featured, travel };
}

function travelMinutes(choice) {
  if (!choice.travel) return choice.minutes;
  const weather = getWeather();
  if (choice.travel.weatherRule === "water") {
    return choice.minutes + (weather.id === "rain" ? 8 : weather.id === "cloud" ? 3 : 0);
  }
  if (choice.travel.weatherRule === "walk") {
    return choice.minutes + (weather.id === "rain" ? 5 : 0);
  }
  return choice.minutes + weather.roadDelay;
}

function sceneFor(currentState = state) {
  const weather = getWeather();
  const currentPlace = PLACES[currentState.location]?.name || "Abidjan";

  switch (currentState.stage) {
    case "breakfast":
      return {
        number: "01",
        kicker: `${formatTime(currentState.time)} · Yopougon`,
        context: "AVANT QUE LA VILLE S’ÉVEILLE TOUT À FAIT",
        weather: `${weather.icon} ${weather.label}`,
        title: "Avant la route, un moment pour toi.",
        description:
          "Naya attend ton épreuve imprimée au Plateau avant la pause de midi. Le rendez-vous est fixé, mais la journée t’appartient encore : tu peux prendre des forces, garder ta monnaie ou simplement filer.",
        note: weather.note,
        choiceTitle: "Comment tu commences ?",
        options: [
          makeChoice({
            id: "garba",
            icon: "◒",
            title: "Garba du coin",
            description: "Attiéké, poisson, piment — un vrai petit-déjeuner de maquis.",
            cost: 850,
            minutes: 20,
            energy: 2,
            network: 1,
            chips: ["− 850 F", "+ 2 énergie", "+ 1 lien", "20 min"],
            featured: true,
          }),
          makeChoice({
            id: "pain-cafe",
            icon: "☕",
            title: "Pain et café",
            description: "Un arrêt rapide au kiosque, puis tu prends la route.",
            cost: 450,
            minutes: 12,
            energy: 1,
            chips: ["− 450 F", "+ 1 énergie", "12 min"],
          }),
          makeChoice({
            id: "fruit",
            icon: "✳",
            title: "Fruit et eau fraîche",
            description: "Simple, léger, et un peu de fraîcheur avant le trajet.",
            cost: 500,
            minutes: 8,
            energy: 1,
            chips: ["− 500 F", "+ 1 énergie", "8 min"],
          }),
          makeChoice({
            id: "skip-breakfast",
            icon: "→",
            title: "Garder la monnaie",
            description: "Tu pars tout de suite, mais l’estomac risque de te le rappeler.",
            minutes: 0,
            energy: -1,
            chips: ["Sans frais", "− 1 énergie", "Départ direct"],
          }),
        ],
      };

    case "commute": {
      const rainNote = weather.id === "rain"
        ? "La pluie peut rallonger les trajets routiers. Le bateau-bus dépend aussi des correspondances."
        : "Les minutes sont une mécanique de jeu : choisis entre coût, régularité et traversée de la lagune.";
      return {
        number: "02",
        kicker: `${formatTime(currentState.time)} · Yopougon → Le Plateau`,
        context: "LE PREMIER GRAND CHOIX DE LA JOURNÉE",
        weather: `${weather.icon} ${weather.label}`,
        title: "Quel chemin pour rejoindre le Plateau ?",
        description:
          "Le rendez-vous de midi est devant toi. Un trajet populaire, un bus plus régulier ou une correspondance près de l’eau : chaque option a son tempo.",
        note: rainNote,
        choiceTitle: "Choisis ton trajet.",
        options: [
          makeChoice({
            id: "gbaka",
            icon: "▰",
            title: "Gbaka via Adjamé",
            description: "Le trajet collectif direct, avec une correspondance animée à Adjamé.",
            cost: 350,
            minutes: 42,
            energy: -1,
            chips: ["− 350 F", `≈ ${formatDuration(42 + weather.roadDelay)}`, "Via Adjamé"],
            featured: true,
            travel: { weatherRule: "road", path: ["yopougon", "adjame", "plateau"] },
          }),
          makeChoice({
            id: "sotra",
            icon: "▤",
            title: "Bus SOTRA",
            description: "Tu prends une option de réseau public et gardes un peu de calme pour la suite.",
            cost: 300,
            minutes: 62,
            energy: 0,
            chips: ["− 300 F", `≈ ${formatDuration(62 + weather.roadDelay)}`, "Réseau public"],
            travel: { weatherRule: "road", path: ["yopougon", "adjame", "plateau"] },
          }),
          makeChoice({
            id: "bateau",
            icon: "⌁",
            title: "Bateau-bus via Abobo-Doumé",
            description: "Une correspondance jusqu’à l’embarcadère, puis la lagune vers le centre.",
            cost: 600,
            minutes: 52,
            energy: 0,
            chips: ["− 600 F", `≈ ${formatDuration(52 + (weather.id === "rain" ? 8 : weather.id === "cloud" ? 3 : 0))}`, "Par la lagune"],
            travel: { weatherRule: "water", path: ["yopougon", "abobo-doume", "plateau"] },
          }),
        ],
      };
    }

    case "work":
      return {
        number: "03",
        kicker: `${formatTime(currentState.time)} · Le Plateau`,
        context: "UNE OCCASION, PLUSIEURS FAÇONS DE FAIRE",
        weather: `${weather.icon} ${weather.label}`,
        title: "La maquette doit arriver avant midi.",
        description:
          "Le studio de Naya est à deux rues. Tu peux remettre le tirage tout de suite, faire un détour par l’imprimeur d’Adjamé pour une finition soignée, ou donner un coup de main à un petit atelier avant la remise.",
        note: "Le rendez-vous est à 12:00. Un détour peut améliorer le rendu, mais le temps compte aussi.",
        choiceTitle: "Quelle priorité tu choisis ?",
        options: [
          makeChoice({
            id: "deliver-direct",
            icon: "✉",
            title: "Remettre l’épreuve maintenant",
            description: "Tu tiens le rendez-vous et présentes ton travail en personne.",
            minutes: 20,
            chips: ["Sans frais", "+ 20 min", "Bonus si à l’heure"],
            featured: true,
          }),
          makeChoice({
            id: "print-detour",
            icon: "▧",
            title: "Finition chez l’imprimeur d’Adjamé",
            description: "Un tirage plus net, mais une longue file et un détour avant midi.",
            cost: 1000,
            minutes: 180,
            chips: ["− 1 000 F", "+ 3 h", "Rendu premium"],
          }),
          makeChoice({
            id: "help-workshop",
            icon: "✳",
            title: "Aider l’atelier du quartier",
            description: "Tu dépannes une petite commande avant de rejoindre Naya.",
            minutes: 65,
            energy: -1,
            network: 2,
            chips: ["Sans frais", "+ 1 lien", "Coup de main"],
          }),
        ],
      };

    case "lunch":
      return {
        number: "04",
        kicker: `${formatTime(currentState.time)} · Le Plateau`,
        context: "LA PAUSE FAIT PARTIE DU VOYAGE",
        weather: `${weather.icon} ${weather.label}`,
        title: "À midi, la ville reprend son souffle.",
        description:
          currentState.delivered
            ? "La maquette est remise. Tu peux savourer la pause et décider comment traverser l’après-midi."
            : "Le rendez-vous n’a pas suivi le plan, mais il reste du temps pour te ressourcer et garder la journée ouverte.",
        note: "Un repas partagé peut apporter plus que de l’énergie : parfois, une conversation vaut un raccourci.",
        choiceTitle: "Qu’est-ce qui te ferait du bien ?",
        options: [
          makeChoice({
            id: "attieke-poisson",
            icon: "◉",
            title: "Attiéké-poisson braisé",
            description: "Une assiette généreuse, et le temps d’échanger au maquis.",
            cost: 1500,
            minutes: 38,
            energy: 3,
            network: 1,
            chips: ["− 1 500 F", "+ 3 énergie", "+ 1 lien"],
            featured: true,
          }),
          makeChoice({
            id: "alloco",
            icon: "◒",
            title: "Alloco et œuf",
            description: "Un classique simple avant de reprendre la route.",
            cost: 750,
            minutes: 24,
            energy: 2,
            chips: ["− 750 F", "+ 2 énergie", "24 min"],
          }),
          makeChoice({
            id: "garba-lunch",
            icon: "◍",
            title: "Garba et piment",
            description: "Tu retrouves les saveurs du matin, cette fois sans te presser.",
            cost: 900,
            minutes: 30,
            energy: 2,
            chips: ["− 900 F", "+ 2 énergie", "30 min"],
          }),
          makeChoice({
            id: "water-fruit",
            icon: "◌",
            title: "Eau fraîche et fruit",
            description: "Tu fais une pause légère et gardes ton budget pour la suite.",
            cost: 450,
            minutes: 12,
            energy: 1,
            chips: ["− 450 F", "+ 1 énergie", "12 min"],
          }),
        ],
      };

    case "crossTown":
      return {
        number: "05",
        kicker: `${formatTime(currentState.time)} · Le Plateau → Treichville`,
        context: "L’AUTRE RIVE, UN AUTRE RYTHME",
        weather: `${weather.icon} ${weather.label}`,
        title: "L’après-midi t’emmène à Treichville.",
        description:
          "Un petit collectif prépare une soirée de quartier. Tu as promis de passer : à toi de choisir comment rejoindre Treichville sans perdre de vue ton énergie et ton budget.",
        note: "La carte est schématique. Les correspondances et les durées ci-dessous sont imaginées pour le jeu.",
        choiceTitle: "Tu traverses comment ?",
        options: [
          makeChoice({
            id: "woroworo",
            icon: "◩",
            title: "Wôrô-wôrô partagé",
            description: "Tu rejoins la rive sud par un trajet collectif plus direct.",
            cost: 550,
            minutes: 31,
            energy: -1,
            chips: ["− 550 F", `≈ ${formatDuration(31 + weather.roadDelay)}`, "Trajet collectif"],
            featured: true,
            travel: { weatherRule: "road", path: ["plateau", "treichville"] },
          }),
          makeChoice({
            id: "sotra-afternoon",
            icon: "▤",
            title: "Bus et petit détour à pied",
            description: "Tu prends le temps, observes la ville et gardes la dépense basse.",
            cost: 250,
            minutes: 53,
            energy: -1,
            chips: ["− 250 F", `≈ ${formatDuration(53 + weather.roadDelay)}`, "Budget léger"],
            travel: { weatherRule: "road", path: ["plateau", "treichville"] },
          }),
          makeChoice({
            id: "shared-ride",
            icon: "↗",
            title: "Trajet partagé avec une amie",
            description: "Un message, une place libre et la conversation qui va avec.",
            minutes: 42,
            energy: 0,
            network: 1,
            chips: ["Sans frais", `≈ ${formatDuration(42 + weather.roadDelay)}`, "+ 1 lien"],
            travel: { weatherRule: "road", path: ["plateau", "treichville"] },
          }),
        ],
      };

    case "evening":
      return {
        number: "06",
        kicker: `${formatTime(currentState.time)} · Treichville`,
        context: "LE JOUR SE TERMINE ENSEMBLE OU AU CALME",
        weather: `${weather.icon} ${weather.label}`,
        title: "À Treichville, la soirée s’installe.",
        description:
          "Les chaises se mettent en place, les premières notes s’accordent et le bruit de la ville change de tempo. Tu peux donner un coup de main, partager un repas ou rentrer tranquillement.",
        note: "Il n’y a pas de mauvais choix : la fin de journée dépend de ce dont tu as besoin.",
        choiceTitle: "Comment tu veux finir ?",
        options: [
          makeChoice({
            id: "help-evening",
            icon: "✳",
            title: "Donner un coup de main",
            description: "Installer quelques chaises et accueillir les personnes du quartier.",
            minutes: 48,
            energy: -1,
            network: 2,
            reputation: 1,
            chips: ["Sans frais", "+ 2 liens", "Coup de main"],
            featured: true,
          }),
          makeChoice({
            id: "maquis-evening",
            icon: "◉",
            title: "Partager un plat au maquis",
            description: "Tu t’attardes autour d’un repas et des histoires de la journée.",
            cost: 1300,
            minutes: 58,
            energy: 2,
            network: 2,
            chips: ["− 1 300 F", "+ 2 énergie", "+ 2 liens"],
          }),
          makeChoice({
            id: "go-home",
            icon: "⌂",
            title: "Garder la monnaie et rentrer",
            description: "Tu prends une dernière correspondance et rentres te reposer.",
            cost: 450,
            minutes: 56,
            energy: 1,
            chips: ["− 450 F", "+ 1 énergie", "Retour à la maison"],
            travel: { weatherRule: "road", path: ["treichville", "plateau", "adjame", "yopougon"] },
          }),
        ],
      };

    default:
      return {
        number: "07",
        kicker: `${formatTime(currentState.time)} · ${currentPlace}`,
        context: "LE CARNET SE REFERME",
        weather: `${weather.icon} ${weather.label}`,
        title: "Une journée à Abidjan.",
        description: "Ta journée est terminée.",
        note: "",
        choiceTitle: "",
        options: [],
      };
  }
}

function changeStat(key, amount, max) {
  state[key] = clamp(state[key] + amount, 0, max);
}

function endingFor(currentState) {
  if (currentState.delivered && currentState.network >= 3) {
    return {
      title: "La ville s’est mise à ton rythme.",
      copy: "La maquette est arrivée à temps et les rencontres de la journée ont ouvert d’autres portes. À Abidjan, un bon détour peut parfois devenir le meilleur raccourci.",
    };
  }
  if (currentState.delivered) {
    return {
      title: "Un rendez-vous tenu, une journée bien remplie.",
      copy: "Tu as remis l’épreuve avant midi et trouvé ton propre tempo entre les trajets, le travail et les pauses. La suite s’écrira demain.",
    };
  }
  if (currentState.network >= 4) {
    return {
      title: "Des liens solides, même quand le plan change.",
      copy: "Le rendez-vous a glissé dans l’après-midi, mais tu as pris le temps d’aider et de créer des liens. Une journée ne se résume pas à une seule échéance.",
    };
  }
  if (!currentState.delivered) {
    return {
      title: "Le plan a pris du retard, pas ta journée.",
      copy: "La maquette est finalement remise après midi. Un détour ou un coup de main a changé l’horaire; tu as quand même traversé la ville à ta façon.",
    };
  }
  return {
    title: "À Abidjan, demain aura un autre tempo.",
    copy: "Tout ne s’est pas passé comme prévu, mais tu as traversé la ville à ta façon. Garde ce qui t’a fait du bien et réessaie avec un autre itinéraire.",
  };
}

function endingBadges() {
  const badges = [];
  if (state.delivered) badges.push("Rendez-vous tenu");
  if (state.network >= 3) badges.push("Liens de quartier");
  if (state.reputation >= 2) badges.push("Travail reconnu");
  if (state.money >= 4000) badges.push("Budget préservé");
  if (state.energy >= 5) badges.push("Énergie pour demain");
  return badges.length ? badges.slice(0, 4) : ["Une journée vécue à ton rythme"];
}

function endingMarkup() {
  const ending = endingFor(state);
  const badges = endingBadges();
  const deliveryLabel = state.delivered ? "À temps" : "En retard";
  return `
    <div class="end-card">
      <span class="end-kicker"><span aria-hidden="true">✳</span> BILAN DE TA JOURNÉE · ${formatTime(state.time)}</span>
      <h2>${ending.title}</h2>
      <p>${ending.copy}</p>
      <div class="end-summary" aria-label="Bilan des ressources">
        <div class="end-summary-item"><span>Budget restant</span><strong>${formatMoney(state.money)} F</strong></div>
        <div class="end-summary-item"><span>Maquette</span><strong>${deliveryLabel}</strong></div>
        <div class="end-summary-item"><span>Quartiers traversés</span><strong>${new Set(state.mapTrace).size}</strong></div>
      </div>
      <div class="ending-badges">${badges.map((badge) => `<span class="ending-badge"><span aria-hidden="true">✦</span>${badge}</span>`).join("")}</div>
      <button class="end-replay" type="button" data-action="replay"><span aria-hidden="true">↻</span> Rejouer une autre journée</button>
    </div>
  `;
}

function renderChoices(options) {
  if (!options.length) return "";
  return options.map((choice) => {
    const disabled = state.money < choice.cost;
    const costLabel = choice.cost ? `− ${formatMoney(choice.cost)} F` : "Sans frais";
    const chips = choice.chips.map((chip) => {
      const tone = chip.startsWith("+") ? "positive" : chip.startsWith("−") ? "negative" : "";
      return `<span class="choice-chip ${tone}">${chip}</span>`;
    }).join("");
    return `
      <button class="choice-card ${choice.featured ? "is-featured" : ""}" type="button" data-choice="${choice.id}" ${disabled ? "disabled" : ""} aria-label="${choice.title}. ${costLabel}. ${choice.description}">
        <span class="choice-top">
          <span class="choice-icon" aria-hidden="true">${choice.icon}</span>
          <span class="choice-cost">${disabled ? "Budget insuffisant" : costLabel}</span>
        </span>
        <span class="choice-title">${choice.title}</span>
        <span class="choice-description">${choice.description}</span>
        <span class="choice-bottom">${chips}</span>
      </button>
    `;
  }).join("");
}

function renderScene() {
  const mount = $("#scene-mount");
  if (!mount) return;

  if (state.stage === "final") {
    mount.innerHTML = endingMarkup();
    return;
  }

  const scene = sceneFor();
  const feedback = state.feedback
    ? `<div class="scene-feedback" role="status" aria-live="polite"><span class="note-mark" aria-hidden="true">↳</span><span>${escapeHtml(state.feedback)}</span></div>`
    : "";

  mount.innerHTML = `
    <div class="scene-heading">
      <div class="scene-heading-left">
        <span class="scene-index">${scene.number}</span>
        <div>
          <p class="scene-kicker">${scene.kicker}</p>
          <span class="scene-context">${scene.context}</span>
        </div>
      </div>
      <span class="scene-weather">${scene.weather}</span>
    </div>
    <div class="scene-copy">
      <h2 id="scene-title">${scene.title}</h2>
      <p>${scene.description}</p>
      ${scene.note ? `<div class="scene-note"><span class="note-mark" aria-hidden="true">↳</span><span>${scene.note}</span></div>` : ""}
    </div>
    <div class="choices-heading">
      <div>
        <p class="section-kicker">À TOI DE DÉCIDER</p>
        <h3>${scene.choiceTitle}</h3>
      </div>
      <span class="choice-count">${String(scene.options.length).padStart(2, "0")} OPTIONS</span>
    </div>
    <div class="choice-grid">${renderChoices(scene.options)}</div>
    ${feedback}
    <p class="scene-footnote">Les montants et les durées sont des valeurs de jeu, pas des tarifs ni des horaires officiels.</p>
  `;
}

function renderProgress() {
  const index = STAGES.indexOf(state.stage);
  const completedSteps = state.stage === "final" ? 6 : Math.min(index, 6);
  const segments = Array.from({ length: 6 }, (_, i) => {
    let className = "progress-segment";
    if (i < completedSteps) className += " is-complete";
    else if (i === completedSteps && state.stage !== "final") className += " is-current";
    return `<span class="${className}" aria-hidden="true"></span>`;
  }).join("");
  $("#progress-track").innerHTML = segments;

  if (state.stage === "final") {
    $("#progress-copy").innerHTML = "Journée terminée <b>·</b> Le bilan";
  } else {
    const stageLabel = STAGE_NAMES[index] || "Le jour";
    $("#progress-copy").innerHTML = `Étape ${index + 1} sur 6 <b>·</b> ${stageLabel}`;
  }
}

function renderStatDots(selector, value, className) {
  const target = $(selector);
  target.innerHTML = Array.from({ length: 5 }, (_, index) => {
    const filled = index < value ? " is-filled" : "";
    return `<i class="${className}${filled}" aria-hidden="true"></i>`;
  }).join("");
}

function renderStats() {
  $("#current-time").textContent = formatTime(state.time);
  $("#weather-icon").textContent = getWeather().icon;
  $("#weather-label").textContent = getWeather().label;
  $("#money-value").textContent = formatMoney(state.money);
  $("#energy-value").textContent = String(state.energy);
  $("#network-value").textContent = String(state.network);
  $("#trust-value").textContent = String(state.reputation);

  $("#money-status").textContent = state.money >= 8000 ? "Confortable" : state.money >= 3000 ? "À gérer" : "Serré";
  $("#energy-status").textContent = state.energy >= 7 ? "En forme" : state.energy >= 4 ? "Ça tient" : "À ménager";

  const meter = $("#energy-meter");
  meter.style.width = `${state.energy * 10}%`;
  meter.parentElement.setAttribute("aria-valuenow", String(state.energy));
  renderStatDots("#network-meter", state.network, "");
  renderStatDots("#trust-meter", state.reputation, "");
  $("#network-meter").setAttribute("aria-label", `Réseau, ${state.network} sur 5`);
  $("#trust-meter").setAttribute("aria-label", `Confiance, ${state.reputation} sur 5`);
}

function renderMap() {
  const route = $("#chosen-route");
  const routePoints = state.mapTrace.map((place) => PLACES[place]?.point).filter(Boolean);
  if (routePoints.length) {
    const path = routePoints.map(([x, y], index) => `${index === 0 ? "M" : "L"}${x} ${y}`).join(" ");
    route.setAttribute("d", path);
  }

  $$(".map-stop").forEach((stop) => {
    const id = stop.dataset.stop;
    const visited = state.mapTrace.includes(id);
    stop.classList.toggle("is-visited", visited);
    stop.classList.toggle("is-current", id === state.location);
  });

  const placeName = PLACES[state.location]?.name || "Abidjan";
  $("#current-place-label").textContent = `Tu es à ${placeName}`;
  $("#map-svg-desc").textContent = `Carte schématique d’Abidjan. Tu es à ${placeName}. Quartiers déjà traversés : ${[...new Set(state.mapTrace)].map((id) => PLACES[id]?.name).filter(Boolean).join(", ")}.`;
}

function renderMission() {
  const card = $("#mission-title").closest(".mission-card");
  const status = $("#mission-status");
  card.classList.remove("is-done", "is-missed");

  if (state.delivered === true) {
    card.classList.add("is-done");
    $("#mission-deadline").textContent = "REMIS";
    status.textContent = "La maquette est arrivée à temps. Naya peut avancer.";
    return;
  }
  if (state.delivered === false) {
    card.classList.add("is-missed");
    $("#mission-deadline").textContent = "APRÈS MIDI";
    status.textContent = "La remise est en retard; le prochain échange peut rétablir le rythme.";
    return;
  }

  $("#mission-deadline").textContent = "12:00";
  const remaining = DAILY_DEADLINE - state.time;
  if (remaining > 0) {
    status.textContent = `Il reste ${formatDuration(remaining)} pour choisir ton chemin.`;
  } else {
    status.textContent = "Le rendez-vous approche; chaque détour comptera.";
  }
}

function renderJournal() {
  const list = $("#journal-list");
  list.replaceChildren();
  const entries = state.log.slice(-5);
  for (const entry of entries) {
    const item = document.createElement("li");
    item.className = "journal-item";

    const time = document.createElement("time");
    time.className = "journal-time";
    time.textContent = entry.time;

    const pin = document.createElement("span");
    pin.className = "journal-pin";
    pin.setAttribute("aria-hidden", "true");

    const body = document.createElement("div");
    body.className = "journal-entry";
    const title = document.createElement("strong");
    title.textContent = `${entry.title} · ${entry.place}`;
    const detail = document.createElement("p");
    detail.textContent = entry.detail;
    body.append(title, detail);
    item.append(time, pin, body);
    list.append(item);
  }
  $("#journal-counter").textContent = `${String(state.log.length).padStart(2, "0")} NOTE${state.log.length > 1 ? "S" : ""}`;
}

function render() {
  renderStats();
  renderProgress();
  renderScene();
  renderMap();
  renderMission();
  renderJournal();
  saveGame();
}

function actualMinutes(choice) {
  return travelMinutes(choice);
}

function applyWorkOutcome(choice) {
  const isOnTime = state.time <= DAILY_DEADLINE;
  state.delivered = isOnTime;

  if (choice.id === "deliver-direct") {
    if (isOnTime) {
      state.money += 6800;
      changeStat("reputation", 2, 5);
      changeStat("network", 1, 5);
      return "Tu remets l’épreuve à Naya avant midi. Elle valide le travail et te recommande au studio.";
    }
    state.money += 1900;
    changeStat("reputation", -1, 5);
    return "Tu arrives après midi. Naya récupère l’épreuve, mais la prochaine commande attendra.";
  }

  if (choice.id === "print-detour") {
    if (isOnTime) {
      state.money += 9200;
      changeStat("reputation", 3, 5);
      changeStat("network", 1, 5);
      return "Le détour par l’imprimeur paie : la finition est nette et la maquette arrive avant midi.";
    }
    state.money += 3200;
    changeStat("reputation", 1, 5);
    return "Le tirage est beau, mais le détour repousse la remise. Naya apprécie l’effort; le bonus, lui, attendra.";
  }

  if (isOnTime) {
    state.money += 5700;
    changeStat("reputation", 1, 5);
    return "Tu aides l’atelier, puis remets la maquette à temps. Deux personnes repartent avec une bonne raison de se rappeler de toi.";
  }
  state.money += 1800;
  return "Le coup de main crée un lien, mais la maquette arrive après midi. Tu prends rendez-vous pour en reparler.";
}

function applyRoute(choice, stage) {
  if (stage === "commute") {
    const path = choice.travel?.path || ["yopougon", "adjame", "plateau"];
    mergeMapTrace(path);
    state.location = "plateau";
    state.routeName = choice.title;
    return;
  }

  if (stage === "crossTown") {
    const path = choice.travel?.path || ["plateau", "treichville"];
    mergeMapTrace(path);
    state.location = "treichville";
    state.routeName = choice.title;
    return;
  }

  if (stage === "evening" && choice.id === "go-home") {
    const path = choice.travel?.path || ["treichville", "plateau", "adjame", "yopougon"];
    mergeMapTrace(path);
    state.location = "yopougon";
    state.routeName = "Retour vers Yopougon";
  }
}

function choiceResultText(choice, stage, elapsed) {
  const arrival = formatTime(state.time);
  if (stage === "breakfast") {
    const extra = choice.id === "garba" ? "Une conversation au maquis t’a donné un tuyau sur la circulation." : "Tu ajustes ton budget et tu prends ton élan.";
    return `${extra} Il est ${arrival}.`;
  }
  if (stage === "commute") {
    const transfer = choice.id === "bateau" ? "La lagune t’a offert un autre point de vue sur la ville." : "Adjamé a donné le tempo de la traversée.";
    return `${transfer} Tu arrives au Plateau à ${arrival}.`;
  }
  if (stage === "work") return applyWorkOutcome(choice);
  if (stage === "lunch") {
    const extra = choice.network > 0 ? "La pause a aussi fait grandir ton réseau." : "Tu repars avec un peu plus d’énergie.";
    return `${extra} La suite de la journée t’attend.`;
  }
  if (stage === "crossTown") {
    return `Tu arrives à Treichville à ${arrival}. Le prochain rendez-vous est de l’autre côté de la ville.`;
  }
  if (stage === "evening") {
    return choice.id === "go-home"
      ? `Tu retrouves Yopougon à ${arrival}. La journée peut se poser.`
      : `Tu termines à Treichville à ${arrival}, au milieu des voix et des retrouvailles.`;
  }
  return `Tu avances de ${formatDuration(elapsed)}.`;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

function handleChoice(choiceId) {
  if (state.stage === "final") return;
  const stage = state.stage;
  const scene = sceneFor();
  const choice = scene.options.find((option) => option.id === choiceId);
  if (!choice) return;
  if (state.money < choice.cost) {
    showToast("Il te manque un peu de monnaie pour cette option.");
    return;
  }

  const elapsed = actualMinutes(choice);
  state.money = Math.max(0, state.money - choice.cost + choice.reward);
  state.time += elapsed;
  changeStat("energy", choice.energy, 10);
  changeStat("network", choice.network, 5);
  changeStat("reputation", choice.reputation, 5);
  applyRoute(choice, stage);

  const result = choiceResultText(choice, stage, elapsed);
  state.feedback = result;
  addJournal(choice.title, result);
  state.stage = nextStage[stage] || "final";

  if (state.stage === "final") {
    state.feedback = "La ville baisse le volume. Ton carnet garde la trace de cette journée.";
    addJournal("La journée se termine", `Bilan à ${formatTime(state.time)} · ${PLACES[state.location]?.name || "Abidjan"}.`);
  }

  render();
  showToast(`${formatTime(state.time)} · ${result}`);
}

function startNewDay(force = false) {
  if (!force && state.log.length > 1) {
    const shouldRestart = window.confirm("Recommencer la journée ? Ta progression actuelle sera remplacée.");
    if (!shouldRestart) return;
  }
  state = createInitialState();
  render();
  showToast("Une nouvelle journée commence à Yopougon.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindEvents() {
  $("#scene-card").addEventListener("click", (event) => {
    const choiceButton = event.target.closest("[data-choice]");
    if (choiceButton && !choiceButton.disabled) {
      handleChoice(choiceButton.dataset.choice);
      return;
    }
    const replayButton = event.target.closest('[data-action="replay"]');
    if (replayButton) startNewDay(true);
  });

  $("#reset-button").addEventListener("click", () => startNewDay());

  const dialog = $("#glossary-dialog");
  $("#glossary-button").addEventListener("click", () => {
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  });
  $("#close-glossary").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

bindEvents();
render();
