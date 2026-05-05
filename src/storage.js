import { FAMILIES, SAVE_KEY, TANK_KEY } from './gameData.js';

const BAG_LIFE_MS = 30 * 24 * 60 * 60 * 1000;
const LEVEL_UP_MS = 60 * 60 * 1000;
const DEFAULT_TANKS = 3;
const TANK_CAPACITY = 10;

function nowMs() {
  return Date.now();
}

function makeDefaultTanks() {
  return Array.from({ length: DEFAULT_TANKS }, (_, index) => ({
    id: `tank-${index + 1}`,
    name: `\u9c7c\u7f38 ${index + 1}`,
    star: index + 3,
    maxFishLevel: index + 3,
    capacity: TANK_CAPACITY,
    fishIds: [],
  }));
}

function defaultSave() {
  return {
    version: 2,
    bags: [],
    tanks: makeDefaultTanks(),
    fishById: {},
    food: 0,
    completedLevels: [],
  };
}

function getFamily(familyId) {
  return FAMILIES.find((family) => family.id === familyId) ?? FAMILIES[0];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeFish(fish, timestamp) {
  const caughtAt = Date.parse(fish.caughtAt) || timestamp;
  const hours = Math.floor((timestamp - caughtAt) / LEVEL_UP_MS);
  const level = clamp(1 + hours, 1, 5);
  const family = getFamily(fish.familyId);
  const life =
    fish.location === 'bag'
      ? clamp(Math.ceil(((BAG_LIFE_MS - (timestamp - caughtAt)) / BAG_LIFE_MS) * 100), 0, 100)
      : 100;

  return {
    ...fish,
    familyId: fish.familyId ?? family.id,
    familyName: fish.familyName ?? family.name,
    star: fish.star ?? 1,
    quality: fish.quality ?? '\u666e\u901a',
    color: fish.color ?? family.color,
    sceneId: fish.sceneId ?? 'S1',
    stageId: fish.stageId ?? fish.levelId?.slice(-1) ?? 'A',
    location: fish.location ?? 'bag',
    caughtAt: fish.caughtAt ?? new Date(caughtAt).toISOString(),
    level,
    growth: level * 20,
    life,
  };
}

function normalizeSave(save) {
  const timestamp = nowMs();
  const next = {
    ...defaultSave(),
    ...save,
    tanks: Array.isArray(save?.tanks) && save.tanks.length > 0 ? save.tanks : makeDefaultTanks(),
    bags: Array.isArray(save?.bags) ? save.bags : [],
    fishById: save?.fishById && typeof save.fishById === 'object' ? save.fishById : {},
    completedLevels: Array.isArray(save?.completedLevels) ? save.completedLevels : [],
    food: Number.isFinite(save?.food) ? save.food : 0,
  };

  const aliveBags = [];
  const fishById = {};
  for (const fishId of Object.keys(next.fishById)) {
    const fish = normalizeFish(next.fishById[fishId], timestamp);
    if (fish.location === 'bag' && fish.life <= 0) {
      next.food += Math.max(2, fish.star + fish.level);
      continue;
    }
    fishById[fishId] = fish;
  }

  for (const fishId of next.bags) {
    if (fishById[fishId]?.location === 'bag') aliveBags.push(fishId);
  }

  next.fishById = fishById;
  next.bags = aliveBags;
  next.tanks = next.tanks.map((tank, index) => ({
    id: tank.id ?? `tank-${index + 1}`,
    name: tank.name ?? `\u9c7c\u7f38 ${index + 1}`,
    star: tank.star ?? index + 3,
    maxFishLevel: tank.maxFishLevel ?? tank.star ?? index + 3,
    capacity: tank.capacity ?? TANK_CAPACITY,
    fishIds: Array.isArray(tank.fishIds)
      ? tank.fishIds.filter((fishId) => fishById[fishId]?.location === 'tank')
      : [],
  }));
  return next;
}

function migrateLegacyTank() {
  try {
    const raw = localStorage.getItem(TANK_KEY);
    const legacy = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(legacy) || legacy.length === 0) return null;

    const save = defaultSave();
    legacy.forEach((fish) => {
      const id = fish.id ?? `legacy-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const family = getFamily(fish.familyId);
      save.fishById[id] = {
        id,
        levelId: fish.levelId ?? 'S1A',
        sceneId: fish.sceneId ?? 'S1',
        stageId: fish.stageId ?? fish.levelId ?? 'A',
        familyId: family.id,
        familyName: family.name,
        star: fish.star ?? 1,
        quality: fish.quality ?? '\u666e\u901a',
        color: fish.color ?? family.color,
        level: fish.level ?? 1,
        life: 100,
        location: 'bag',
        score: fish.score ?? 0,
        caughtAt: fish.caughtAt ?? new Date().toISOString(),
      };
      save.bags.push(id);
    });
    return save;
  } catch {
    return null;
  }
}

export function readGameSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const parsed = raw ? JSON.parse(raw) : migrateLegacyTank();
    const normalized = normalizeSave(parsed ?? defaultSave());
    writeGameSave(normalized);
    return normalized;
  } catch {
    const save = defaultSave();
    writeGameSave(save);
    return save;
  }
}

export function writeGameSave(save) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}

export function getFishList(save) {
  return Object.values(save.fishById);
}

export function getFamilyName(familyId) {
  return getFamily(familyId).name;
}

export function addCollectedFish(level, score) {
  const save = readGameSave();
  const family = getFamily(level.familyId);
  const id = `${level.id}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  save.fishById[id] = {
    id,
    levelId: level.id,
    sceneId: level.sceneId,
    stageId: level.stageId,
    familyId: family.id,
    familyName: family.name,
    star: level.collectorStar ?? 1,
    quality: level.collectorQuality,
    color: level.collectorColor ?? family.color,
    level: 1,
    life: 100,
    location: 'bag',
    score,
    caughtAt: new Date().toISOString(),
  };
  save.bags.unshift(id);
  if (!save.completedLevels.includes(level.id)) save.completedLevels.push(level.id);
  const normalized = normalizeSave(save);
  writeGameSave(normalized);
  return normalized;
}

export function moveFishToFirstOpenTank(fishId) {
  const save = readGameSave();
  const fish = save.fishById[fishId];
  const tank = save.tanks.find(
    (item) => item.fishIds.length < item.capacity && fish && item.maxFishLevel >= fish.level,
  );
  if (!fish || !tank) return save;

  fish.location = 'tank';
  fish.tankId = tank.id;
  fish.placedAt = new Date().toISOString();
  fish.life = 100;
  save.bags = save.bags.filter((id) => id !== fishId);
  tank.fishIds.push(fishId);
  const normalized = normalizeSave(save);
  writeGameSave(normalized);
  return normalized;
}

export function feedFish(fishId) {
  const save = readGameSave();
  const fish = save.fishById[fishId];
  if (!fish) return save;
  fish.life = 100;
  fish.lastFedAt = new Date().toISOString();
  const normalized = normalizeSave(save);
  writeGameSave(normalized);
  return normalized;
}

export function isSceneUnlocked(sceneId, save, scenes, levels) {
  const sceneIndex = scenes.findIndex((scene) => scene.id === sceneId);
  if (sceneIndex <= 0) return true;
  const previousScene = scenes[sceneIndex - 1];
  const required = levels
    .filter((level) => level.sceneId === previousScene.id)
    .map((level) => level.id);
  return required.every((levelId) => save.completedLevels.includes(levelId));
}

export const TANK_SIZE = TANK_CAPACITY;
