import {
  getPlayerHashtags,
  HASHTAG_POOL_SIZE,
  selectPlayerHashtagDetails,
} from "./playerHashtags";

function player(overrides = {}) {
  return {
    Player: "Test Hooper",
    Points: 8,
    REB: 3,
    AST: 1,
    "STLS/BLKS": 0,
    TOs: 2,
    Fouls: 1,
    FGM: 3,
    FGA: 7,
    "2 PTM": 2,
    "2 PTA": 4,
    "3 PTM": 1,
    "3 PTA": 3,
    FTM: 1,
    FTA: 2,
    ...overrides,
  };
}

const categories = (statLine, options) =>
  selectPlayerHashtagDetails(statLine, options).map(({ category }) => category);

test("contains more than 100 stat-aware hashtag candidates", () => {
  expect(HASHTAG_POOL_SIZE).toBeGreaterThan(100);
});

test("recognizes a triple-double", () => {
  expect(
    categories(player({ Points: 24, REB: 11, AST: 10 }))
  ).toContain("triple-double");
});

test("recognizes a high-assist game as playmaking", () => {
  const statLine = player({ AST: 9, TOs: 1 });
  expect(categories(statLine)).toContain("assist-strong");
  expect(getPlayerHashtags(statLine)).toContain("#dimer");
  expect(getPlayerHashtags(player({ AST: 7, TOs: 1 }))).not.toContain("#dimer");
});

test("uses never swing the rock for zero assists with shot volume", () => {
  expect(getPlayerHashtags(player({ AST: 0, FGA: 8 }))).toContain(
    "#neverswingtherock"
  );
  expect(getPlayerHashtags(player({ AST: 0, FGA: 2 }))).not.toContain(
    "#neverswingtherock"
  );
});

test("recognizes an inefficient high-volume shooting line", () => {
  const details = selectPlayerHashtagDetails(
    player({ Points: 9, FGM: 3, FGA: 13, "3 PTM": 1, "3 PTA": 7 })
  );
  expect(details.map(({ category }) => category)).toContain("very-cold-shooting");
  expect(details.find(({ category }) => category === "very-cold-shooting").tag).toBe("#ConcertDate");
  expect(
    categories(player({ Points: 6, FGM: 3, FGA: 12, "3 PTM": 0, "3 PTA": 5 }))
  ).not.toContain("very-cold-shooting");
});

test("uses an encouraging tier for a normal cold shooting game", () => {
  const details = selectPlayerHashtagDetails(
    player({ Points: 10, FGM: 3, FGA: 9, "3 PTM": 1, "3 PTA": 5 })
  );
  expect(details.map(({ category }) => category)).toContain("cold-shooting");
  expect(details.map(({ category }) => category)).not.toContain("very-cold-shooting");
});

test("does not label an inefficient volume scorer as hot", () => {
  const result = categories(
    player({ Points: 24, FGM: 4, FGA: 16, "3 PTM": 2, "3 PTA": 9, FTM: 14, FTA: 16 })
  );
  expect(result).toContain("very-cold-shooting");
  expect(result).not.toContain("scoring-big");
  expect(result).not.toContain("scoring-nuclear");
});

test("recognizes a hot three-point game without calling it cold", () => {
  const result = categories(
    player({ Points: 23, FGM: 8, FGA: 13, "3 PTM": 5, "3 PTA": 8 })
  );
  expect(result).toContain("three-point-heat");
  expect(result).not.toContain("cold-shooting");
});

test("recognizes clean playmaking with zero turnovers", () => {
  expect(categories(player({ AST: 7, TOs: 0 }))).toContain("clean-handles");
});

test("recognizes free-throw merchant and ethical scoring styles", () => {
  expect(
    categories(player({ Points: 22, FGM: 6, FGA: 11, FTM: 10, FTA: 12 }))
  ).toContain("merchant");
  expect(
    categories(player({ Points: 18, FGM: 8, FGA: 14, FTM: 1, FTA: 1 }))
  ).toContain("ethical");
});

test("returns only earned hashtags without filling all four slots", () => {
  const tags = getPlayerHashtags(player());
  expect(tags.length).toBeLessThan(4);
  expect(new Set(tags).size).toBe(tags.length);
  tags.forEach((tag) => expect(tag).toMatch(/^#[a-z0-9]+$/));
});

test("allows four earned hashtags for a major all-around game", () => {
  expect(
    getPlayerHashtags(player({ Points: 24, REB: 11, AST: 10, "STLS/BLKS": 4 }))
  ).toHaveLength(4);
});

test("returns no hashtags for a quiet game with no qualifying category", () => {
  expect(
    getPlayerHashtags(player({ Points: 4, REB: 2, AST: 1, "STLS/BLKS": 0 }))
  ).toEqual([]);
});

test("uses cardio for every zero-point game", () => {
  expect(
    getPlayerHashtags(
      player({ Points: 0, FGM: 0, FGA: 7, "2 PTM": 0, "2 PTA": 4, "3 PTM": 0, "3 PTA": 3 })
    )
  ).toContain("#cardio");
});

test("returns no hashtags for a DNP player", () => {
  expect(getPlayerHashtags(player({ Points: null }))).toEqual([]);
});

test("returns the same hashtags for the same player and game", () => {
  const statLine = player({ Player: "Same Player", Points: 18, REB: 8, AST: 5 });
  expect(getPlayerHashtags(statLine)).toEqual(getPlayerHashtags(statLine));
});
