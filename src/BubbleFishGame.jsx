import React, { useEffect, useRef, useState } from 'react';
import { FISH_TYPES } from './gameData.js';

const MAX_GAS = 100;
const START_GAS = 78;
const GAS_RECOVERY_PER_SECOND = 10;
const BUBBLE_RISE_PER_SECOND = 64;
const BUBBLE_MIN_RADIUS = 20;
const BUBBLE_MAX_RADIUS = 170;
const FISH_BASE_RADIUS = 25;
const PLAYER_WIDTH = 92;
const PLAYER_HEIGHT = 62;
const BOSS_CAPTURE_RADIUS = 220;
const BOSS_MIN_BUBBLE_RADIUS = 72;
const SCORE_TIME_STEP = 1000;
const TIME_BONUS_PER_STEP = 5;
const EMPTY_GAS_REST_SECONDS = 1.25;

const COPY = {
  collectorComing: '\u6536\u85cf\u9c7c\u51fa\u73b0\u4e86!',
  collectorSuccess: '\u6536\u85cf\u6210\u529f!',
  bossHint: '\u7b49\u7ea2\u7687\u540e\u548c\u7eff\u56fd\u738b\u9760\u8fd1\uff0c\u7528\u5927\u6ce1\u6ce1\u4e00\u8d77\u6293\u4f4f!',
  bossReady: '\u53cc\u738b\u9760\u8fd1\uff0c\u653e\u5927\u6ce1\u6ce1!',
  bossCaught: '\u53cc\u738b\u5165\u6ce1!',
  gas: '\u6c14\u91cf',
  rest: '\u6ca1\u6c14\u4e86\uff0c\u4f11\u606f\u4e00\u4f1a\u5427',
  timeBonus: '\u65f6\u95f4 +5s',
  multiplier: '\u00d7',
  timeUp: '\u65f6\u95f4\u5230\u4e86\uff0c\u518d\u8bd5\u4e00\u6b21\u5427\u3002',
  bubblePopped: '\u6ce1\u6ce1\u88ab\u523a\u7834',
  caughtCollector: '\u6293\u5230\u6536\u85cf\u9c7c\u4e86\uff01',
  gasLow: '\u6c14\u91cf\u4e0d\u8db3',
  back: '\u8fd4\u56de',
  target: '\u76ee\u6807',
  points: '\u5206',
  tank: '\u9c7c\u7f38',
  canvasLabel: '\u6ce1\u6ce1\u9c7c\u6e38\u620f\u753b\u9762',
  time: '\u65f6\u95f4',
  score: '\u5206\u6570',
  collectorVisible: '\u6536\u85cf\u9c7c\u5df2\u51fa\u73b0',
  keepCatching: '\u7ee7\u7eed\u6293\u9c7c',
  schoolComing: '\u9c7c\u7fa4\u8981\u6765\u4e86!',
  hint: '\u79fb\u52a8\u9f20\u6807\u63a7\u5236\u6f5c\u8247\u9c7c\uff0c\u6309\u4f4f\u5de6\u952e\u84c4\u6ce1\uff0c\u677e\u5f00\u4ece\u9c7c\u5934\u5410\u51fa\u6ce1\u6ce1\u3002',
  lostTitle: '\u6311\u6218\u5931\u8d25',
  restart: '\u91cd\u5f00\u672c\u5173',
  goTank: '\u53bb\u9c7c\u7f38',
  home: '\u56de\u4e3b\u9875',
  pause: '\u6682\u505c',
  resume: '\u7ee7\u7eed',
  musicOn: '\u97f3\u6548\u5f00',
  musicOff: '\u97f3\u6548\u5173',
  exit: '\u9000\u51fa',
  bags: '\u6536\u85cf\u888b',
  boss: 'BOSS',
  collectorPrize: '\u6293\u5230\u6536\u85cf\u9c7c!',
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function formatTime(value) {
  const seconds = Math.max(0, Math.ceil(value));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function chooseFishType(level) {
  if (level.fishWeights) {
    const entries = Object.entries(level.fishWeights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let roll = Math.random() * total;
    for (const [type, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return type;
    }
    return entries[0]?.[0] ?? 'normal';
  }
  const pool = level.fishPool ?? ['normal'];
  return pool[Math.floor(Math.random() * pool.length)];
}

function createFish(type, width, height, level, sideOverride) {
  const fromLeft = sideOverride ? sideOverride === 'left' : Math.random() > 0.5;
  const catalog = FISH_TYPES[type];
  const isBoss = catalog.boss;
  const collector = type === 'collector';
  const radius = isBoss ? 48 : collector ? 34 : type === 'puffer' ? 30 : FISH_BASE_RADIUS + rand(-3, 7);

  return {
    id: `${type}-${performance.now()}-${Math.random()}`,
    type,
    x: fromLeft ? -radius - 30 : width + radius + 30,
    y: isBoss ? height * (type === 'redQueen' ? 0.36 : 0.49) : rand(height * 0.16, height * 0.68),
    baseY: isBoss ? height * (type === 'redQueen' ? 0.36 : 0.49) : rand(height * 0.16, height * 0.68),
    radius,
    vx: (fromLeft ? 1 : -1) * (isBoss ? 72 : rand(66, type === 'collector' ? 92 : 146)),
    wave: rand(0, Math.PI * 2),
    color: collector ? level.collectorColor : catalog.color,
    accent: catalog.accent,
    score: catalog.score,
    label: catalog.label,
    caught: false,
    glow: collector,
  };
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

function drawBackground(ctx, width, height, time, environment = 'duo') {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  const palettes = {
    duo: ['#5bdde8', '#61d9ed', '#dffbd8'],
    ice: ['#d9fbff', '#81d8f5', '#e9f8ff'],
    forest: ['#74e9c4', '#41c9b5', '#cff4d5'],
    volcano: ['#5bdde8', '#58d4e5', '#ffe0a3'],
    vortex: ['#3bc2e8', '#4c8ce7', '#1f2f7a'],
  };
  const [top, middle, bottom] = palettes[environment] ?? palettes.duo;
  gradient.addColorStop(0, top);
  gradient.addColorStop(0.48, middle);
  gradient.addColorStop(1, bottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 8; i += 1) {
    const x = (i * 210 + time * 10) % (width + 160) - 80;
    const y = height * (0.08 + (i % 3) * 0.1);
    ctx.beginPath();
    ctx.ellipse(x, y, 90, 26, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#1f7fa6';
  for (let i = 0; i < 5; i += 1) {
    const x = width * (0.18 + i * 0.2);
    ctx.beginPath();
    ctx.ellipse(x, height * 0.62 + Math.sin(time + i) * 7, 130, 34, -0.18, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  ctx.fillStyle = environment === 'volcano' ? '#f5d39a' : environment === 'vortex' ? '#344f96' : '#daf8cf';
  ctx.beginPath();
  ctx.moveTo(0, height * 0.84);
  ctx.bezierCurveTo(width * 0.2, height * 0.78, width * 0.36, height * 0.9, width * 0.58, height * 0.82);
  ctx.bezierCurveTo(width * 0.75, height * 0.77, width * 0.87, height * 0.9, width, height * 0.82);
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();

  const plantA = environment === 'forest' ? '#6e3fb7' : '#0b8f79';
  const plantB = environment === 'ice' ? '#6eb8d6' : environment === 'volcano' ? '#7c4b3f' : '#1fa0a0';
  drawSeaPlant(ctx, width * 0.07, height * 0.87, 1.15, plantA, time);
  drawSeaPlant(ctx, width * 0.22, height * 0.9, 0.78, plantB, time + 1);
  drawSeaPlant(ctx, width * 0.77, height * 0.88, 1.05, plantA, time + 2);
  drawSeaPlant(ctx, width * 0.92, height * 0.91, 0.72, plantB, time + 3);
  drawCoral(ctx, width * 0.12, height * 0.92, '#e77ac7');
  drawCoral(ctx, width * 0.84, height * 0.92, '#d966b3');
  drawCoral(ctx, width * 0.32, height * 0.94, '#75d4d0');
}

function drawSeaPlant(ctx, x, y, scale, color, time) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.lineWidth = 15 - Math.abs(i) * 2;
    ctx.moveTo(i * 18, 0);
    ctx.quadraticCurveTo(i * 18 + Math.sin(time + i) * 18, -44, i * 12, -106 - Math.abs(i) * 12);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(i * 12 + 4, -108 - Math.abs(i) * 12, 13, 24, 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCoral(ctx, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i += 1) {
    ctx.beginPath();
    const h = 34 + (i % 4) * 9;
    const y = -28 - (i % 3) * 10;
    ctx.roundRect?.(i * 13, y, 16, h, 9);
    if (!ctx.roundRect) ctx.rect(i * 13, y, 16, h);
    ctx.fill();
  }
  ctx.restore();
}

function drawFish(ctx, fish, time) {
  const dir = fish.vx >= 0 ? 1 : -1;
  const bob = Math.sin(time * 5 + fish.wave) * 3;

  ctx.save();
  ctx.translate(fish.x, fish.y + bob);
  ctx.scale(dir, 1);

  if (fish.glow) {
    const glow = 0.45 + Math.sin(time * 9) * 0.18;
    ctx.save();
    ctx.globalAlpha = glow;
    ctx.fillStyle = '#fff4a3';
    ctx.beginPath();
    ctx.arc(0, 0, fish.radius * 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (fish.type === 'puffer') {
    drawPuffer(ctx, fish, time);
    ctx.restore();
    return;
  }

  drawCuteFish(ctx, fish, time);
  ctx.restore();
}

function drawCuteFish(ctx, fish, time) {
  const r = fish.radius;
  ctx.fillStyle = fish.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.12, r * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = fish.accent;
  ctx.beginPath();
  ctx.moveTo(-r * 1.0, 0);
  ctx.quadraticCurveTo(-r * 1.62, -r * 0.68, -r * 1.72, 0);
  ctx.quadraticCurveTo(-r * 1.62, r * 0.68, -r * 1.0, 0);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.ellipse(r * 0.05, -r * 0.22, r * 0.52, r * 0.18, -0.25, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.52, -r * 0.2, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(r * 0.59, -r * 0.18, r * 0.14, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.72)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.35 + i * r * 0.34, -r * 0.58);
    ctx.quadraticCurveTo(-r * 0.2 + i * r * 0.34, 0, -r * 0.35 + i * r * 0.34, r * 0.58);
    ctx.stroke();
  }

  if (fish.type === 'clock' || fish.type === 'darkClock') {
    ctx.fillStyle = fish.type === 'clock' ? '#fff5bb' : '#ff85a0';
    ctx.beginPath();
    ctx.arc(-r * 0.08, 0, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = fish.accent;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r * 0.08, 0);
    ctx.lineTo(-r * 0.08, -r * 0.24);
    ctx.moveTo(-r * 0.08, 0);
    ctx.lineTo(r * 0.14, r * 0.1);
    ctx.stroke();
  }

  if (fish.type === 'gas') {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.arc(-r * 0.3 + i * 12, -r * 0.02 + Math.sin(time + i) * 4, 6 + i * 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (fish.type === 'collector') {
    ctx.fillStyle = '#fff8a8';
    ctx.beginPath();
    ctx.arc(r * 0.02, -r * 0.92, 7 + Math.sin(time * 7) * 2, 0, Math.PI * 2);
    ctx.fill();
  }

  if (fish.type === 'redQueen' || fish.type === 'greenKing') {
    ctx.fillStyle = '#ffe977';
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, -r * 0.72);
    ctx.lineTo(-r * 0.1, -r * 1.15);
    ctx.lineTo(r * 0.12, -r * 0.72);
    ctx.lineTo(r * 0.34, -r * 1.15);
    ctx.lineTo(r * 0.55, -r * 0.72);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPuffer(ctx, fish, time) {
  const r = fish.radius;
  ctx.strokeStyle = fish.accent;
  ctx.lineWidth = 4;
  for (let i = 0; i < 14; i += 1) {
    const angle = (Math.PI * 2 * i) / 14 + Math.sin(time * 3) * 0.05;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * r * 0.74, Math.sin(angle) * r * 0.74);
    ctx.lineTo(Math.cos(angle) * r * 1.2, Math.sin(angle) * r * 1.2);
    ctx.stroke();
  }
  ctx.fillStyle = fish.color;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r * 0.32, -r * 0.18, r * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#161b22';
  ctx.beginPath();
  ctx.arc(r * 0.38, -r * 0.16, r * 0.11, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(ctx, player, time) {
  ctx.save();
  ctx.translate(player.x, player.y);
  const bob = Math.sin(time * 5) * 2;
  ctx.translate(0, bob);

  ctx.fillStyle = 'rgba(7,82,108,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, PLAYER_HEIGHT * 0.6, PLAYER_WIDTH * 0.48, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createLinearGradient(-42, -22, 42, 26);
  body.addColorStop(0, '#ffb32c');
  body.addColorStop(0.58, '#ff8f17');
  body.addColorStop(1, '#df6500');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, PLAYER_WIDTH * 0.43, PLAYER_HEIGHT * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1d2d44';
  ctx.beginPath();
  ctx.moveTo(-38, 0);
  ctx.quadraticCurveTo(-68, -28, -78, 0);
  ctx.quadraticCurveTo(-68, 28, -38, 0);
  ctx.fill();

  ctx.fillStyle = '#151f31';
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.ellipse(-12 + i * 7, -29 - Math.sin(time * 7 + i) * 2, 8, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(23, -7, 19, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#162133';
  ctx.beginPath();
  ctx.arc(28, -7, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(32, -12, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(47, -24, 7 + Math.sin(time * 8) * 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBubble(ctx, bubble, isPreview = false, time = 0) {
  ctx.save();
  ctx.globalAlpha = isPreview ? 0.74 : 0.9;
  const gradient = ctx.createRadialGradient(
    bubble.x - bubble.radius * 0.28,
    bubble.y - bubble.radius * 0.34,
    bubble.radius * 0.1,
    bubble.x,
    bubble.y,
    bubble.radius,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(0.45, 'rgba(184,246,255,0.22)');
  gradient.addColorStop(1, 'rgba(62,182,222,0.42)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
  ctx.fill();

  if (!isPreview && bubble.catches?.length) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(bubble.x, bubble.y, bubble.radius * 0.92, 0, Math.PI * 2);
    ctx.clip();
    bubble.catches.forEach((caught, index) => {
      const drift = Math.sin(time * 4 + index) * 2;
      drawFish(
        ctx,
        {
          ...caught,
          x: bubble.x + caught.relX * 0.48,
          y: bubble.y + caught.relY * 0.48 + drift,
          radius: Math.min(caught.radius, bubble.radius * 0.26),
          vx: 1,
          glow: false,
        },
        time,
      );
    });
    ctx.restore();
  }

  ctx.strokeStyle = isPreview ? 'rgba(255,255,255,0.62)' : 'rgba(255,255,255,0.86)';
  ctx.lineWidth = isPreview ? 2 : 4;
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.arc(bubble.x - bubble.radius * 0.28, bubble.y - bubble.radius * 0.34, bubble.radius * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFloatingText(ctx, text, time) {
  const life = 1 - text.age / text.maxAge;
  ctx.save();
  ctx.globalAlpha = clamp(life, 0, 1);
  ctx.font = `900 ${text.size ?? 22}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(0,83,110,0.44)';
  ctx.fillStyle = text.color;
  ctx.strokeText(text.value, text.x, text.y - text.age * 34 + Math.sin(time * 8) * 2);
  ctx.fillText(text.value, text.x, text.y - text.age * 34 + Math.sin(time * 8) * 2);
  ctx.restore();
}

function drawEnvironmentHazards(ctx, state, level) {
  if (level.environment === 'ice') {
    state.icicles.forEach((ice) => {
      ctx.save();
      ctx.translate(ice.x, ice.y);
      ctx.fillStyle = 'rgba(225,251,255,0.92)';
      ctx.strokeStyle = 'rgba(78,162,204,0.72)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, ice.radius * 1.25);
      ctx.lineTo(-ice.radius * 0.58, -ice.radius * 0.7);
      ctx.lineTo(ice.radius * 0.58, -ice.radius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
  }

  if (level.environment === 'forest') {
    state.vines.forEach((vine) => {
      const sway = Math.sin(state.time * 4 + vine.wave) * 8;
      ctx.save();
      ctx.globalAlpha = 0.82 * (1 - vine.age / vine.maxAge);
      ctx.strokeStyle = '#5a2da0';
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(vine.x, vine.y);
      ctx.bezierCurveTo(vine.x + sway, vine.y + vine.height * 0.32, vine.x - sway, vine.y + vine.height * 0.62, vine.x, vine.y + vine.height);
      ctx.stroke();
      ctx.fillStyle = '#d775ff';
      ctx.beginPath();
      ctx.arc(vine.x + sway, vine.y + vine.height * 0.34, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  if (level.environment === 'volcano') {
    [0.28, 0.54, 0.78].forEach((ratio, index) => {
      const x = state.width * ratio;
      const pulse = 0.45 + Math.sin(state.time * 3 + index) * 0.18;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = '#ffb15c';
      ctx.beginPath();
      ctx.ellipse(x, state.height * 0.82, 36, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,211,118,0.35)';
      ctx.beginPath();
      ctx.ellipse(x, state.height * 0.66, 30, 120, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  if (level.environment === 'vortex') {
    ctx.save();
    ctx.translate(state.width * 0.52, state.height * 0.42);
    ctx.rotate(state.time * 0.75);
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.lineWidth = 6;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(0, 0, 44 + i * 34, i * 0.55, Math.PI * 1.2 + i * 0.55);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawGame(ctx, state, level) {
  const { width, height, time, fishes, bubbles, charging, player, collectorFlash } = state;
  drawBackground(ctx, width, height, time, level.environment);
  drawEnvironmentHazards(ctx, state, level);

  if (level.mode === 'boss' && !state.bossCaptured && !state.collectorReleased) {
    const bossDistance = getBossDistance(state);
    ctx.save();
    ctx.fillStyle = bossDistance < BOSS_CAPTURE_RADIUS ? 'rgba(255,250,176,0.9)' : 'rgba(255,255,255,0.78)';
    drawRoundedRect(ctx, width / 2 - 245, 18, 490, 42, 21);
    ctx.fillStyle = '#126272';
    ctx.font = '800 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bossDistance < BOSS_CAPTURE_RADIUS ? COPY.bossReady : COPY.bossHint, width / 2, 45);
    ctx.restore();
  }

  if (collectorFlash > 0) {
    ctx.save();
    ctx.globalAlpha = collectorFlash;
    ctx.fillStyle = '#fff2a8';
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.34, 180 + Math.sin(time * 12) * 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  bubbles.forEach((bubble) => drawBubble(ctx, bubble, false, time));
  if (charging.active) drawBubble(ctx, charging, true, time);
  fishes.forEach((fish) => drawFish(ctx, fish, time));
  drawPlayer(ctx, player, time);
  state.floatingTexts.forEach((text) => drawFloatingText(ctx, text, time));
}

function getBossDistance(state) {
  const queen = state.fishes.find((fish) => fish.type === 'redQueen');
  const king = state.fishes.find((fish) => fish.type === 'greenKing');
  if (!queen || !king) return Infinity;
  return distance(queen, king);
}

function bubbleCoversBossPair(bubble, queen, king) {
  const captureSlack = Math.min(queen.radius, king.radius) * 0.55;
  return distance(bubble, queen) <= bubble.radius + captureSlack && distance(bubble, king) <= bubble.radius + captureSlack;
}

function playCollectorSound(muted) {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, audio.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.55);
    gain.connect(audio.destination);
    [523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = audio.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audio.currentTime + index * 0.08);
      osc.connect(gain);
      osc.start(audio.currentTime + index * 0.08);
      osc.stop(audio.currentTime + 0.55);
    });
    window.setTimeout(() => audio.close(), 800);
  } catch {
    // Audio can be blocked if the browser has not received a user gesture.
  }
}

function playSchoolSound(muted) {
  if (muted) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const gain = audio.createGain();
    gain.gain.setValueAtTime(0.001, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, audio.currentTime + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.52);
    gain.connect(audio.destination);
    [392, 523.25, 659.25, 783.99].forEach((freq, index) => {
      const osc = audio.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audio.currentTime + index * 0.07);
      osc.connect(gain);
      osc.start(audio.currentTime + index * 0.07);
      osc.stop(audio.currentTime + 0.54);
    });
    window.setTimeout(() => audio.close(), 760);
  } catch {
    // Audio can be blocked if the browser has not received a user gesture.
  }
}

export function BubbleFishGame({ level, onBack, onOpenTank, onCollectorCaught, tankFish = [] }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const stateRef = useRef(null);
  const pointerRef = useRef({ down: false, x: 0, start: 0 });
  const savedRef = useRef(false);
  const mutedRef = useRef(false);
  const pausedRef = useRef(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hud, setHud] = useState({
    score: 0,
    timeLeft: level.duration,
    gas: START_GAS,
    status: 'playing',
    message: '',
    caughtLevel: null,
  });

  mutedRef.current = muted;
  pausedRef.current = paused;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext('2d');
    let animationId = 0;
    let last = performance.now();
    let lastHud = 0;

    const state = {
      width: 960,
      height: 540,
      time: 0,
      score: 0,
      timeLeft: level.duration,
      gas: START_GAS,
      status: 'playing',
      fishes: [],
      bubbles: [],
      icicles: [],
      vines: [],
      floatingTexts: [],
      nextSpawnAt: 0,
      nextIcicleAt: 2600,
      nextVineAt: 1400,
      pendingSchool: null,
      schoolCount: 0,
      nextSchoolAllowedAt: 4800,
      scoreMilestone: 0,
      restUntil: 0,
      collectorReleased: false,
      collectorCaught: false,
      bossCaptured: false,
      collectorFlash: 0,
      player: { x: 480, y: 470, targetX: 480, hurtCooldown: 0 },
      charging: { active: false, x: 480, y: 430, radius: BUBBLE_MIN_RADIUS },
    };
    stateRef.current = state;

    function resize() {
      const bounds = wrap.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      state.width = Math.max(320, bounds.width);
      state.height = Math.max(260, bounds.height);
      state.player.y = state.height - 68;
      state.player.x = clamp(state.player.x, 60, state.width - 60);
      state.player.targetX = clamp(state.player.targetX, 60, state.width - 60);
      canvas.width = Math.floor(state.width * ratio);
      canvas.height = Math.floor(state.height * ratio);
      canvas.style.width = `${state.width}px`;
      canvas.style.height = `${state.height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    }

    function addFloatingText(value, x, y, color = '#ffffff', size = 22) {
      state.floatingTexts.push({ value, x, y, color, size, age: 0, maxAge: 1.1 });
    }

    function addScore(points, x, y, label) {
      if (points <= 0) return;
      const before = Math.floor(state.score / SCORE_TIME_STEP);
      state.score += points;
      const after = Math.floor(state.score / SCORE_TIME_STEP);
      addFloatingText(label ?? `+${points}`, x, y, '#ffffff');

      if (after > before) {
        const gained = (after - before) * TIME_BONUS_PER_STEP;
        state.timeLeft = clamp(state.timeLeft + gained, 0, level.duration + 45);
        state.scoreMilestone = after;
        addFloatingText(COPY.timeBonus, state.width / 2, 86, '#fff4a3', 24);
      }
    }

    function putFishInBubble(fish, bubble) {
      const multiplier = bubble.scoreFishCount + 1;
      const points = fish.score > 0 ? fish.score * multiplier : 0;
      fish.caught = true;
      bubble.scoreFishCount = multiplier;
      bubble.catches.push({
        type: fish.type,
        relX: clamp(fish.x - bubble.x, -bubble.radius * 0.5, bubble.radius * 0.5),
        relY: clamp(fish.y - bubble.y, -bubble.radius * 0.5, bubble.radius * 0.5),
        radius: fish.radius,
        color: fish.color,
        accent: fish.accent,
        wave: fish.wave,
      });

      if (points > 0) {
        addScore(points, fish.x, fish.y - 16, `+${points}`);
        if (multiplier > 1) {
          addFloatingText(`${COPY.multiplier}${multiplier}`, bubble.x, bubble.y + bubble.radius * 0.48, '#ff5b78', 30);
        }
      }
    }

    function releaseCollector() {
      if (state.collectorReleased) return;
      state.collectorReleased = true;
      state.collectorFlash = 1;
      state.fishes.push(createFish('collector', state.width, state.height, level));
      addFloatingText(COPY.collectorComing, state.width / 2, state.height * 0.3, '#fff4a3');
      playCollectorSound(mutedRef.current);
    }

    function applyFishEffect(fish) {
      const type = FISH_TYPES[fish.type];

      if (fish.type === 'collector') {
        state.collectorCaught = true;
        state.status = 'won';
        addScore(type.score, fish.x, fish.y - 16, `+${type.score}`);
        addFloatingText(COPY.collectorSuccess, fish.x, fish.y, '#fff4a3');
        if (!savedRef.current) {
          savedRef.current = true;
          onCollectorCaught(level, state.score);
          setHud((current) => ({ ...current, caughtLevel: level.stageId ?? level.id }));
        }
        return;
      }

      if (type.timeBonus) {
        state.timeLeft = clamp(state.timeLeft + type.timeBonus, 0, level.duration + 35);
        addFloatingText(type.timeBonus > 0 ? `+${type.timeBonus}s` : `${type.timeBonus}s`, fish.x, fish.y, type.timeBonus > 0 ? '#fff4a3' : '#263142');
      }

      if (type.gasBonus) {
        state.gas = clamp(state.gas + type.gasBonus, 0, MAX_GAS);
        addFloatingText(`${COPY.gas} +${type.gasBonus}`, fish.x, fish.y, '#c9fff6');
      }

    }

    function seedBosses() {
      if (level.mode !== 'boss') return;
      if (state.fishes.some((fish) => fish.type === 'redQueen' || fish.type === 'greenKing')) return;
      state.fishes.push(createFish('redQueen', state.width, state.height, level, 'left'));
      state.fishes.push(createFish('greenKing', state.width, state.height, level, 'right'));
    }

    function spawnFishGroup(group) {
      for (let i = 0; i < group.schoolSize; i += 1) {
        const fish = createFish(group.type, state.width, state.height, level, group.side);
        const clusterRow = group.cluster ? (i % 3) - 1 : 0;
        const clusterColumn = group.cluster ? Math.floor(i / 3) : i;
        fish.y = clamp(group.schoolY + clusterRow * 24 + rand(-9, 9), state.height * 0.14, state.height * 0.7);
        fish.baseY = fish.y;
        fish.x += group.side === 'left' ? -clusterColumn * 34 : clusterColumn * 34;
        state.fishes.push(fish);
      }
    }

    function planFishSpawn(now) {
      const canSpawnSchool =
        state.schoolCount < 2 &&
        now >= state.nextSchoolAllowedAt &&
        state.timeLeft > 12 &&
        Math.random() < 0.11;

      const type = canSpawnSchool ? (Math.random() > 0.35 ? 'normal' : 'bonus') : chooseFishType(level);
      const schoolSize = canSpawnSchool ? Math.floor(rand(9, 12)) : 1;
      const group = {
        type,
        schoolSize,
        schoolY: rand(state.height * 0.18, state.height * 0.62),
        side: Math.random() > 0.5 ? 'left' : 'right',
        cluster: canSpawnSchool,
        releaseAt: now + 820,
      };

      if (schoolSize > 1) {
        state.schoolCount += 1;
        state.nextSchoolAllowedAt = now + rand(16000, 24000);
        state.pendingSchool = group;
        addFloatingText(COPY.schoolComing, state.width / 2, state.height * 0.24, '#fff4a3', 28);
        playSchoolSound(mutedRef.current);
        state.nextSpawnAt = now + level.spawnEvery + 820;
        return;
      }

      spawnFishGroup(group);
      state.nextSpawnAt = now + level.spawnEvery;
    }

    function updateEnvironment(delta, now) {
      if (level.environment === 'ice' && now >= state.nextIcicleAt) {
        state.icicles.push({
          x: rand(80, state.width - 80),
          y: -30,
          vy: rand(115, 170),
          radius: rand(16, 25),
        });
        state.nextIcicleAt = now + rand(4200, 6500);
      }

      if (level.environment === 'forest' && now >= state.nextVineAt) {
        state.vines.push({
          x: rand(state.width * 0.22, state.width * 0.82),
          y: rand(state.height * 0.18, state.height * 0.34),
          height: rand(150, 240),
          age: 0,
          maxAge: rand(3.2, 4.8),
          wave: rand(0, Math.PI * 2),
          push: Math.random() > 0.5 ? 1 : -1,
        });
        state.nextVineAt = now + rand(2500, 4200);
      }

      state.icicles.forEach((ice) => {
        ice.y += ice.vy * delta;
      });
      state.icicles = state.icicles.filter((ice) => ice.y < state.height + 70);

      state.vines.forEach((vine) => {
        vine.age += delta;
      });
      state.vines = state.vines.filter((vine) => vine.age < vine.maxAge);
    }

    function applyEnvironmentToBubbles(delta) {
      state.bubbles.forEach((bubble) => {
        if (level.environment === 'ice') {
          for (const ice of state.icicles) {
            if (distance(bubble, ice) < bubble.radius + ice.radius * 0.72) {
              bubble.life = 0;
              addFloatingText(COPY.bubblePopped, bubble.x, bubble.y, '#e9fbff');
              break;
            }
          }
        }

        if (level.environment === 'forest') {
          state.vines.forEach((vine) => {
            const withinX = Math.abs(bubble.x - vine.x) < bubble.radius + 20;
            const withinY = bubble.y > vine.y - bubble.radius && bubble.y < vine.y + vine.height + bubble.radius;
            if (withinX && withinY) {
              bubble.x += vine.push * 95 * delta;
              bubble.life -= 0.18 * delta;
            }
          });
        }

        if (level.environment === 'volcano' && bubble.y > state.height * 0.44) {
          [0.28, 0.54, 0.78].forEach((ratio, index) => {
            const ventX = state.width * ratio;
            if (Math.abs(bubble.x - ventX) < 52) {
              bubble.y -= (40 + index * 8) * delta;
              bubble.x += Math.sin(state.time * 5 + index) * 55 * delta;
            }
          });
        }

        if (level.environment === 'vortex') {
          const center = { x: state.width * 0.52, y: state.height * 0.42 };
          const pull = clamp(1 - distance(bubble, center) / 260, 0, 1);
          bubble.x += (center.x - bubble.x) * pull * 0.65 * delta;
          bubble.y += (center.y - bubble.y) * pull * 0.28 * delta;
        }
      });
    }

    function update(delta, now) {
      if (state.status !== 'playing' || pausedRef.current) return;

      state.time += delta;
      state.timeLeft -= delta;
      state.gas = clamp(state.gas + GAS_RECOVERY_PER_SECOND * delta, 0, MAX_GAS);
      state.collectorFlash = Math.max(0, state.collectorFlash - delta * 0.45);
      state.player.hurtCooldown = Math.max(0, state.player.hurtCooldown - delta);
      state.player.x += (state.player.targetX - state.player.x) * clamp(delta * 8, 0, 1);
      state.player.y = state.height - 68;

      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.status = 'lost';
        setHud((current) => ({ ...current, status: 'lost', message: COPY.timeUp }));
        return;
      }

      seedBosses();
      updateEnvironment(delta, now);

      if (state.pendingSchool && now >= state.pendingSchool.releaseAt) {
        spawnFishGroup(state.pendingSchool);
        state.pendingSchool = null;
      }

      if (!state.pendingSchool && now >= state.nextSpawnAt) {
        planFishSpawn(now);
      }

      if (level.mode === 'score' && state.score >= level.targetScore && !state.collectorReleased) {
        releaseCollector();
      }

      const mouth = { x: state.player.x + 48, y: state.player.y - 24 };
      if (pointerRef.current.down && state.gas > 0 && now >= state.restUntil) {
        const held = (now - pointerRef.current.start) / 1000;
        state.charging.active = true;
        state.charging.x = mouth.x;
        state.charging.y = mouth.y;
        state.charging.radius = clamp(BUBBLE_MIN_RADIUS + held * 60, BUBBLE_MIN_RADIUS, BUBBLE_MAX_RADIUS);
      } else {
        state.charging.active = false;
      }

      state.fishes.forEach((fish) => {
        const boss = FISH_TYPES[fish.type]?.boss;
        fish.x += fish.vx * delta;
        fish.y = (fish.baseY || fish.y) + Math.sin(state.time * (boss ? 1.55 : 2.6) + fish.wave) * (boss ? 34 : 14);
        if (boss && (fish.x < -80 || fish.x > state.width + 80)) {
          fish.vx *= -1;
          fish.x = clamp(fish.x, -70, state.width + 70);
        }
      });

      state.bubbles.forEach((bubble) => {
        bubble.y -= BUBBLE_RISE_PER_SECOND * delta;
        bubble.life -= delta * 0.045;
      });
      applyEnvironmentToBubbles(delta);

      for (const bubble of state.bubbles) {
        for (const fish of state.fishes) {
          if (fish.caught) continue;
          const bubbleDistance = distance(bubble, fish);
          const hazardHit = bubbleDistance <= bubble.radius + fish.radius * 0.64;
          const catchHit = bubbleDistance <= bubble.radius - fish.radius * 0.18;
          if (!hazardHit) continue;

          if (fish.type === 'puffer') {
            bubble.life = 0;
            fish.caught = true;
            addFloatingText(COPY.bubblePopped, fish.x, fish.y, '#263142');
            continue;
          }

          if (!catchHit) continue;

          if (fish.type === 'redQueen' || fish.type === 'greenKing') {
            continue;
          }

          if (fish.type === 'collector') {
            fish.caught = true;
            applyFishEffect(fish);
          } else {
            putFishInBubble(fish, bubble);
            applyFishEffect(fish);
          }
        }

        if (level.mode === 'boss' && bubble.radius >= BOSS_MIN_BUBBLE_RADIUS) {
          const queen = state.fishes.find((fish) => fish.type === 'redQueen' && !fish.caught);
          const king = state.fishes.find((fish) => fish.type === 'greenKing' && !fish.caught);
          if (
            queen &&
            king &&
            distance(queen, king) < BOSS_CAPTURE_RADIUS &&
            bubbleCoversBossPair(bubble, queen, king)
          ) {
            queen.caught = true;
            king.caught = true;
            bubble.life = 0;
            state.bossCaptured = true;
            addScore(Math.max(0, level.targetScore - state.score), bubble.x, bubble.y - 18, `+${Math.max(0, level.targetScore - state.score)}`);
            addFloatingText(COPY.bossCaught, bubble.x, bubble.y, '#fff4a3');
            releaseCollector();
          }
        }
      }

      state.fishes = state.fishes.filter((fish) => {
        const boss = FISH_TYPES[fish.type]?.boss;
        if (boss) return !fish.caught;
        return (
          !fish.caught &&
          fish.x > -130 &&
          fish.x < state.width + 130 &&
          fish.y > -90 &&
          fish.y < state.height + 90
        );
      });
      state.bubbles = state.bubbles.filter((bubble) => bubble.life > 0 && bubble.y + bubble.radius > -30);
      state.floatingTexts.forEach((text) => {
        text.age += delta;
      });
      state.floatingTexts = state.floatingTexts.filter((text) => text.age < text.maxAge);
    }

    function frame(now) {
      const delta = Math.min(0.04, (now - last) / 1000);
      last = now;
      update(delta, now);
      ctx.clearRect(0, 0, state.width, state.height);
      drawGame(ctx, state, level);

      if (now - lastHud > 90) {
        lastHud = now;
        setHud((current) => ({
          ...current,
          score: state.score,
          timeLeft: state.timeLeft,
          gas: state.gas,
          status: state.status,
          message: state.status === 'won' ? COPY.caughtCollector : state.status === 'lost' ? COPY.timeUp : '',
        }));
      }

      animationId = requestAnimationFrame(frame);
    }

    resize();
    window.addEventListener('resize', resize);
    animationId = requestAnimationFrame(frame);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [level, onCollectorCaught]);

  function getCanvasPoint(event) {
    const bounds = canvasRef.current.getBoundingClientRect();
    return {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    };
  }

  function movePlayerTo(event) {
    const state = stateRef.current;
    if (!state) return;
    const point = getCanvasPoint(event);
    state.player.targetX = clamp(point.x, 64, state.width - 64);
    pointerRef.current.x = point.x;
  }

  function handlePointerDown(event) {
    if (hud.status !== 'playing' || paused) return;
    const state = stateRef.current;
    if (!state) return;
    if (state.gas < 12 || performance.now() < state.restUntil) {
      state.restUntil = performance.now() + EMPTY_GAS_REST_SECONDS * 1000;
      state.floatingTexts.push({
        value: COPY.rest,
        x: state.player.x,
        y: state.player.y - 58,
        color: '#ffffff',
        age: 0,
        maxAge: 1.1,
      });
      return;
    }
    movePlayerTo(event);
    pointerRef.current = {
      down: true,
      x: pointerRef.current.x,
      start: performance.now(),
    };
    canvasRef.current.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event) {
    movePlayerTo(event);
  }

  function handlePointerUp(event) {
    const state = stateRef.current;
    if (!state || !pointerRef.current.down) return;
    pointerRef.current.down = false;
    const radius = state.charging.radius;
    const cost = Math.round(10 + radius * 0.48);
    if (state.gas >= cost && state.status === 'playing' && !paused) {
      state.gas = clamp(state.gas - cost, 0, MAX_GAS);
      state.bubbles.push({
        x: state.player.x + 48,
        y: state.player.y - 24,
        radius,
        life: 1,
        catches: [],
        scoreFishCount: 0,
      });
    } else if (state.status === 'playing') {
      state.gas = 0;
      state.restUntil = performance.now() + EMPTY_GAS_REST_SECONDS * 1000;
      state.floatingTexts.push({
        value: COPY.rest,
        x: state.player.x,
        y: state.player.y - 58,
        color: '#ffffff',
        age: 0,
        maxAge: 0.9,
      });
    }
    state.charging.active = false;
    try {
      canvasRef.current.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  }

  const bagLevels = ['A', 'B', 'C'];
  const filledBags = new Set(tankFish.map((fish) => fish.stageId ?? fish.levelId));
  if (hud.caughtLevel) filledBags.add(hud.caughtLevel);

  return (
    <main className="game-screen">
      <div className="game-topbar">
        <button className="ghost-button compact" type="button" onClick={onBack}>
          {COPY.back}
        </button>
        <div className="level-title">
          <strong>{level.name}</strong>
          <span>
            {level.mode === 'boss' ? COPY.boss : COPY.target} {level.targetScore.toLocaleString()} {COPY.points}
          </span>
        </div>
        <button className="ghost-button compact" type="button" onClick={onOpenTank}>
          {COPY.tank}
        </button>
      </div>

      <section className="game-stage" ref={wrapRef}>
        <canvas
          ref={canvasRef}
          aria-label={COPY.canvasLabel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />

        <div className="hud time-hud">
          <span>{COPY.time}</span>
          <strong>{formatTime(hud.timeLeft)}</strong>
        </div>

        <div className="score-hud" aria-label={COPY.score}>
          <strong>
            {Math.min(hud.score, level.targetScore).toLocaleString()}/{level.targetScore.toLocaleString()}
          </strong>
          <span>{hud.score >= level.targetScore ? COPY.collectorVisible : COPY.keepCatching}</span>
        </div>

        <div className="hud gas-hud">
          <span>{COPY.gas}</span>
          <div className="gas-orb">
            <i style={{ height: `${hud.gas}%` }} />
          </div>
        </div>

        <div className="stage-controls" aria-label="controls">
          <button className="icon-button" type="button" aria-label={paused ? COPY.resume : COPY.pause} title={paused ? COPY.resume : COPY.pause} onClick={() => setPaused((value) => !value)}>
            <span className={paused ? 'control-icon play-icon' : 'control-icon pause-icon'} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label={muted ? COPY.musicOff : COPY.musicOn} title={muted ? COPY.musicOff : COPY.musicOn} onClick={() => setMuted((value) => !value)}>
            <span className={muted ? 'control-icon sound-off-icon' : 'control-icon sound-on-icon'} aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label={COPY.exit} title={COPY.exit} onClick={onBack}>
            <span className="control-icon exit-icon" aria-hidden="true" />
          </button>
        </div>

        <div className="bag-dock" aria-label={COPY.bags}>
          {bagLevels.map((bagLevel) => (
            <span className={`fish-bag ${filledBags.has(bagLevel) ? 'filled' : ''}`} key={bagLevel}>
              <i>{bagLevel}</i>
            </span>
          ))}
        </div>

        <div className="hint-line">{COPY.hint}</div>

        {paused && hud.status === 'playing' && (
          <div className="pause-chip">{COPY.pause}</div>
        )}

        {hud.status !== 'playing' && (
          <div className="result-overlay">
            <div className="result-panel">
              {hud.status === 'won' ? (
                <div className="collector-prize">
                  <div className="collector-sparkle" />
                  <div className="collector-showcase" style={{ '--fish-color': level.collectorColor }}>
                    <span className="fish-body fish-level-3" />
                  </div>
                  <p>
                    {COPY.collectorPrize}
                    <br />
                    {level.collectorQuality}
                    {FISH_TYPES.collector.label}
                  </p>
                </div>
              ) : (
                <>
                  <h2>{COPY.lostTitle}</h2>
                  <p>{hud.message}</p>
                </>
              )}
              <div className="result-actions">
                <button className="primary-button" type="button" onClick={() => window.location.reload()}>
                  {COPY.restart}
                </button>
                <button className="ghost-button" type="button" onClick={hud.status === 'won' ? onOpenTank : onBack}>
                  {hud.status === 'won' ? COPY.goTank : COPY.home}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
