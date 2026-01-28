// Word lists for HintGrid game

import { shuffle } from "./game-utils";
import type { WordPack } from "./types";

// Re-export WordPack type for convenience
export type { WordPack };

// Local type for pack selection (single or array)
type PackSelection = WordPack | WordPack[];

// Classic party game words (official 400-word set)
export const CLASSIC_WORDS = [
  // A
  "AFRICA", "AGENT", "AIR", "ALIEN", "ALPS", "AMAZON", "AMBULANCE", "AMERICA", "ANGEL", "ANTARCTICA",
  "APPLE", "ARM", "ATLANTIS", "AUSTRALIA", "AZTEC",
  // B
  "BACK", "BALL", "BAND", "BANK", "BAR", "BARK", "BAT", "BATTERY", "BEACH", "BEAR",
  "BEAT", "BED", "BEIJING", "BELL", "BELT", "BERLIN", "BERMUDA", "BERRY", "BILL", "BLOCK",
  "BOARD", "BOLT", "BOMB", "BOND", "BOOM", "BOOT", "BOTTLE", "BOW", "BOX", "BRIDGE",
  "BRUSH", "BUCK", "BUFFALO", "BUG", "BUGLE", "BUTTON",
  // C
  "CALF", "CANADA", "CAP", "CAPITAL", "CAR", "CARD", "CARROT", "CASINO", "CAST", "CAT",
  "CELL", "CENTAUR", "CENTER", "CHAIR", "CHANGE", "CHARGE", "CHECK", "CHEST", "CHICK", "CHINA",
  "CHOCOLATE", "CHURCH", "CIRCLE", "CLIFF", "CLOAK", "CLOCK", "CLUB", "CODE", "COLD", "COMIC",
  "COMPOUND", "CONCERT", "CONDUCTOR", "CONTRACT", "COOK", "COPPER", "COTTON", "COURT", "COVER", "CRANE",
  "CRASH", "CRICKET", "CROSS", "CROWN", "CYCLE", "CZECH",
  // D
  "DANCE", "DATE", "DAY", "DEATH", "DECK", "DEGREE", "DIAMOND", "DICE", "DINOSAUR", "DISEASE",
  "DOCTOR", "DOG", "DRAFT", "DRAGON", "DRESS", "DRILL", "DROP", "DUCK", "DWARF",
  // E
  "EAGLE", "EGYPT", "EMBASSY", "ENGINE", "ENGLAND", "EUROPE", "EYE",
  // F
  "FACE", "FAIR", "FALL", "FAN", "FENCE", "FIELD", "FIGHTER", "FIGURE", "FILE", "FILM",
  "FIRE", "FISH", "FLUTE", "FLY", "FOOT", "FORCE", "FOREST", "FORK", "FRANCE",
  // G
  "GAME", "GAS", "GENIUS", "GERMANY", "GHOST", "GIANT", "GLASS", "GLOVE", "GOLD", "GRACE",
  "GRASS", "GREECE", "GREEN", "GROUND",
  // H
  "HAM", "HAND", "HAWK", "HEAD", "HEART", "HELICOPTER", "HIMALAYAS", "HOLE", "HOLLYWOOD", "HONEY",
  "HOOD", "HOOK", "HORN", "HORSE", "HORSESHOE", "HOSPITAL", "HOTEL",
  // I
  "ICE", "ICE CREAM", "INDIA", "IRON", "IVORY",
  // J
  "JACK", "JAM", "JET", "JUPITER",
  // K
  "KANGAROO", "KETCHUP", "KEY", "KID", "KING", "KIWI", "KNIFE", "KNIGHT",
  // L
  "LAB", "LAP", "LASER", "LAWYER", "LEAD", "LEMON", "LEPRECHAUN", "LIFE", "LIGHT", "LIMOUSINE",
  "LINE", "LINK", "LION", "LITTER", "LOCH NESS", "LOCK", "LOG", "LONDON", "LUCK",
  // M
  "MAIL", "MAMMOTH", "MAPLE", "MARBLE", "MARCH", "MASS", "MATCH", "MERCURY", "MEXICO", "MICROSCOPE",
  "MILLIONAIRE", "MINE", "MINT", "MISSILE", "MODEL", "MOLE", "MOON", "MOSCOW", "MOUNT", "MOUSE",
  "MOUTH", "MUG",
  // N
  "NAIL", "NEEDLE", "NET", "NEW YORK", "NIGHT", "NINJA", "NOTE", "NOVEL", "NURSE", "NUT",
  // O
  "OCTOPUS", "OIL", "OLIVE", "OLYMPUS", "OPERA", "ORANGE", "ORGAN",
  // P
  "PALM", "PAN", "PANTS", "PAPER", "PARACHUTE", "PARK", "PART", "PASS", "PASTE", "PENGUIN",
  "PHOENIX", "PIANO", "PIE", "PILOT", "PIN", "PIPE", "PIRATE", "PISTOL", "PIT", "PITCH",
  "PLANE", "PLASTIC", "PLATE", "PLATYPUS", "PLAY", "PLOT", "POINT", "POISON", "POLE", "POLICE",
  "POOL", "PORT", "POST", "POUND", "PRESS", "PRINCESS", "PUMPKIN", "PUPIL", "PYRAMID",
  // Q
  "QUEEN",
  // R
  "RABBIT", "RACKET", "RAY", "REVOLUTION", "RING", "ROBIN", "ROBOT", "ROCK", "ROME", "ROOT",
  "ROSE", "ROULETTE", "ROUND", "ROW", "RULER",
  // S
  "SATELLITE", "SATURN", "SCALE", "SCHOOL", "SCIENTIST", "SCORPION", "SCREEN", "SCUBA DIVER", "SEAL", "SERVER",
  "SHADOW", "SHAKESPEARE", "SHARK", "SHIP", "SHOE", "SHOP", "SHOT", "SINK", "SKYSCRAPER", "SLIP",
  "SLUG", "SMUGGLER", "SNOW", "SNOWMAN", "SOCK", "SOLDIER", "SOUL", "SOUND", "SPACE", "SPELL",
  "SPIDER", "SPIKE", "SPINE", "SPOT", "SPRING", "SPY", "SQUARE", "STADIUM", "STAFF", "STAMP",
  "STAR", "STATE", "STICK", "STOCK", "STRAW", "STREAM", "STRIKE", "STRING", "SUB", "SUIT",
  "SUPERHERO", "SWING", "SWITCH",
  // T
  "TABLE", "TABLET", "TAG", "TAIL", "TAP", "TEACHER", "TELESCOPE", "TEMPLE", "THEATER", "THIEF",
  "THUMB", "TICK", "TIE", "TIME", "TOKYO", "TOOTH", "TORCH", "TOWER", "TRACK", "TRAIN",
  "TRIANGLE", "TRIP", "TRUNK", "TUBE", "TURKEY",
  // U
  "UNDERTAKER", "UNICORN",
  // V
  "VACUUM", "VAN", "VET",
  // W
  "WAKE", "WALL", "WAR", "WASHER", "WASHINGTON", "WATCH", "WATER", "WAVE", "WEB", "WELL",
  "WHALE", "WHIP", "WIND", "WITCH", "WORM",
  // Y
  "YARD"
];

// Kahoot! themed words for team building
export const KAHOOT_WORDS = [
  // Game Mechanics
  "HOST", "PLAYER", "LOBBY", "PODIUM", "PIN", "JOIN", "POINTS", "STREAK", "COMBO", "TIMER",
  "SCORE", "WINNER", "RANKING", "LEADERBOARD", "BONUS", "BOOST", "COUNTDOWN", "ANSWER", "QUESTION", "CORRECT",
  "MUSIC", "CELEBRATE", "COMPETE", "RACE", "PLAY",
  // Content/Product
  "QUIZ", "POLL", "SURVEY", "SLIDE", "PUZZLE", "CHALLENGE", "TEMPLATE", "COLLECTION", "LIBRARY", "DISCOVER",
  "CREATE", "SHARE", "DRAFT", "PUBLISH", "PREVIEW", "DUPLICATE", "FOLDER", "SEARCH", "FILTER", "TAG",
  // Education
  "STUDY", "LEARN", "ASSIGN", "REPORT", "STUDENT", "TEACHER", "CLASS", "COURSE", "LESSON", "PRACTICE",
  "REVIEW", "FLASHCARD", "MEMORY", "BRAIN", "THINK", "FOCUS", "TEST", "EXAM", "GRADE", "PROGRESS",
  // General/Fun
  "TEAM", "GROUP", "FAST", "CHOICE", "SELECT", "OPTION", "ROUND", "LEVEL", "STAGE", "CHAMPION",
  "TROPHY", "MEDAL", "CONFETTI", "PARTY", "ENERGY", "SPARK", "FLASH", "INSTANT", "LIGHTNING", "ROCKET"
];

// Geography pack - countries, cities, landmarks, terrain
export const GEOGRAPHY_WORDS = [
  // Countries & Regions
  "ICELAND", "BRAZIL", "JAPAN", "KENYA", "NORWAY", "PERU", "SPAIN", "VIETNAM", "IRELAND", "MOROCCO",
  "SWEDEN", "CHILE", "POLAND", "THAILAND", "PORTUGAL", "ARGENTINA", "KOREA", "FINLAND", "CUBA", "NEPAL",
  "SCOTLAND", "SINGAPORE", "TAIWAN", "JAMAICA", "SWITZERLAND", "AUSTRIA", "BELGIUM", "DENMARK", "UKRAINE", "COLOMBIA",
  // Cities
  "PARIS", "CAIRO", "DUBAI", "SYDNEY", "VENICE", "PRAGUE", "VIENNA", "ATHENS", "LISBON", "MUNICH",
  "BOSTON", "SEATTLE", "MIAMI", "DENVER", "CHICAGO", "DALLAS", "PHOENIX", "PORTLAND", "MONTREAL", "TORONTO",
  "BARCELONA", "AMSTERDAM", "BUDAPEST", "FLORENCE", "NAPLES", "MILAN", "OSLO", "STOCKHOLM", "DUBLIN", "EDINBURGH",
  "HAVANA", "BANGKOK", "MANILA", "SEOUL", "SHANGHAI", "MUMBAI", "DELHI", "ISTANBUL", "JERUSALEM", "MECCA",
  // Landmarks & Wonders
  "EIFFEL", "COLOSSEUM", "TAJ MAHAL", "STONEHENGE", "PARTHENON", "KREMLIN", "ACROPOLIS", "SPHINX", "PANTHEON", "PAGODA",
  "NOTRE DAME", "BIG BEN", "LOUVRE", "VATICAN", "VERSAILLES", "ALHAMBRA", "PETRA", "ANGKOR", "MACHU PICCHU", "EASTER ISLAND",
  // Natural Features
  "SAHARA", "CANYON", "VOLCANO", "DELTA", "FJORD", "GLACIER", "GEYSER", "REEF", "CAPE", "BAY",
  "PENINSULA", "STRAIT", "LAGOON", "PLATEAU", "BASIN", "TUNDRA", "STEPPE", "SAVANNA", "RAINFOREST", "ARCHIPELAGO",
  "DUNE", "OASIS", "GORGE", "ATOLL", "MARSH", "PRAIRIE", "MESA", "BUTTE", "COVE", "INLET",
  // Rivers & Bodies of Water
  "NILE", "DANUBE", "RHINE", "THAMES", "GANGES", "YANGTZE", "MEKONG", "TIGRIS", "EUPHRATES", "ZAMBEZI",
  "CARIBBEAN", "MEDITERRANEAN", "PACIFIC", "ATLANTIC", "ARCTIC", "INDIAN OCEAN", "BLACK SEA", "RED SEA", "BALTIC", "ADRIATIC",
  // Mountains & Ranges
  "EVEREST", "KILIMANJARO", "FUJI", "MATTERHORN", "VESUVIUS", "ETNA", "ANDES", "ROCKIES", "PYRENEES", "CAUCASUS",
  "APPALACHIAN", "SIERRA", "ATLAS", "URALS", "CARPATHIAN", "DOLOMITES", "OLYMPUS", "SINAI", "DENALI", "ACONCAGUA",
  // Geographic Terms
  "EQUATOR", "MERIDIAN", "TROPIC", "LATITUDE", "LONGITUDE", "HEMISPHERE", "CONTINENT", "BORDER", "TERRITORY", "PROVINCE",
  "COMPASS", "GLOBE", "MAP", "CARTOGRAPHER", "EXPEDITION", "FRONTIER", "COLONY", "EMPIRE", "KINGDOM", "REPUBLIC",
  // Islands
  "HAWAII", "BALI", "SICILY", "CRETE", "CORSICA", "SARDINIA", "CYPRUS", "MALTA", "FIJI", "TAHITI",
  "BAHAMAS", "BARBADOS", "CANARY", "GALAPAGOS", "MADAGASCAR", "ZANZIBAR", "BORNEO", "SUMATRA", "JAVA", "MAURITIUS"
];

// Pop Culture pack - entertainment, media, archetypes
export const POP_CULTURE_WORDS = [
  // Music
  "GUITAR", "DRUMS", "BASS", "VINYL", "ALBUM", "CONCERT", "TOUR", "STAGE", "ENCORE", "ANTHEM",
  "BALLAD", "REMIX", "TEMPO", "RHYTHM", "MELODY", "CHORUS", "VERSE", "LYRIC", "DUET", "SOLO",
  "DJ", "MICROPHONE", "SPEAKER", "HEADPHONES", "AMPLIFIER", "SYNTHESIZER", "JUKEBOX", "KARAOKE", "GRAMMY", "PLATINUM",
  // Film & TV
  "DIRECTOR", "ACTOR", "SCENE", "SCRIPT", "SEQUEL", "PREQUEL", "TRAILER", "PREMIERE", "BLOCKBUSTER", "INDIE",
  "DOCUMENTARY", "ANIMATION", "HORROR", "COMEDY", "DRAMA", "THRILLER", "WESTERN", "MUSICAL", "SITCOM", "SOAP",
  "EMMY", "OSCAR", "POPCORN", "CREDITS", "CAMEO", "STUNT", "MONTAGE", "FLASHBACK", "CLIFFHANGER", "TWIST",
  // Characters & Archetypes
  "HERO", "VILLAIN", "SIDEKICK", "MENTOR", "REBEL", "OUTLAW", "DETECTIVE", "SHERIFF", "COWBOY", "SAMURAI",
  "WIZARD", "WARRIOR", "ARCHER", "ASSASSIN", "GLADIATOR", "CHAMPION", "LEGEND", "ICON", "IDOL", "DIVA",
  "PRODIGY", "GENIUS", "MASTERMIND", "MAVERICK", "ROOKIE", "VETERAN", "UNDERDOG", "RIVAL", "NEMESIS", "ALLY",
  // Gaming
  "CONSOLE", "CONTROLLER", "JOYSTICK", "ARCADE", "PIXEL", "AVATAR", "QUEST", "BOSS", "LEVEL", "CHECKPOINT",
  "RESPAWN", "LOOT", "INVENTORY", "COMBO", "MULTIPLAYER", "SPEEDRUN", "GLITCH", "MOD", "PATCH", "DLC",
  // Internet & Social
  "MEME", "VIRAL", "TRENDING", "HASHTAG", "SELFIE", "STREAM", "PODCAST", "VLOG", "INFLUENCER", "FOLLOWER",
  "LIKE", "SHARE", "COMMENT", "SUBSCRIBE", "NOTIFICATION", "FEED", "PROFILE", "HANDLE", "TROLL", "BOT",
  // Fashion & Style
  "RUNWAY", "MODEL", "DESIGNER", "VINTAGE", "RETRO", "HIPSTER", "PUNK", "GRUNGE", "GOTH", "PREPPY",
  "DENIM", "LEATHER", "SNEAKER", "HOODIE", "SUNGLASSES", "TATTOO", "PIERCING", "MAKEUP", "HAIRSTYLE", "ACCESSORY",
  // Events & Celebrations
  "FESTIVAL", "CARNIVAL", "PARADE", "RAVE", "GALA", "OPENING NIGHT", "AWARDS", "CEREMONY", "AFTERPARTY", "VIP",
  // Media Terms
  "HEADLINE", "TABLOID", "PAPARAZZI", "SCANDAL", "GOSSIP", "RUMOR", "EXCLUSIVE", "INTERVIEW", "REVIEW", "CRITIC",
  "RATING", "CHART", "BILLBOARD", "BESTSELLER", "FRANCHISE", "REBOOT", "SPINOFF", "CROSSOVER", "PARODY", "SATIRE"
];

// Science pack - chemistry, physics, biology, medicine
export const SCIENCE_WORDS = [
  // Chemistry
  "ATOM", "MOLECULE", "ELEMENT", "COMPOUND", "ELECTRON", "PROTON", "NEUTRON", "ION", "ISOTOPE", "BOND",
  "ACID", "BASE", "CATALYST", "REACTION", "SOLUTION", "CRYSTAL", "POLYMER", "ENZYME", "PROTEIN", "DNA",
  "CARBON", "OXYGEN", "NITROGEN", "HYDROGEN", "HELIUM", "SODIUM", "CHLORINE", "SULFUR", "PHOSPHORUS", "CALCIUM",
  "FORMULA", "PERIODIC", "LABORATORY", "BEAKER", "FLASK", "BURNER", "PIPETTE", "CENTRIFUGE", "SPECTROMETER", "TITRATION",
  // Physics
  "GRAVITY", "FORCE", "MASS", "ENERGY", "VELOCITY", "MOMENTUM", "FRICTION", "PRESSURE", "DENSITY", "VOLUME",
  "WAVE", "FREQUENCY", "AMPLITUDE", "PHOTON", "QUANTUM", "PARTICLE", "FIELD", "MAGNET", "CURRENT", "VOLTAGE",
  "CIRCUIT", "CONDUCTOR", "RESISTOR", "CAPACITOR", "TRANSISTOR", "SEMICONDUCTOR", "LASER", "PRISM", "LENS", "SPECTRUM",
  "RELATIVITY", "ENTROPY", "THERMODYNAMICS", "KINETIC", "POTENTIAL", "NUCLEAR", "FUSION", "FISSION", "RADIATION", "DECAY",
  // Biology
  "CELL", "NUCLEUS", "MEMBRANE", "CHROMOSOME", "GENE", "RNA", "VIRUS", "BACTERIA", "FUNGUS", "PARASITE",
  "ORGAN", "TISSUE", "MUSCLE", "NERVE", "BONE", "BLOOD", "HEART", "BRAIN", "LUNG", "LIVER",
  "SPECIES", "EVOLUTION", "MUTATION", "ADAPTATION", "HABITAT", "ECOSYSTEM", "PREDATOR", "PREY", "SYMBIOSIS", "EXTINCTION",
  "PHOTOSYNTHESIS", "RESPIRATION", "METABOLISM", "DIGESTION", "IMMUNE", "ANTIBODY", "VACCINE", "HORMONE", "NEURON", "SYNAPSE",
  // Medicine
  "DOCTOR", "SURGEON", "NURSE", "PATIENT", "DIAGNOSIS", "SYMPTOM", "TREATMENT", "THERAPY", "PRESCRIPTION", "DOSE",
  "INJECTION", "TRANSFUSION", "TRANSPLANT", "SURGERY", "BIOPSY", "SCAN", "XRAY", "MRI", "ULTRASOUND", "STETHOSCOPE",
  "PHARMACY", "ANTIBIOTIC", "PAINKILLER", "ANESTHETIC", "SEDATIVE", "STIMULANT", "STEROID", "INSULIN", "ADRENALINE", "DOPAMINE",
  // Scientific Method
  "HYPOTHESIS", "THEORY", "EXPERIMENT", "OBSERVATION", "DATA", "ANALYSIS", "RESULT", "CONCLUSION", "VARIABLE", "CONTROL",
  "SAMPLE", "MEASURE", "CALIBRATE", "REPLICATE", "PEER REVIEW", "PUBLICATION", "CITATION", "BREAKTHROUGH", "DISCOVERY", "INVENTION"
];

// Space pack - astronomy, exploration, cosmic phenomena
export const SPACE_WORDS = [
  // Solar System
  "SUN", "MERCURY", "VENUS", "EARTH", "MARS", "JUPITER", "SATURN", "URANUS", "NEPTUNE", "PLUTO",
  "MOON", "ASTEROID", "COMET", "METEOR", "CRATER", "RING", "ORBIT", "ECLIPSE", "EQUINOX", "SOLSTICE",
  "TITAN", "EUROPA", "GANYMEDE", "CALLISTO", "IO", "TRITON", "PHOBOS", "DEIMOS", "CHARON", "CERES",
  // Stars & Galaxies
  "STAR", "CONSTELLATION", "GALAXY", "NEBULA", "SUPERNOVA", "PULSAR", "QUASAR", "BLACK HOLE", "WHITE DWARF", "RED GIANT",
  "MILKY WAY", "ANDROMEDA", "ORION", "CASSIOPEIA", "URSA", "POLARIS", "SIRIUS", "BETELGEUSE", "VEGA", "RIGEL",
  "BINARY", "CLUSTER", "SPIRAL", "ELLIPTICAL", "DWARF GALAXY", "DARK MATTER", "DARK ENERGY", "COSMIC RAY", "GAMMA RAY", "NOVA",
  // Space Exploration
  "ROCKET", "SHUTTLE", "CAPSULE", "MODULE", "STATION", "SATELLITE", "PROBE", "ROVER", "LANDER", "ORBITER",
  "ASTRONAUT", "COSMONAUT", "MISSION", "LAUNCH", "LIFTOFF", "COUNTDOWN", "TRAJECTORY", "DOCKING", "SPLASHDOWN", "REENTRY",
  "NASA", "APOLLO", "VOYAGER", "HUBBLE", "CURIOSITY", "PERSEVERANCE", "SPUTNIK", "SKYLAB", "COLUMBIA", "CHALLENGER",
  // Cosmic Phenomena
  "GRAVITY", "WORMHOLE", "SINGULARITY", "EVENT HORIZON", "SPACETIME", "DIMENSION", "ANTIMATTER", "PLASMA", "RADIATION", "VOID",
  "BIG BANG", "EXPANSION", "REDSHIFT", "BLUESHIFT", "DOPPLER", "PARALLAX", "LUMINOSITY", "MAGNITUDE", "LIGHT YEAR", "PARSEC",
  // Equipment & Technology
  "TELESCOPE", "OBSERVATORY", "ANTENNA", "RADAR", "SPECTROGRAPH", "PHOTOMETER", "GYROSCOPE", "THRUSTER", "SOLAR PANEL", "HEAT SHIELD",
  "SPACESUIT", "HELMET", "VISOR", "AIRLOCK", "HATCH", "PAYLOAD", "BOOSTER", "FUEL", "PROPELLANT", "OXIDIZER",
  // Concepts
  "COSMOS", "UNIVERSE", "INFINITY", "ETERNITY", "CELESTIAL", "EXTRATERRESTRIAL", "ALIEN", "UFO", "CONTACT", "SIGNAL",
  "COLONIZATION", "TERRAFORMING", "HABITAT", "BIOSPHERE", "ATMOSPHERE", "MAGNETOSPHERE", "EXOPLANET", "HABITABLE ZONE", "GOLDILOCKS", "FRONTIER",
  // Famous Astronomers & Missions
  "GALILEO", "COPERNICUS", "KEPLER", "NEWTON", "EINSTEIN", "HAWKING", "SAGAN", "ARMSTRONG", "ALDRIN", "GAGARIN"
];

// Nature pack - animals, plants, weather, ecosystems
export const NATURE_WORDS = [
  // Mammals
  "WOLF", "FOX", "DEER", "MOOSE", "ELK", "BISON", "BOAR", "BADGER", "OTTER", "BEAVER",
  "SQUIRREL", "HEDGEHOG", "PORCUPINE", "SKUNK", "RACCOON", "OPOSSUM", "ARMADILLO", "SLOTH", "ANTEATER", "PANGOLIN",
  "GORILLA", "CHIMPANZEE", "ORANGUTAN", "BABOON", "LEMUR", "KOALA", "WOMBAT", "TASMANIAN", "JAGUAR", "LEOPARD",
  "CHEETAH", "PANTHER", "COUGAR", "LYNX", "BOBCAT", "HYENA", "JACKAL", "COYOTE", "DINGO", "FENNEC",
  // Birds
  "FALCON", "OSPREY", "CONDOR", "VULTURE", "RAVEN", "CROW", "MAGPIE", "JAY", "CARDINAL", "BLUEBIRD",
  "SPARROW", "FINCH", "WARBLER", "THRUSH", "WREN", "SWALLOW", "SWIFT", "HUMMINGBIRD", "KINGFISHER", "WOODPECKER",
  "PELICAN", "HERON", "CRANE", "STORK", "IBIS", "FLAMINGO", "SWAN", "GOOSE", "MALLARD", "PUFFIN",
  "PARROT", "TOUCAN", "MACAW", "COCKATOO", "PEACOCK", "PHEASANT", "QUAIL", "GROUSE", "TURKEY", "OSTRICH",
  // Reptiles & Amphibians
  "CROCODILE", "ALLIGATOR", "IGUANA", "GECKO", "CHAMELEON", "KOMODO", "MONITOR", "COBRA", "PYTHON", "VIPER",
  "RATTLESNAKE", "ANACONDA", "BOA", "TORTOISE", "TURTLE", "TERRAPIN", "NEWT", "SALAMANDER", "AXOLOTL", "TOAD",
  // Sea Life
  "DOLPHIN", "ORCA", "PORPOISE", "MANATEE", "WALRUS", "SEA LION", "DUGONG", "NARWHAL", "BELUGA", "HUMPBACK",
  "MANTA", "STINGRAY", "BARRACUDA", "SWORDFISH", "MARLIN", "TUNA", "SALMON", "TROUT", "BASS", "CARP",
  "JELLYFISH", "STARFISH", "SEA URCHIN", "SEAHORSE", "CORAL", "ANEMONE", "CLAM", "OYSTER", "MUSSEL", "CRAB",
  "LOBSTER", "SHRIMP", "SQUID", "NAUTILUS", "URCHIN", "BARNACLE", "KELP", "SEAWEED", "PLANKTON", "KRILL",
  // Insects & Arachnids
  "BUTTERFLY", "MOTH", "DRAGONFLY", "DAMSELFLY", "BEETLE", "LADYBUG", "FIREFLY", "GRASSHOPPER", "CRICKET", "CICADA",
  "ANT", "TERMITE", "BEE", "WASP", "HORNET", "FLY", "MOSQUITO", "FLEA", "TICK", "MITE",
  "TARANTULA", "SCORPION", "CENTIPEDE", "MILLIPEDE", "MANTIS", "STICK INSECT", "CATERPILLAR", "MAGGOT", "LARVA", "COCOON",
  // Plants & Trees
  "OAK", "PINE", "CEDAR", "REDWOOD", "SEQUOIA", "BIRCH", "WILLOW", "ASH", "ELM", "BEECH",
  "BAMBOO", "PALM", "CACTUS", "FERN", "MOSS", "LICHEN", "IVY", "VINE", "SHRUB", "BUSH",
  "ORCHID", "LILY", "TULIP", "DAISY", "SUNFLOWER", "LOTUS", "IRIS", "VIOLET", "JASMINE", "LAVENDER",
  // Weather & Elements
  "STORM", "THUNDER", "LIGHTNING", "TORNADO", "HURRICANE", "CYCLONE", "TYPHOON", "MONSOON", "BLIZZARD", "AVALANCHE",
  "FLOOD", "DROUGHT", "HEATWAVE", "FROST", "DEW", "FOG", "MIST", "HAZE", "RAINBOW", "AURORA",
  "BREEZE", "GUST", "GALE", "SQUALL", "HAIL", "SLEET", "ICICLE", "SNOWFLAKE", "RAINDROP", "PUDDLE",
  // Ecosystems & Habitats
  "JUNGLE", "SWAMP", "WETLAND", "MANGROVE", "CORAL REEF", "TIDE POOL", "CAVE", "CAVERN", "GROTTO", "RAVINE",
  "MEADOW", "PASTURE", "ORCHARD", "GROVE", "THICKET", "CLEARING", "UNDERGROWTH", "CANOPY", "UNDERSTORY", "ROOT"
];

// Keep WORD_LIST as alias for backward compatibility
export const WORD_LIST = CLASSIC_WORDS;

// Type alias for pack selection - single pack or array of packs
type WordPackSelection = WordPack | WordPack[];

// Map of pack names to their word lists
const WORD_PACKS: Record<WordPack, string[]> = {
  classic: CLASSIC_WORDS,
  kahoot: KAHOOT_WORDS,
  geography: GEOGRAPHY_WORDS,
  popculture: POP_CULTURE_WORDS,
  science: SCIENCE_WORDS,
  space: SPACE_WORDS,
  nature: NATURE_WORDS,
};

// Get the word list for a given pack
export function getWordList(pack: WordPack = "classic"): string[] {
  return WORD_PACKS[pack] ?? CLASSIC_WORDS;
}

// Combine multiple word packs into one deduplicated list
export function getCombinedWordList(packs: WordPack[]): string[] {
  if (packs.length === 0) {
    return CLASSIC_WORDS;
  }
  
  if (packs.length === 1) {
    return getWordList(packs[0]);
  }
  
  // Combine all packs and deduplicate
  const combined = new Set<string>();
  for (const pack of packs) {
    const words = getWordList(pack);
    for (const word of words) {
      combined.add(word);
    }
  }
  
  return Array.from(combined);
}

// Get display name for a word pack
export function getPackDisplayName(pack: WordPack): string {
  const names: Record<WordPack, string> = {
    classic: "Classic",
    kahoot: "Kahoot",
    geography: "Geography",
    popculture: "Pop Culture",
    science: "Science",
    space: "Space",
    nature: "Nature",
  };
  return names[pack] ?? pack;
}

// Get display name for pack selection (single or multiple)
export function getPackSelectionDisplayName(selection: WordPackSelection): string {
  if (Array.isArray(selection)) {
    if (selection.length === 0) return "Classic";
    if (selection.length === 1) return getPackDisplayName(selection[0]);
    return selection.map(getPackDisplayName).join(" + ");
  }
  return getPackDisplayName(selection);
}

// Get all available word packs
export function getAvailablePacks(): WordPack[] {
  return Object.keys(WORD_PACKS) as WordPack[];
}

// Get word count for a pack selection
export function getWordCount(selection: WordPackSelection): number {
  if (Array.isArray(selection)) {
    return getCombinedWordList(selection).length;
  }
  return getWordList(selection).length;
}

// Generate a board from a single pack or multiple packs
export function generateBoard(packs: WordPackSelection = "classic"): string[] {
  const wordList = Array.isArray(packs) 
    ? getCombinedWordList(packs) 
    : getWordList(packs);
  const shuffled = shuffle(wordList);
  return shuffled.slice(0, 25);
}

export function assignTeams(
  board: string[],
  startingTeam: "red" | "blue"
): { word: string; team: "red" | "blue" | "neutral" | "trap" }[] {
  const startingCount = 9;
  const otherCount = 8;
  const neutralCount = 7;
  const otherTeam = startingTeam === "red" ? "blue" : "red";

  const teams: ("red" | "blue" | "neutral" | "trap")[] = [
    ...Array(startingCount).fill(startingTeam),
    ...Array(otherCount).fill(otherTeam),
    ...Array(neutralCount).fill("neutral"),
    "trap",
  ];
  
  const shuffledTeams = shuffle(teams);
  
  return board.map((word, index) => ({
    word,
    team: shuffledTeams[index],
  }));
}
