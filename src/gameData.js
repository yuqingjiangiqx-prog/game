export const FAMILIES = [
  { id: 'swift', name: '\u8fc5\u98ce\u65cf', color: '#42d4ff' },
  { id: 'round', name: '\u56e2\u56e2\u65cf', color: '#ff6f91' },
  { id: 'horn', name: '\u5de8\u89d2\u65cf', color: '#ffd166' },
  { id: 'popcorn', name: '\u66b4\u7c73\u65cf', color: '#ff8a3d' },
  { id: 'blade', name: '\u4e09\u5200\u65cf', color: '#9d7cff' },
  { id: 'tofu', name: '\u8c46\u82b1\u65cf', color: '#f6b7ff' },
  { id: 'x', name: 'X\u65cf', color: '#161827' },
];

export const SCENES = [
  {
    id: 'S1',
    name: '\u96cc\u96c4\u53cc\u715e',
    theme: '\u7b2c\u4e09\u5c0f\u5173\u9047\u5230\u4e00\u96cc\u4e00\u96c4\u4e24\u6761\u5927\u9c7c',
    color: '#11a7e2',
    environment: 'duo',
  },
  {
    id: 'S2',
    name: '\u6781\u5730\u51b0\u5ddd',
    theme: '\u51b0\u9525\u4f1a\u523a\u7834\u6ce1\u6ce1',
    color: '#7cc7ff',
    environment: 'ice',
  },
  {
    id: 'S3',
    name: '\u6f58\u591a\u62c9\u68ee\u6797',
    theme: '\u5947\u5e7b\u690d\u7269\u4f1a\u6321\u4f4f\u548c\u63a8\u52a8\u6ce1\u6ce1',
    color: '#16c784',
    environment: 'forest',
  },
  {
    id: 'S4',
    name: '\u7194\u5ca9\u77ff\u8109',
    theme: '\u70ed\u6d41\u95f4\u6b47\u55b7\u53d1\uff0c\u4f1a\u6539\u53d8\u6ce1\u6ce1\u8def\u7ebf',
    color: '#ff8a3d',
    environment: 'volcano',
  },
  {
    id: 'S5',
    name: '\u661f\u6da1\u6df1\u6d77',
    theme: '\u6df1\u6d77\u6da1\u6d41\u4f1a\u7275\u5f15\u6ce1\u6ce1',
    color: '#8f7cff',
    environment: 'vortex',
  },
];

const STAGES = [
  { stageId: 'A', targetScore: 4000, quality: '\u666e\u901a', star: 1 },
  { stageId: 'B', targetScore: 9000, quality: '\u7a00\u6709', star: 2 },
  { stageId: 'C', targetScore: 15000, quality: '\u4f20\u8bf4', star: 3 },
];

function makeLevel(scene, sceneIndex, stage, stageIndex) {
  const isBoss = stage.stageId === 'C';
  const scoreBoost = sceneIndex * 1200;
  return {
    id: `${scene.id}${stage.stageId}`,
    sceneId: scene.id,
    sceneIndex,
    stageId: stage.stageId,
    name: `${scene.name} ${stage.stageId}`,
    targetScore: stage.targetScore + scoreBoost,
    duration: 60,
    spawnEvery: isBoss ? 920 : Math.max(620, 760 - sceneIndex * 22 - stageIndex * 28),
    environment: scene.environment,
    collectorQuality: stage.quality,
    collectorColor: FAMILIES[(sceneIndex + stageIndex) % FAMILIES.length].color,
    collectorStar: Math.min(5, stage.star + Math.floor(sceneIndex / 2)),
    familyId: FAMILIES[(sceneIndex * 2 + stageIndex) % FAMILIES.length].id,
    fishPool: isBoss
      ? ['normal', 'bonus', 'gas', 'clock', 'darkClock', 'puffer']
      : sceneIndex === 0 && stage.stageId === 'A'
        ? ['normal', 'bonus', 'gas']
        : ['normal', 'bonus', 'gas', 'clock', 'darkClock', 'puffer'],
    fishWeights:
      sceneIndex === 0 && stage.stageId === 'A'
        ? { normal: 58, bonus: 28, gas: 14 }
        : { normal: 42, bonus: 20, gas: 17, clock: 12, darkClock: 4, puffer: 5 },
    mode: isBoss ? 'boss' : 'score',
  };
}

export const LEVELS = SCENES.flatMap((scene, sceneIndex) =>
  STAGES.map((stage, stageIndex) => makeLevel(scene, sceneIndex, stage, stageIndex)),
);

export const FISH_TYPES = {
  normal: {
    label: '\u79ef\u5206\u9c7c',
    score: 360,
    color: '#8a54ff',
    accent: '#4516ad',
  },
  bonus: {
    label: '\u5956\u52b1\u9c7c',
    score: 520,
    color: '#ffbf3d',
    accent: '#a95b00',
  },
  clock: {
    label: '\u65f6\u95f4\u9c7c',
    score: 160,
    color: '#46d76f',
    accent: '#0a7b37',
    timeBonus: 9,
  },
  darkClock: {
    label: '\u9ed1\u65f6\u95f4\u9c7c',
    score: 60,
    color: '#252a40',
    accent: '#ff5a79',
    timeBonus: -7,
  },
  gas: {
    label: '\u6c14\u6ce1\u9c7c',
    score: 120,
    color: '#5ce7f2',
    accent: '#0786a8',
    gasBonus: 28,
  },
  puffer: {
    label: '\u6cb3\u8c5a\u523a\u9c7c',
    score: 0,
    color: '#f56b9b',
    accent: '#7b1742',
    popsBubble: true,
  },
  redQueen: {
    label: '\u7ea2\u7687\u540e',
    score: 0,
    color: '#ff4f6d',
    accent: '#8b0f2d',
    boss: true,
  },
  greenKing: {
    label: '\u7eff\u56fd\u738b',
    score: 0,
    color: '#34c96b',
    accent: '#0c7035',
    boss: true,
  },
  collector: {
    label: '\u6536\u85cf\u9c7c',
    score: 1200,
    color: '#ff6f91',
    accent: '#fff3a8',
  },
};

export const SAVE_KEY = 'paopaofish_save_v2';
export const TANK_KEY = 'paopaofish_tank_v1';
