import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LEVELS, SCENES } from './gameData.js';
import {
  addCollectedFish,
  feedFish,
  getFishList,
  isSceneUnlocked,
  moveFishToFirstOpenTank,
  readGameSave,
} from './storage.js';
import { BubbleFishGame } from './BubbleFishGame.jsx';

const COPY = {
  bubble: '\u6ce1',
  title: '\u6ce1\u6ce1\u9c7c',
  subtitle: '\u95ef\u8fc7\u6bcf\u4e2a\u573a\u666f\u7684 A/B/C \u4e09\u5c0f\u5173\uff0c\u89e3\u9501\u66f4\u6df1\u7684\u6d77\u57df\u548c\u66f4\u7a00\u6709\u7684\u6536\u85cf\u9c7c\u3002',
  points: '\u5206',
  collectorFish: '\u6536\u85cf\u9c7c',
  myTank: '\u9c7c\u7f38',
  bag: '\u5851\u6599\u888b',
  back: '\u8fd4\u56de',
  locked: '\u672a\u89e3\u9501',
  completePrevious: '\u901a\u5173\u4e0a\u4e00\u573a\u666f A/B/C \u540e\u89e3\u9501',
  tankTitle: '\u9c7c\u7f38\u4e0e\u5851\u6599\u888b',
  tankIntro: '\u6536\u85cf\u9c7c\u5148\u8fdb\u5851\u6599\u888b\uff0c\u8bf7\u53ca\u65f6\u653e\u5165\u9c7c\u7f38\u3002\u9c7c\u7f38\u9ed8\u8ba4 3 \u4e2a\uff0c\u6bcf\u4e2a\u6700\u591a 10 \u6761\u3002',
  emptyBag: '\u5851\u6599\u888b\u91cc\u8fd8\u6ca1\u6709\u9c7c\u3002',
  emptyTank: '\u8fd9\u4e2a\u9c7c\u7f38\u8fd8\u662f\u7a7a\u7684\u3002',
  from: '\u6765\u81ea',
  family: '\u5bb6\u65cf',
  star: '\u661f\u7ea7',
  level: '\u7ea7\u522b',
  life: '\u751f\u547d',
  moveToTank: '\u653e\u5165\u9c7c\u7f38',
  feed: '\u5582\u517b',
  food: '\u9c7c\u98df',
  shell: '\u8d1d\u58f3',
  pearl: '\u73cd\u73e0',
  full: '\u9c7c\u7f38\u5df2\u6ee1',
  maxLevel: '\u53ef\u517b\u7ea7\u522b',
  cannotRaise: '\u7b49\u7ea7\u8fc7\u9ad8',
  capacity: '\u5bb9\u91cf',
  storedBag: '\u5f85\u5165\u7f38',
};

function stars(count) {
  return '\u2605'.repeat(count) + '\u2606'.repeat(Math.max(0, 5 - count));
}

function formatDate(value) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function FishCard({ fish, actionLabel, onAction, disabled, compact = false }) {
  return (
    <article className={`tank-fish-card ${compact ? 'mini-fish-card' : ''}`}>
      <div className="tank-fish-preview" style={{ '--fish-color': fish.color }}>
        <span className={`fish-body fish-level-${fish.level}`} />
      </div>
      <div>
        <h3>
          {fish.quality}
          {COPY.collectorFish}
        </h3>
        <p>
          {COPY.family}: {fish.familyName} / {COPY.star}: {stars(fish.star)}
        </p>
        <p>
          L{fish.level} / {COPY.from} {fish.levelId} / {formatDate(fish.caughtAt)}
        </p>
        <div className="life-row">
          <span>{COPY.life}</span>
          <div className="growth-bar">
            <span style={{ width: `${fish.life}%` }} />
          </div>
        </div>
      </div>
      {actionLabel && (
        <button className="small-button" type="button" disabled={disabled} onClick={() => onAction(fish.id)}>
          {actionLabel}
        </button>
      )}
    </article>
  );
}

function HomeScreen({ save, onStart, onOpenTank }) {
  return (
    <main className="home-screen map-screen">
      <section className="hero-panel map-panel">
        <div className="brand-lockup">
          <span className="brand-bubble" aria-hidden="true">
            {COPY.bubble}
          </span>
          <div>
            <h1>{COPY.title}</h1>
            <p>{COPY.subtitle}</p>
          </div>
        </div>

        <div className="map-toolbar">
          <span className="resource-pill shell-pill" title={COPY.shell}>
            <i aria-hidden="true" />
            <strong>100,000</strong>
          </span>
          <span className="resource-pill pearl-pill" title={COPY.pearl}>
            <i aria-hidden="true" />
            <strong>10,000</strong>
          </span>
        </div>

        <div className="scene-map island-map" aria-label="scene map">
          {SCENES.map((scene, index) => {
            const unlocked = isSceneUnlocked(scene.id, save, SCENES, LEVELS);
            const sceneLevels = LEVELS.filter((level) => level.sceneId === scene.id);
            const completedCount = sceneLevels.filter((level) => save.completedLevels.includes(level.id)).length;

            return (
              <section className={`scene-node scene-pos-${index + 1} ${unlocked ? '' : 'locked'}`} key={scene.id}>
                <div className="scene-orb" style={{ '--scene-color': scene.color }}>
                  <span>{unlocked ? scene.id.replace('S', '') : '?'}</span>
                </div>
                <div className="scene-info">
                  <h2>{scene.name}</h2>
                  <p>{unlocked ? `${scene.theme} / ${completedCount}/3` : COPY.completePrevious}</p>
                  <div className="stage-buttons">
                    {sceneLevels.map((level) => {
                      const done = save.completedLevels.includes(level.id);
                      return (
                        <button
                          className={done ? 'stage-button done' : 'stage-button'}
                          disabled={!unlocked}
                          key={level.id}
                          type="button"
                          onClick={() => onStart(level.id)}
                        >
                          <strong>{level.stageId}</strong>
                          <span>{level.targetScore.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {!unlocked && <span className="lock-badge">{COPY.locked}</span>}
              </section>
            );
          })}
        </div>

        <div className="home-actions">
          <button className="primary-button" type="button" onClick={() => onStart('S1A')}>
            S1 A
          </button>
          <button className="ghost-button" type="button" onClick={onOpenTank}>
            {COPY.myTank} / {COPY.bag} ({Object.keys(save.fishById).length})
          </button>
        </div>
      </section>
    </main>
  );
}

function TankScreen({ save, onMoveToTank, onFeed, onBack }) {
  const [activeTankId, setActiveTankId] = useState(save.tanks[0]?.id);
  const [feedingBatch, setFeedingBatch] = useState(null);
  const fishById = save.fishById;
  const bagFish = save.bags.map((fishId) => fishById[fishId]).filter(Boolean);
  const activeTank = save.tanks.find((tank) => tank.id === activeTankId) ?? save.tanks[0];
  const tankFish = activeTank ? activeTank.fishIds.map((fishId) => fishById[fishId]).filter(Boolean) : [];
  const getOpenTankForFish = (fish) =>
    save.tanks.find((tank) => tank.fishIds.length < tank.capacity && tank.maxFishLevel >= fish.level);

  function getSwimPosition(index) {
    const duration = 24;
    const elapsed = ((performance.now() / 1000 + index * 1.4) % duration) / duration;
    if (elapsed < 0.49) {
      return { x: -120 + (660 * elapsed) / 0.49, scale: 1 };
    }
    if (elapsed < 0.5) {
      return { x: 540, scale: -1 };
    }
    if (elapsed < 0.99) {
      return { x: 540 - (660 * (elapsed - 0.5)) / 0.49, scale: -1 };
    }
    return { x: -120, scale: 1 };
  }

  useEffect(() => {
    if (!feedingBatch) return undefined;
    const timer = window.setTimeout(() => setFeedingBatch(null), 2400);
    return () => window.clearTimeout(timer);
  }, [feedingBatch]);

  const handleFeedClick = () => {
    if (tankFish.length === 0) return;
    const targets = {};
    tankFish.forEach((fish, index) => {
      const start = getSwimPosition(index);
      const row = index % 4;
      const around = index % 6;
      targets[fish.id] = {
        startX: `${Math.round(start.x)}px`,
        startScale: start.scale,
        eatX: `${150 + around * 20 + Math.round(Math.random() * 24 - 12)}px`,
        eatY: `${Math.round(-14 - row * 42 + Math.random() * 24)}px`,
        restX: `${Math.round(start.x + Math.random() * 80 - 40)}px`,
        restY: `${Math.round(Math.random() * 24 - 12)}px`,
        duration: `${2.1 + Math.random() * 0.55}s`,
        delay: `${(index % 7) * 0.07 + Math.random() * 0.08}s`,
      };
    });
    setFeedingBatch({ id: Date.now(), targets });
    tankFish.forEach((fish) => onFeed(fish.id));
  };

  return (
    <main className="tank-screen">
      <header className="screen-header">
        <button className="ghost-button compact" type="button" onClick={onBack}>
          {COPY.back}
        </button>
        <div>
          <h2>{COPY.tankTitle}</h2>
          <p>
            {COPY.tankIntro} / {COPY.food}: {save.food}
          </p>
        </div>
      </header>

      <section className="tank-window" aria-label={COPY.myTank}>
        <div className="tank-water" />

        <div className="aquarium-layout">
          <aside className="bag-sidebar">
            <h2>
              {COPY.bag} <span>{bagFish.length}</span>
            </h2>
            {bagFish.length === 0 ? (
              <p className="empty-note">{COPY.emptyBag}</p>
            ) : (
              <div className="bag-list">
                {bagFish.map((fish) => {
                  const openTank = getOpenTankForFish(fish);
                  return (
                    <FishCard
                      actionLabel={openTank ? COPY.moveToTank : COPY.cannotRaise}
                      compact
                      disabled={!openTank}
                      fish={fish}
                      key={fish.id}
                      onAction={onMoveToTank}
                    />
                  );
                })}
              </div>
            )}
          </aside>

          <section className="display-aquarium">
            <div className="aquarium-header">
              <h2>{activeTank?.name}</h2>
              <p>
                {COPY.star}: {stars(activeTank?.star ?? 1)} / {COPY.maxLevel}: L1-L{activeTank?.maxFishLevel ?? 1} /{' '}
                {COPY.capacity}: {tankFish.length}/{activeTank?.capacity ?? 0}
              </p>
            </div>
            <div className="aquarium-scene">
              <div className="cave-shape" />
              <div className="tank-plants plants-left" />
              <div className="tank-plants plants-right" />
              {feedingBatch && (
                <div className="food-rain" aria-hidden="true">
                  {Array.from({ length: 24 }, (_, index) => (
                    <span key={index} style={{ '--drop-index': index }} />
                  ))}
                </div>
              )}
              {tankFish.length === 0 ? (
                <p className="empty-note aquarium-empty">{COPY.emptyTank}</p>
              ) : (
                tankFish.map((fish, index) => (
                  <div
                    className={`swimming-fish fish-level-${fish.level} ${feedingBatch ? 'feeding-target' : ''}`}
                    key={fish.id}
                    style={{
                      '--fish-color': fish.color,
                      '--swim-y': `${22 + (index % 4) * 16}%`,
                      '--swim-delay': `${index * -1.4}s`,
                      '--eat-index': index,
                      '--start-x': feedingBatch?.targets[fish.id]?.startX,
                      '--start-scale': feedingBatch?.targets[fish.id]?.startScale,
                      '--eat-x': feedingBatch?.targets[fish.id]?.eatX,
                      '--eat-y': feedingBatch?.targets[fish.id]?.eatY,
                      '--rest-x': feedingBatch?.targets[fish.id]?.restX,
                      '--rest-y': feedingBatch?.targets[fish.id]?.restY,
                      '--eat-duration': feedingBatch?.targets[fish.id]?.duration,
                      '--eat-delay': feedingBatch?.targets[fish.id]?.delay,
                    }}
                    title={`${fish.familyName} L${fish.level}`}
                  >
                    <span className="fish-body" />
                  </div>
                ))
              )}
            </div>
            <button className="feed-button" type="button" disabled={tankFish.length === 0} onClick={handleFeedClick}>
              {COPY.feed}
            </button>
          </section>

          <nav className="tank-tabs" aria-label="tank list">
            {save.tanks.map((tank) => (
              <button
                className={tank.id === activeTank?.id ? 'tank-tab active' : 'tank-tab'}
                key={tank.id}
                type="button"
                onClick={() => setActiveTankId(tank.id)}
              >
                <span className="tank-thumbnail" />
                <strong>{tank.name.replace(' ', '')}</strong>
                <small>
                  {stars(tank.star)} {tank.fishIds.length}/{tank.capacity}
                </small>
              </button>
            ))}
          </nav>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [screen, setScreen] = useState('home');
  const [activeLevelId, setActiveLevelId] = useState('S1A');
  const [save, setSave] = useState(() => readGameSave());

  const activeLevel = useMemo(
    () => LEVELS.find((level) => level.id === activeLevelId) ?? LEVELS[0],
    [activeLevelId],
  );

  const startLevel = useCallback((levelId) => {
    setActiveLevelId(levelId);
    setScreen('game');
  }, []);

  const handleCollectorCaught = useCallback((level, score) => {
    setSave(addCollectedFish(level, score));
  }, []);

  const handleMoveToTank = useCallback((id) => {
    setSave(moveFishToFirstOpenTank(id));
  }, []);

  const handleFeed = useCallback((id) => {
    setSave(feedFish(id));
  }, []);

  const fishList = useMemo(() => getFishList(save), [save]);

  return (
    <div className="app-shell">
      {screen === 'home' && (
        <HomeScreen save={save} onStart={startLevel} onOpenTank={() => setScreen('tank')} />
      )}

      {screen === 'game' && (
        <BubbleFishGame
          key={activeLevel.id}
          level={activeLevel}
          onBack={() => setScreen('home')}
          onOpenTank={() => setScreen('tank')}
          onCollectorCaught={handleCollectorCaught}
          tankFish={fishList}
        />
      )}

      {screen === 'tank' && (
        <TankScreen
          save={save}
          onBack={() => setScreen('home')}
          onFeed={handleFeed}
          onMoveToTank={handleMoveToTank}
        />
      )}
    </div>
  );
}
