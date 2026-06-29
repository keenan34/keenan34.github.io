const TAG_BANKS = {
  tripleDouble: [
    "#TripleDouble", "#Complete", "#Everywhere", "#Different", "#FilledSheet",
    "#AllAround", "#Monster", "#Special", "#TripleThreat",
  ],
  doubleDouble: [
    "#DoubleDouble", "#TwoWayNight", "#BigGame", "#Numbers", "#DoingItAll",
    "#BothCategories", "#CompleteGame",
  ],
  allAround: [
    "#Versatile", "#DoItAll", "#DoingEverything", "#BaggedOut",
  ],
  scoringNuclear: [
    "#Nuclear", "#Unstoppable", "#Buckets", "#Torching", "#Unreal",
    "#Masterclass", "#CantGuardHim", "#ThirtyPiece", "#30Bomb",
  ],
  scoringBig: [
    "#Cooking", "#Problem", "#Certified", "#Tough", "#BagWork",
    "#TooEasy", "#WalkingBucket", "#TwentyPiece", "#GOATMode",
  ],
  scoringImpact: [
    "#Scorer", "#Bag", "#GettingBuckets", "#TheyKnow", "#ThrowingBags",
    "#OnOne",
  ],
  assistElite: [
    "#Dimer", "#PointGod", "#Playmaker", "#Vision", "#Maestro",
    "#Creator", "#FloorGeneral", "#EverybodyEats", "#TenDimes", "#Dot",
  ],
  assistStrong: [
    "#Disher", "#GoodLooks", "#TeamFirst", "#DimeDropper",
  ],
  assistSupport: [
    "#Unselfish", "#ExtraPass", "#FindingPeople", "#Facilitator",
  ],
  reboundElite: [
    "#Boardman", "#Horse", "#Glasswork", "#Cleaning", "#BigBody",
    "#PaintBeast", "#EveryBoard", "#GlassEater", "#Chairman",
  ],
  reboundStrong: [
    "#Boards", "#Strong", "#PaintWork", "#OnTheGlass",
  ],
  reboundSupport: [
    "#Crash", "#Possessions", "#BoardWork", "#GrabbingGlass",
  ],
  defenseElite: [
    "#Clamps", "#Lockdown", "#Menace", "#Jail", "#Cookies",
    "#Eraser", "#NoFlyZone", "#Stocks", "#BlockParty", "#DPOY",
    "#StockParty", "#CookieMonster",
  ],
  defenseStrong: [
    "#Defense", "#ActiveHands", "#RimProtection", "#LockedIn",
  ],
  perfectShooting: [
    "#Perfect", "#Automatic", "#Money", "#Pure", "#Cash",
    "#CantMiss", "#Green", "#Flawless", "#NetOnly",
  ],
  efficientShooting: [
    "#Efficient", "#Smooth", "#EasyWork", "#Clean", "#GOATTalk",
  ],
  threePointHeat: [
    "#Splash", "#Sniper", "#Strapped", "#Range", "#Shooter",
    "#Wet", "#Bang", "#FromDeep", "#Rain", "#ThreeBall",
  ],
  paintPressure: [
    "#Downhill", "#BullyBall", "#Attack", "#RimPressure", "#Inside",
    "#AtTheRim",
  ],
  freeThrow: [
    "#FreeMoney", "#Routine", "#AtTheLine", "#NoPressure", "#Knockdown",
  ],
  coldShooting: [
    "#ShootersShoot", "#KeepShooting", "#NextOne", "#ShortMemory", "#StayAggressive",
    "#BounceBack", "#StillHooping", "#NextGame",
  ],
  veryColdShooting: [
    "#RoughNight", "#ColdNight", "#BuildingBricks", "#RimCheck", "#ShotChucker",
  ],
  threeBarrage: [
    "#GreenLight", "#FromWayDeep", "#CurryRange", "#CountIt", "#RainMaker",
  ],
  perfectThree: [
    "#FlawlessFromDeep", "#PerfectFromThree", "#AllNet", "#NoRim", "#WetWork",
  ],
  fiveByFive: [
    "#FiveByFive", "#StatSheet", "#DoesItAll", "#EveryColumn", "#FullBox",
    "#Unicorn",
  ],
  efficientBig: [
    "#EfficientNight", "#NoWastedPossessions", "#Surgical", "#Calculated", "#QuietEfficiency",
    "#Methodical",
  ],
  cleanHandles: [
    "#NoTurnovers", "#BallSecurity", "#ZeroTurnovers", "#TightHandles", "#PurePG",
    "#NoLeaks", "#Controlled",
  ],
  turnoverTrouble: [
    "#NextPlay", "#Reset", "#CleanItUp", "#KeepHooping",
  ],
  foulTrouble: [
    "#Physical", "#Aggressive", "#Enforcer", "#NoEasyOnes", "#SetTheTone",
    "#HardFouls", "#Whistle",
  ],
  hustle: [
    "#DirtyWork", "#WinningPlays", "#HardHat", "#GrindCity", "#EarnedIt",
    "#GlassAndStocks", "#BothEnds", "#PuttingInWork",
  ],
  winningImpact: [
    "#Dub", "#BigWin", "#TeamWin", "#GotTheDub", "#WinnersOnly",
    "#ShowedOut", "#WinnersMentality", "#TookOne",
  ],
  steady: [
    "#Hooper", "#Gameday", "#ShowedUp", "#OnTheCourt",
  ],
  merchant: [
    "#Merchant", "#FreeThrowMerchant", "#FoulPressure", "#StripeWork", "#Crafty",
  ],
  ethical: [
    "#Ethical", "#RealBuckets", "#NoWhistle", "#BucketGetter", "#CleanWork",
    "#ToughBuckets",
  ],
};

export const HASHTAG_POOL_SIZE = Object.values(TAG_BANKS).reduce(
  (total, tags) => total + tags.length,
  0
);

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function ratio(made, attempted) {
  return attempted > 0 ? made / attempted : 0;
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function chooseTag(bank, seed) {
  return bank[hash(seed) % bank.length];
}

function statsFrom(player) {
  const stats = {
    points: number(player?.Points),
    rebounds: number(player?.REB),
    assists: number(player?.AST),
    stocks: number(player?.["STLS/BLKS"]),
    turnovers: number(player?.TOs),
    fouls: number(player?.Fouls),
    fgm: number(player?.FGM),
    fga: number(player?.FGA),
    twoPm: number(player?.["2 PTM"]),
    twoPa: number(player?.["2 PTA"]),
    threePm: number(player?.["3 PTM"]),
    threePa: number(player?.["3 PTA"]),
    ftm: number(player?.FTM),
    fta: number(player?.FTA),
  };

  return {
    ...stats,
    fgPct: ratio(stats.fgm, stats.fga),
    twoPct: ratio(stats.twoPm, stats.twoPa),
    threePct: ratio(stats.threePm, stats.threePa),
    ftPct: ratio(stats.ftm, stats.fta),
  };
}

function makeCandidate(category, group, score, bank, seed, tags = bank) {
  return {
    category,
    group,
    score,
    tag: chooseTag(tags, `${seed}:${category}`),
  };
}

export function selectPlayerHashtagDetails(player, options = {}) {
  if (player?.Points == null) return [];

  const stats = statsFrom(player);
  const won =
    Number.isFinite(options.teamScore) &&
    Number.isFinite(options.opponentScore) &&
    options.teamScore > options.opponentScore;
  const seed = [
    player?.Player || player?.name || "player",
    ...Object.values(stats).map((value) => String(value)),
  ].join(":");
  const candidates = [];
  const add = (category, group, score, bank, tags) =>
    candidates.push(makeCandidate(category, group, score, bank, seed, tags));

  // Career-high (computed server-side) — always gets the badge when flagged.
  if (options.careerHigh) {
    add("career-high", "milestone", 150, TAG_BANKS.steady, ["#CareerHigh"]);
  }

  const doubleFigures = [stats.points, stats.rebounds, stats.assists].filter(
    (value) => value >= 10
  ).length;
  // #ConcertDate is reserved for a truly brutal night — a lot rarer than the
  // ordinary cold-shooting tiers below it.
  const concertDate = stats.fga >= 16 && stats.fgPct <= 0.275;
  const veryColdShooting = stats.fga >= 13 && stats.fgPct <= 0.35;
  const coldShooting = stats.fga >= 7 && stats.fgPct <= 0.35;

  // Archetype — triple/double-double pinned; all-around needs meaningful contribution in all 3
  if (doubleFigures === 3) {
    add("triple-double", "archetype", 160, TAG_BANKS.tripleDouble, ["#TripleDouble"]);
  } else if (doubleFigures === 2) {
    add("double-double", "archetype", 155, TAG_BANKS.doubleDouble, ["#DoubleDouble"]);
  } else if (stats.points >= 12 && stats.rebounds >= 6 && stats.assists >= 6) {
    add("all-around", "archetype", 112, TAG_BANKS.allAround);
  } else if (stats.points >= 8 && stats.rebounds >= 8 && stats.assists >= 8) {
    add("all-around", "archetype", 108, TAG_BANKS.allAround);
  }

  // Scoring — milestone tags pinned per tier
  if (stats.points >= 50 && !coldShooting) {
    add(
      "scoring-50",
      "scoring",
      130 + stats.points / 10,
      TAG_BANKS.scoringNuclear,
      ["#50Points"]
    );
  } else if (stats.points >= 40 && !coldShooting) {
    add(
      "scoring-40",
      "scoring",
      124 + stats.points / 10,
      TAG_BANKS.scoringNuclear,
      ["#40Points"]
    );
  } else if (stats.points >= 30 && !coldShooting) {
    add(
      "scoring-nuclear",
      "scoring",
      116 + stats.points / 10,
      TAG_BANKS.scoringNuclear,
      ["#30Points"]
    );
  } else if (stats.points >= 20 && !coldShooting) {
    add(
      "scoring-big",
      "scoring",
      112 + stats.points / 10,
      TAG_BANKS.scoringBig,
      ["#20Points"]
    );
  } else if (stats.points >= 10) {
    add(
      "scoring-impact",
      "scoring",
      90 + stats.points / 10,
      TAG_BANKS.scoringImpact,
      ["#10Points"]
    );
  }

  // #Cardio — showed up, filled none of the core columns
  if (stats.points === 0 && stats.rebounds === 0 && stats.assists === 0) {
    add("cardio", "scoring", 120, TAG_BANKS.steady, ["#Cardio"]);
  }

  // Playmaking — support tier raised to 5+ assists
  if (stats.assists >= 10) {
    add("assist-elite", "playmaking", 118 + stats.assists, TAG_BANKS.assistElite, ["#Dimer"]);
  } else if (stats.assists >= 8) {
    add("assist-strong", "playmaking", 98 + stats.assists, TAG_BANKS.assistStrong, ["#Dimer"]);
  } else if (stats.assists >= 6) {
    add("assist-strong", "playmaking", 98 + stats.assists, TAG_BANKS.assistStrong);
  } else if (stats.assists >= 5) {
    add("assist-support", "playmaking", 48 + stats.assists * 2, TAG_BANKS.assistSupport);
  } else if (stats.assists === 0 && stats.fga >= 7) {
    add(
      "never-swing-the-rock",
      "playmaking",
      78 + stats.fga,
      TAG_BANKS.assistSupport,
      ["#NeverSwingTheRock"]
    );
  }

  // Rebounding — support tier raised to 7+
  if (stats.rebounds >= 15) {
    add("rebound-elite", "rebounding", 116 + stats.rebounds, TAG_BANKS.reboundElite);
  } else if (stats.rebounds >= 9) {
    add("rebound-strong", "rebounding", 91 + stats.rebounds, TAG_BANKS.reboundStrong);
  } else if (stats.rebounds >= 7) {
    add("rebound-support", "rebounding", 45 + stats.rebounds * 2, TAG_BANKS.reboundSupport);
  }

  // Defense — removed 1-stock impact tier; only 3+ stocks earns a tag
  if (stats.stocks >= 6) {
    add("defense-elite", "defense", 120 + stats.stocks, TAG_BANKS.defenseElite);
  } else if (stats.stocks >= 3) {
    add("defense-strong", "defense", 94 + stats.stocks, TAG_BANKS.defenseStrong);
  }

  // Shooting
  if (concertDate) {
    add(
      "concert-date",
      "shooting",
      124 + stats.fga / 10,
      TAG_BANKS.veryColdShooting,
      ["#ConcertDate"]
    );
  } else if (veryColdShooting) {
    add(
      "very-cold-shooting",
      "shooting",
      114 + stats.fga / 10,
      TAG_BANKS.veryColdShooting
    );
  } else if (coldShooting) {
    add("cold-shooting", "shooting", 102 + stats.fga / 10, TAG_BANKS.coldShooting);
  } else if (stats.fga >= 3 && stats.fgm === stats.fga) {
    add("perfect-shooting", "shooting", 122 + stats.fgm, TAG_BANKS.perfectShooting);
  } else if (stats.threePm >= 4 && stats.threePct >= 0.4) {
    add("three-point-heat", "shooting", 105 + stats.threePm, TAG_BANKS.threePointHeat);
  } else if (stats.fga >= 6 && stats.fgPct >= 0.65) {
    add("efficient-shooting", "shooting", 108 + stats.fgm, TAG_BANKS.efficientShooting);
  } else if (stats.twoPm >= 5 && stats.twoPct >= 0.55) {
    add("paint-pressure", "shooting", 82 + stats.twoPm, TAG_BANKS.paintPressure);
  }

  // Rare statlines — unusual nights that override the generic tiers above.
  // A barrage from deep pins its own tag; perfect volume from three is rarer
  // still. Both sit in the "shooting" group so they win that slot by score.
  if (stats.threePm >= 7) {
    add("three-barrage", "shooting", 142 + stats.threePm, TAG_BANKS.threeBarrage, ["#GreenLight"]);
  } else if (stats.threePm >= 5 && stats.threePm === stats.threePa) {
    add("perfect-three", "shooting", 134 + stats.threePm, TAG_BANKS.perfectThree);
  }

  // 5x5 — at least 5 in points, rebounds, assists and stocks. Extremely rare.
  if (
    stats.points >= 5 &&
    stats.rebounds >= 5 &&
    stats.assists >= 5 &&
    stats.stocks >= 5
  ) {
    add("five-by-five", "rare-line", 175, TAG_BANKS.fiveByFive, ["#FiveByFive"]);
  }

  // High-volume efficiency — a heavy scoring load kept ruthlessly efficient.
  if (stats.points >= 25 && stats.fga >= 12 && stats.fgPct >= 0.65) {
    add("efficient-big", "rare-line", 150 + stats.points / 10, TAG_BANKS.efficientBig);
  }

  if (stats.fta >= 4 && stats.ftPct >= 0.8) {
    add("free-throw", "free-throws", 72 + stats.ftm, TAG_BANKS.freeThrow);
  }

  if (stats.fta >= 8 && stats.fta >= stats.fga * 0.5) {
    add("merchant", "scoring-style", 90 + stats.fta, TAG_BANKS.merchant);
  } else if (
    stats.points >= 15 &&
    stats.fta <= 2 &&
    stats.fga >= 6 &&
    stats.fgPct >= 0.5
  ) {
    add("ethical", "scoring-style", 88 + stats.points / 10, TAG_BANKS.ethical);
  }

  // Ball control — 0 TOs needs 3+ assists to earn a tag
  if (stats.turnovers === 0 && stats.assists >= 3) {
    add("clean-handles", "ball-control", 94 + stats.assists, TAG_BANKS.cleanHandles);
  } else if (stats.turnovers >= 6) {
    add("turnover-trouble", "ball-control", 88 + stats.turnovers, TAG_BANKS.turnoverTrouble);
  }

  if (stats.fouls >= 5) {
    add("foul-trouble", "discipline", 82 + stats.fouls, TAG_BANKS.foulTrouble);
  }

  // Hustle — raised to 12+ combined boards+stocks, low scorer
  if (stats.rebounds + stats.stocks >= 12 && stats.points < 12) {
    add("hustle", "hustle", 86 + stats.rebounds + stats.stocks, TAG_BANKS.hustle);
  }

  // Winning — raised impact threshold to 25
  const impact = stats.points + stats.rebounds + stats.assists + stats.stocks;
  if (won && impact >= 25) {
    add("winning-impact", "outcome", 58 + impact / 5, TAG_BANKS.winningImpact);
  }

  const limit = options.limit || 4;
  const usedGroups = new Set();
  const usedCandidateTags = new Set();
  return candidates
    .sort((left, right) => right.score - left.score || left.category.localeCompare(right.category))
    .filter((candidate) => {
      if (usedGroups.has(candidate.group)) return false;
      if (usedCandidateTags.has(candidate.tag)) return false;
      usedGroups.add(candidate.group);
      usedCandidateTags.add(candidate.tag);
      return true;
    })
    .slice(0, limit);
}

export function getPlayerHashtags(player, options = {}) {
  return selectPlayerHashtagDetails(player, options).map(({ tag }) => tag.toLowerCase());
}
