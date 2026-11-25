/* Ruins of the Ember Temple — an original, asset-free endless runner.
 * Load with <script type="module" src="game.js"></script> (defer also works).
 * Three.js is the only dependency; its version is intentionally pinned.
 */
(() => {
  'use strict';

  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.166.1/build/three.module.js';
  const DEBUG = false;
  const CONFIG = Object.freeze({
    lanes: [-2.8, 0, 2.8], segmentLength: 54, segmentCount: 16,
    gravity: 25, jumpVelocity: 10.8, slideDuration: 0.82,
    minSpeed: 14, maxSpeed: 26, far: 190, particleCount: 650,
  });
  const STATES = Object.freeze({
    MENU: 'menu', COUNTDOWN: 'countdown', RUNNING: 'running',
    PAUSED: 'paused', DYING: 'dying', OVER: 'gameover',
  });
  const POWER_TYPES = ['magnet', 'shield', 'multiplier', 'speed', 'burst', 'doubleJump', 'ghost', 'fireTrail', 'lightning', 'timeFreeze', 'coinStorm', 'phoenix'];
  const POWER_INFO = Object.freeze({
    magnet: { label: 'MAGNET', icon: '◎', color: 0x58e5dc, duration: 12 },
    shield: { label: 'SHIELD', icon: '◇', color: 0x76bfff, duration: 14 },
    multiplier: { label: '2× SCORE', icon: '×2', color: 0xe9bcff, duration: 14 },
    speed: { label: 'HASTE', icon: '»', color: 0xffd275, duration: 8 },
    burst: { label: 'EMBER BURST', icon: '✦', color: 0xff7449, duration: 5 },
    doubleJump: { label: 'DOUBLE JUMP', icon: '↟', color: 0x8ee8ff, duration: 10 },
    ghost: { label: 'GHOST', icon: '◌', color: 0xc18cff, duration: 7 },
    fireTrail: { label: 'FIRE TRAIL', icon: 'ϟ', color: 0xff6948, duration: 8 },
    lightning: { label: 'LIGHTNING DASH', icon: 'ϟ', color: 0xffed72, duration: 5 },
    timeFreeze: { label: 'TIME FREEZE', icon: '◷', color: 0x82c8ff, duration: 7 },
    coinStorm: { label: 'COIN STORM', icon: '✧', color: 0xffd85f, duration: 5 },
    phoenix: { label: 'PHOENIX', icon: '♢', color: 0xff9b55, duration: 18 },
  });
  // Each stretch of the run has its own visual language. Gameplay still uses
  // the same three lanes and recyclable segments; only the presentation of a
  // segment changes as the expedition moves through the world.
  const BIOMES = Object.freeze([
    { name: 'Golden Temple', sky: 0x4d82a7, fog: 0x8eaaa7, floor: 'sandstone', bank: 'sandstoneDark', patch: 'sandPatch', stone: 'sandstone', trim: 'terracotta', accent: 'turquoise' },
    { name: 'Emerald Jungle', sky: 0x267c83, fog: 0x3d7775, floor: 'jungleDirt', bank: 'jungleBank', patch: 'leafLitter', stone: 'jungleStone', trim: 'gold', accent: 'rune' },
    { name: 'Cyan Falls', sky: 0x4ca5bd, fog: 0x68a8af, floor: 'waterStone', bank: 'waterBank', patch: 'foam', stone: 'waterStone', trim: 'turquoise', accent: 'rune' },
    { name: 'Crystal Cavern', sky: 0x302c70, fog: 0x413f78, floor: 'caveStone', bank: 'caveBank', patch: 'crystalDust', stone: 'caveStone', trim: 'violet', accent: 'crystalBlue' },
    { name: 'Lava Ruins', sky: 0x4f202a, fog: 0x562d2c, floor: 'volcanic', bank: 'volcanic', patch: 'lavaPatch', stone: 'volcanic', trim: 'lava', accent: 'ember' },
    { name: 'Mystic Sky Ruins', sky: 0x9c456a, fog: 0x985970, floor: 'sunsetStone', bank: 'sunsetBank', patch: 'roseSand', stone: 'sunsetStone', trim: 'sunsetGold', accent: 'flowerMagenta' },
    { name: 'Moonlit Ruins', sky: 0x1e3265, fog: 0x293d67, floor: 'moonStone', bank: 'moonBank', patch: 'moonMoss', stone: 'moonStone', trim: 'moonGold', accent: 'moonCyan' },
  ]);
  const biomeForDistance = distance => Math.floor(Math.max(0, distance) / (CONFIG.segmentLength * 5)) % BIOMES.length;
  const CHARACTERS = Object.freeze({
    explorer: { name: 'The Explorer', subtitle: 'Balanced pathfinder', color: 0xd14d8e, unlocked: true, speed: 1, jump: 1, power: 1, resistance: 0 },
    runner: { name: 'The Runner', subtitle: 'Fast, fearless, fragile', color: 0xff805b, speed: 1.08, jump: 1, power: 0.9, resistance: 0, cost: 900 },
    mystic: { name: 'The Mystic', subtitle: 'Powerful relic keeper', color: 0xb466ff, speed: 0.98, jump: 1.02, power: 1.24, resistance: 0, cost: 1400 },
    warrior: { name: 'The Warrior', subtitle: 'Stone-tested survivor', color: 0x5ec5d8, speed: 0.96, jump: 0.98, power: 0.95, resistance: 1, cost: 1800 },
    skyNomad: { name: 'The Sky Nomad', subtitle: 'Born for broken bridges', color: 0xffd15b, speed: 1, jump: 1.18, power: 1, resistance: 0, cost: 2300 },
  });
  const COSMETIC_STYLES = Object.freeze({
    outfit: [{ id: 'jungle', label: 'Jungle', color: 0x2aa886 }, { id: 'sunset', label: 'Sunset', color: 0xf277c8 }, { id: 'crystal', label: 'Crystal', color: 0x8d65ff }, { id: 'ember', label: 'Ember', color: 0xff6948 }],
    head: [{ id: 'traveler', label: 'Traveler' }, { id: 'sun-crown', label: 'Sun Crown' }, { id: 'moon-hood', label: 'Moon Hood' }],
    scarf: [{ id: 'ember', label: 'Ember' }, { id: 'aqua', label: 'Aqua' }, { id: 'violet', label: 'Violet' }],
    trail: [{ id: 'embers', label: 'Embers', color: 0xff9b55 }, { id: 'starlight', label: 'Starlight', color: 0x8ee8ff }, { id: 'violet', label: 'Violet', color: 0xd957ff }],
  });
  const UPGRADE_INFO = Object.freeze({
    speed: { label: 'RUN SPEED', description: 'Raise your starting pace.', base: 500, cap: 5 },
    jump: { label: 'JUMP', description: 'Leap higher and recover faster.', base: 450, cap: 5 },
    magnet: { label: 'MAGNET', description: 'Increase coin attraction range.', base: 400, cap: 5 },
    shield: { label: 'SHIELD', description: 'Make protection last longer.', base: 550, cap: 5 },
    coinValue: { label: 'COIN VALUE', description: 'Earn more from every treasure.', base: 650, cap: 5 },
    duration: { label: 'POWER DURATION', description: 'Keep relic powers longer.', base: 700, cap: 5 },
    combo: { label: 'COMBO', description: 'Keep chains alive through danger.', base: 600, cap: 5 },
    revive: { label: 'REVIVE', description: 'Unlock one extra Phoenix rescue.', base: 900, cap: 3 },
  });
  const MISSION_DEFS = Object.freeze([
    { id: 'distance1000', label: 'Run 1,000 meters', type: 'distance', target: 1000, reward: 250 },
    { id: 'coins500', label: 'Collect 500 treasures', type: 'coins', target: 500, reward: 300 },
    { id: 'near20', label: 'Perform 20 near misses', type: 'near', target: 20, reward: 350 },
    { id: 'powers3', label: 'Awaken 3 powers', type: 'powers', target: 3, reward: 250 },
    { id: 'survive300', label: 'Survive a 300m chapter', type: 'distance', target: 300, reward: 200 },
    { id: 'relic3', label: 'Find 3 ancient relics', type: 'relics', target: 3, reward: 800 },
  ]);
  const ACHIEVEMENT_DEFS = Object.freeze([
    { id: 'firstSteps', label: 'FIRST STEPS', description: 'Run 500 meters.', type: 'distance', target: 500 },
    { id: 'treasureHunter', label: 'TREASURE HUNTER', description: 'Collect 1,000 treasures.', type: 'coins', target: 1000 },
    { id: 'fearless', label: 'FEARLESS', description: 'Perform 50 near misses.', type: 'near', target: 50 },
    { id: 'explorer', label: 'EXPLORER', description: 'Visit every biome.', type: 'biomes', target: BIOMES.length },
    { id: 'guardianEscape', label: 'GUARDIAN ESCAPE', description: 'Survive a guardian chase.', type: 'guardian', target: 1 },
    { id: 'survivor', label: 'SURVIVOR', description: 'Run for 10 minutes total.', type: 'time', target: 600 },
  ]);
  const ADVENTURE_LEVELS = Object.freeze([
    { id: 'jungleEscape', name: 'Escape from the Jungle', biome: 1, objective: 'Reach the ancient temple', type: 'distance', target: 520, reward: 900 },
    { id: 'brokenBridge', name: 'The Broken Bridge', biome: 2, objective: 'Cross the waterfall without falling', type: 'distance', target: 760, reward: 1200 },
    { id: 'fireTemple', name: 'Temple of Fire', biome: 4, objective: 'Escape the collapsing volcanic temple', type: 'event', target: 900, reward: 1500 },
    { id: 'crystalDepths', name: 'Crystal Depths', biome: 3, objective: 'Find the ancient crystal', type: 'relic', target: 1, reward: 1800 },
    { id: 'skyRuins', name: 'Sky Ruins', biome: 5, objective: 'Cross the floating ruins', type: 'distance', target: 1100, reward: 2200 },
    { id: 'guardianLair', name: "The Guardian's Lair", biome: 6, objective: 'Survive the ultimate chase', type: 'boss', target: 1, reward: 3000 },
  ]);
  let THREE;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (selectors, root = document) => root.querySelector(selectors);
  const randomSeed = () => (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;

  class Random {
    constructor(seed) { this.seed = seed >>> 0; }
    next() {
      let t = this.seed += 0x6d2b79f5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
    range(a, b) { return lerp(a, b, this.next()); }
    int(n) { return Math.floor(this.next() * n); }
    pick(list) { return list[this.int(list.length)]; }
  }

  class SaveManager {
    constructor() {
      this.key = 'ember-temple.runner.v2';
      this.data = {
        version: 2, best: 0, bestDistance: 0, totalCoins: 0, runs: 0, history: [], muted: false,
        coins: 0, gems: 0, relics: 0, xp: 0, playerLevel: 1,
        selectedCharacter: 'explorer', unlockedCharacters: ['explorer'], unlockedBiomes: [0, 1],
        upgrades: Object.fromEntries(Object.keys(UPGRADE_INFO).map(key => [key, 0])),
        cosmetics: { outfit: 'jungle', head: 'traveler', backpack: 'satchel', scarf: 'ember', boots: 'leather', accessory: 'compass', trail: 'embers' },
        unlockedCosmetics: ['jungle', 'traveler', 'satchel', 'ember', 'leather', 'compass', 'embers'],
        missions: Object.fromEntries(MISSION_DEFS.map(mission => [mission.id, { progress: 0, claimed: false }])),
        achievements: Object.fromEntries(ACHIEVEMENT_DEFS.map(achievement => [achievement.id, { progress: 0, unlocked: false }])),
        visitedBiomes: [0], adventureLevel: 0, adventureCompleted: [],
        daily: { date: '', id: '', progress: 0, claimed: false, streak: 0, lastReward: '' },
        seenIntro: false,
        settings: {
          music: true, sfx: true, musicVolume: 60, sfxVolume: 80,
          graphics: 'high', cameraShake: true, touchControls: 'auto', highContrast: false, largeUI: false,
        },
      };
      try {
        const stored = JSON.parse(localStorage.getItem(this.key) || localStorage.getItem('ember-temple.runner.v1') || 'null');
        if (stored && typeof stored === 'object') {
          for (const key of ['best', 'bestDistance', 'totalCoins', 'runs']) {
            if (Number.isFinite(stored[key]) && stored[key] >= 0) this.data[key] = stored[key];
          }
          for (const key of ['coins', 'gems', 'relics', 'xp', 'playerLevel']) if (Number.isFinite(stored[key]) && stored[key] >= 0) this.data[key] = stored[key];
          if (Array.isArray(stored.history)) this.data.history = stored.history.filter(item => item && Number.isFinite(item.score)).slice(-10);
          if (typeof stored.seenIntro === 'boolean') this.data.seenIntro = stored.seenIntro;
          if (typeof stored.selectedCharacter === 'string' && CHARACTERS[stored.selectedCharacter]) this.data.selectedCharacter = stored.selectedCharacter;
          for (const key of ['unlockedCharacters', 'unlockedBiomes', 'unlockedCosmetics', 'adventureCompleted', 'visitedBiomes']) if (Array.isArray(stored[key])) this.data[key] = [...new Set(stored[key])];
          if (stored.upgrades && typeof stored.upgrades === 'object') for (const key of Object.keys(UPGRADE_INFO)) this.data.upgrades[key] = clamp(Number(stored.upgrades[key]) || 0, 0, UPGRADE_INFO[key].cap);
          if (stored.cosmetics && typeof stored.cosmetics === 'object') Object.assign(this.data.cosmetics, stored.cosmetics);
          if (stored.missions && typeof stored.missions === 'object') for (const mission of MISSION_DEFS) if (stored.missions[mission.id]) this.data.missions[mission.id] = { progress: Math.max(0, Number(stored.missions[mission.id].progress) || 0), claimed: stored.missions[mission.id].claimed === true };
          if (stored.achievements && typeof stored.achievements === 'object') for (const achievement of ACHIEVEMENT_DEFS) if (stored.achievements[achievement.id]) this.data.achievements[achievement.id] = { progress: Math.max(0, Number(stored.achievements[achievement.id].progress) || 0), unlocked: stored.achievements[achievement.id].unlocked === true };
          if (stored.daily && typeof stored.daily === 'object') Object.assign(this.data.daily, stored.daily);
          if (Number.isFinite(stored.adventureLevel)) this.data.adventureLevel = clamp(Math.floor(stored.adventureLevel), 0, ADVENTURE_LEVELS.length - 1);
          this.data.muted = stored.muted === true;
          if (stored.settings && typeof stored.settings === 'object') {
            const settings = stored.settings;
            if (typeof settings.music === 'boolean') this.data.settings.music = settings.music;
            if (typeof settings.sfx === 'boolean') this.data.settings.sfx = settings.sfx;
            for (const key of ['musicVolume', 'sfxVolume']) {
              if (Number.isFinite(settings[key])) this.data.settings[key] = clamp(settings[key], 0, 100);
            }
            if (['low', 'medium', 'high'].includes(settings.graphics)) this.data.settings.graphics = settings.graphics;
            if (typeof settings.cameraShake === 'boolean') this.data.settings.cameraShake = settings.cameraShake;
            if (['auto', 'on', 'off'].includes(settings.touchControls)) this.data.settings.touchControls = settings.touchControls;
            if (typeof settings.highContrast === 'boolean') this.data.settings.highContrast = settings.highContrast;
            if (typeof settings.largeUI === 'boolean') this.data.settings.largeUI = settings.largeUI;
          }
        }
      } catch (_) { /* Private browsing and corrupt saves are safe to ignore. */ }
      this.data.playerLevel = Math.max(1, Math.floor(this.data.playerLevel) || 1);
      for (const key of ['coins', 'gems', 'relics', 'xp', 'best', 'bestDistance', 'totalCoins', 'runs']) this.data[key] = Math.max(0, Math.floor(Number(this.data[key])) || 0);
      this.data.unlockedCharacters = this.data.unlockedCharacters.filter(id => typeof id === 'string' && CHARACTERS[id]);
      this.data.unlockedBiomes = this.data.unlockedBiomes.filter(id => Number.isInteger(id) && id >= 0 && id < BIOMES.length);
      this.data.visitedBiomes = this.data.visitedBiomes.filter(id => Number.isInteger(id) && id >= 0 && id < BIOMES.length);
      for (const [slot, options] of Object.entries(COSMETIC_STYLES)) if (!options.some(option => option.id === this.data.cosmetics[slot])) this.data.cosmetics[slot] = options[0].id;
      if (!this.data.unlockedCharacters.includes(this.data.selectedCharacter)) this.data.selectedCharacter = 'explorer';
      this.data.daily.progress = Math.max(0, Math.floor(Number(this.data.daily.progress)) || 0);
      this.data.daily.target = Math.max(1, Math.floor(Number(this.data.daily.target)) || 1);
      this.data.daily.reward = Math.max(0, Math.floor(Number(this.data.daily.reward)) || 0);
      this.data.daily.streak = Math.max(0, Math.floor(Number(this.data.daily.streak)) || 0);
      this.data.daily.claimed = this.data.daily.claimed === true;
      if (typeof this.data.daily.date !== 'string') this.data.daily.date = '';
      this.prepareDaily();
      if (!this.data.unlockedCharacters.includes('explorer')) this.data.unlockedCharacters.unshift('explorer');
      if (!this.data.unlockedBiomes.includes(0)) this.data.unlockedBiomes.unshift(0);
      if (!this.data.visitedBiomes.includes(0)) this.data.visitedBiomes.unshift(0);
    }
    write() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (_) {} }
    finish(game) {
      const record = Math.floor(game.score) > this.data.best;
      this.data.best = Math.max(this.data.best, Math.floor(game.score));
      this.data.bestDistance = Math.max(this.data.bestDistance, Math.floor(game.runDistance ? game.runDistance() : game.distance));
      this.data.totalCoins += game.coins;
      this.data.coins += game.coins;
      this.data.gems += game.gems || 0;
      this.data.relics += game.relics || 0;
      this.data.runs++;
      this.data.history.push({ score: Math.floor(game.score), distance: Math.floor(game.runDistance ? game.runDistance() : game.distance), date: new Date().toISOString() });
      this.data.history = this.data.history.slice(-10);
      this.awardXP(Math.floor((game.runDistance ? game.runDistance() : game.distance) / 4) + game.coins * 2);
      this.write();
      return record;
    }
    prepareDaily() {
      const now = new Date();
      const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const dailyDefs = [
        { id: 'dailyCoins', label: 'Collect 250 treasures without using a power-up.', type: 'coins', target: 250, reward: 500 },
        { id: 'dailyDistance', label: 'Run 2,000 meters.', type: 'distance', target: 2000, reward: 500 },
        { id: 'dailyNear', label: 'Perform 15 near misses.', type: 'near', target: 15, reward: 500 },
        { id: 'dailyVolcano', label: 'Survive a volcanic section.', type: 'volcano', target: 1, reward: 650 },
      ];
      if (this.data.daily.date !== date) {
        const daySeed = date.split('-').join('').split('').reduce((sum, digit) => sum + Number(digit), 0);
        const challenge = dailyDefs[daySeed % dailyDefs.length];
        const previous = this.data.daily.date ? new Date(`${this.data.daily.date}T00:00:00`) : null;
        const wasYesterday = previous && Number.isFinite(previous.getTime()) && (Date.now() - previous.getTime()) < 172800000;
        this.data.daily = { date, id: challenge.id, label: challenge.label, type: challenge.type, target: challenge.target, reward: challenge.reward, progress: 0, claimed: false, streak: wasYesterday ? (this.data.daily.streak || 0) + 1 : 1, lastReward: '' };
        this.write();
      } else {
        const challenge = dailyDefs.find(item => item.id === this.data.daily.id) || dailyDefs[Number(date.replaceAll('-', '')) % dailyDefs.length];
        Object.assign(this.data.daily, { id: challenge.id, label: challenge.label, type: challenge.type, target: challenge.target, reward: challenge.reward });
      }
    }
    awardXP(amount) {
      this.data.xp += Math.max(0, Math.floor(amount));
      while (this.data.xp >= this.data.playerLevel * 1000) {
        this.data.xp -= this.data.playerLevel * 1000;
        this.data.playerLevel++;
      }
    }
    spendCoins(amount) {
      if (this.data.coins < amount) return false;
      this.data.coins -= amount; this.write(); return true;
    }
  }

  // Existing pages can provide any of these IDs, or use data-stat/data-screen.
  // Missing essential controls are supplied in a scoped, runtime-only overlay.
  class UI {
    constructor(save) {
      this.save = save;
      this.nodes = Object.create(null);
      this.lastValues = Object.create(null);
      this.toastTime = 0;
      this.hudClock = 0;
      this.host = $('#game-container, #gameContainer, #game-root, #app') || document.body;
      this.canvas = $('#game-canvas, #gameCanvas, #scene-canvas, canvas[data-game], #canvas');
      this.ownsCanvas = !this.canvas;
      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'game-canvas';
        Object.assign(this.canvas.style, { position: 'fixed', inset: '0', width: '100%', height: '100%', display: 'block' });
        this.host.prepend(this.canvas);
      }
      this.canvas.setAttribute('aria-label', 'Ruins of the Ember Temple game. Use arrows or WASD, Space to jump, and Down to slide.');
      this.canvas.style.touchAction = 'none';
      this.createFallback();
      const aliases = {
        menu: '#menu-screen, #menuScreen, #start-screen, #startScreen, #main-menu, [data-screen="menu"]',
        pause: '#pause-screen, #pauseScreen, #pause-menu, #pauseMenu, #pause-overlay, [data-screen="pause"]',
        over: '#game-over-screen, #gameOverScreen, #gameover-screen, #gameOver, #game-over-overlay, [data-screen="gameover"]',
        hud: '#hud, #game-hud, #gameHUD, [data-game-hud]',
        countdown: '#countdown, #countdown-overlay, #countdownOverlay, [data-countdown]',
        countdownValue: '#countdown-value, #countdownValue, [data-countdown-value]',
        score: '#score, #score-value, #scoreValue, [data-stat="score"]',
        distance: '#distance, #distance-value, #distanceValue, [data-stat="distance"]',
        coins: '#coins, #coin-count, #coinCount, [data-stat="coins"]',
         best: '#best-score, #bestScore, #high-score, #highScore, [data-stat="best"]',
         bestDistance: '#best-distance, #bestDistance, [data-stat="best-distance"]',
         wallet: '#wallet-coins, [data-wallet-coins]',
         level: '#player-level, [data-player-level]',
        combo: '#combo, #combo-value, #comboValue, [data-stat="combo"]',
        multiplier: '#multiplier, #score-multiplier, #scoreMultiplier, [data-stat="multiplier"]',
        powers: '#powerups, #power-up-indicators, #powerupBar, #powerup-indicator, [data-powerups], [data-power-up-indicators]',
        finalScore: '#final-score, #finalScore, [data-stat="final-score"]',
        finalDistance: '#final-distance, #finalDistance, [data-stat="final-distance"]',
        finalCoins: '#final-coins, #finalCoins, [data-stat="final-coins"]',
        finalBest: '#final-best-score, #finalBestScore, [data-stat="final-best"]',
        finalMultiplier: '#final-multiplier, #finalMultiplier, [data-stat="final-multiplier"]',
        pauseDistance: '#pause-distance, #pauseDistance, [data-stat="pause-distance"]',
        reason: '#game-over-reason, #gameOverReason, #game-over-description, [data-gameover-reason]',
        record: '#new-record, #newRecord, #new-best-badge, [data-new-record]',
        toast: '#toast, #game-toast, #game-notification, [data-game-toast]',
        toastText: '#notification-text, #toast-text, [data-game-toast-text]',
         guardian: '#guardian-warning, #guardianWarning, [data-guardian-warning]',
         guardianFill: '#guardian-meter-fill, [data-guardian-fill]',
         biome: '#hud-biome, [data-hud-biome]',
         objective: '#hud-objective, [data-hud-objective]',
         event: '#world-event, [data-world-event]',
         boss: '#boss-hud, [data-boss-hud]',
         bossName: '#boss-name, [data-boss-name]',
         bossProgress: '#boss-progress, [data-boss-progress]',
         loading: '#loading, #loading-screen, [data-loading]',
         help: '#how-to-play-modal, #help-modal, [data-modal="help"]',
         settings: '#settings-modal, #settings, [data-modal="settings"]',
         welcome: '#welcome-modal, [data-modal="welcome"]',
         progression: '#progression-modal, [data-modal="progression"]',
         progressionTitle: '#progression-title, [data-progression-title]',
         progressionContent: '#progression-content, [data-progression-content]',
      };
      for (const [name, selector] of Object.entries(aliases)) this.nodes[name] = $(selector);
      this.powerNodes = Object.create(null);
      if (this.nodes.powers) {
        const powerSelectors = {
          magnet: '#magnet-indicator, [data-power="magnet"], [data-powerup="magnet"]',
          shield: '#shield-indicator, [data-power="shield"], [data-powerup="shield"]',
          speed: '#boost-indicator, [data-power="speed"], [data-powerup="speed"], [data-powerup="boost"]',
          multiplier: '#multiplier-indicator, [data-power="multiplier"], [data-powerup="multiplier"]',
          burst: '#burst-indicator, [data-power="burst"], [data-powerup="burst"]',
        };
        for (const type of POWER_TYPES) {
           let node = powerSelectors[type] ? $(powerSelectors[type], this.nodes.powers) : null;
          if (!node) {
            node = document.createElement('span');
            node.dataset.power = type;
            node.className = 'ember-power';
            this.nodes.powers.append(node);
          }
          this.powerNodes[type] = node;
          node.hidden = true;
        }
      }
      this.text('best', save.data.best.toLocaleString());
      this.text('bestDistance', Math.floor(save.data.bestDistance).toLocaleString());
      this.text('wallet', save.data.coins.toLocaleString());
      this.text('level', String(save.data.playerLevel));
      this.show('loading', false);
      this.state(STATES.MENU);
      this.updateMute(save.data.muted);
      if (!save.data.seenIntro) this.modal('welcome', true);
    }
    createFallback() {
      const style = document.createElement('style');
      style.textContent = `
        #ember-fallback-ui{position:fixed;inset:0;z-index:20;pointer-events:none;font-family:ui-sans-serif,system-ui,sans-serif;color:#fff4d9;overflow:hidden}
        #ember-fallback-ui *{box-sizing:border-box}#ember-fallback-ui [hidden]{display:none!important}
        #ember-fallback-ui .ember-panel{pointer-events:auto;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(500px,90vw);max-height:94vh;overflow:auto;text-align:center;padding:35px 32px;border:1px solid #b17b454f;border-radius:20px;background:linear-gradient(145deg,#122726f2,#0d151df5);box-shadow:0 25px 100px #0007;backdrop-filter:blur(15px)}
        #ember-fallback-ui .ember-eyebrow{font-size:10px;letter-spacing:.3em;color:#f7bb6b;font-weight:700;margin:0 0 13px}
        #ember-fallback-ui h1{font-family:Georgia,serif;font-size:clamp(32px,6vw,51px);line-height:1.02;letter-spacing:-.035em;margin:0 0 17px;color:#fff1cf;text-shadow:0 2px 28px #e6853b44}
        #ember-fallback-ui h2{font-family:Georgia,serif;font-size:33px;margin:0 0 15px}
        #ember-fallback-ui p{color:#b7c9c2;line-height:1.6;font-size:14px;margin:13px 0}
        #ember-fallback-ui button{cursor:pointer;pointer-events:auto;border:1px solid #f8c87755;border-radius:9px;background:#243c3b;color:#fff0d1;padding:12px 19px;font:700 12px ui-sans-serif,system-ui;letter-spacing:.08em;touch-action:manipulation}
        #ember-fallback-ui button:hover{filter:brightness(1.18)}#ember-fallback-ui button:focus-visible{outline:2px solid #6be1d5;outline-offset:4px}
        #ember-fallback-ui .ember-primary{background:linear-gradient(110deg,#d48b3f,#ffcc79);color:#27190f;border:0;min-width:210px;margin:10px 0}
        #ember-fallback-ui .ember-controls{font-size:11px;line-height:1.9;border-top:1px solid #c4e1c21c;margin-top:19px;padding-top:15px;color:#afc3b9}
        #ember-fallback-ui .ember-stats{display:flex;justify-content:center;gap:24px;margin:22px 0;color:#b8cfc5;font-size:11px;letter-spacing:.1em}
        #ember-fallback-ui .ember-stats strong{display:block;font-size:27px;color:#ffe2aa;letter-spacing:0;margin:3px}
        #ember-fallback-ui .ember-hud{position:absolute;left:max(22px,env(safe-area-inset-left));top:max(20px,env(safe-area-inset-top));display:flex;gap:27px;padding:14px 19px;border:1px solid #e2d5a520;border-radius:12px;background:#0d242bc9;backdrop-filter:blur(8px)}
        #ember-fallback-ui .ember-hud small{display:block;font-size:9px;letter-spacing:.2em;color:#a9c6bc}#ember-fallback-ui .ember-hud strong{display:block;font-size:23px;color:#fff2d2;font-variant-numeric:tabular-nums}
        #ember-fallback-ui .ember-corner{position:absolute;right:max(20px,env(safe-area-inset-right));top:max(22px,env(safe-area-inset-top));display:flex;gap:8px;pointer-events:auto}
        #ember-fallback-ui .ember-bottom{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);text-align:center;width:90%;font-size:11px;letter-spacing:.2em;color:#cfdfc8}
        #ember-fallback-ui .ember-toast{position:absolute;left:50%;top:24%;transform:translateX(-50%);font-size:13px;color:#ffd587;letter-spacing:.12em;text-align:center;padding:9px 16px;border-radius:20px;background:#152f30b3}
        #ember-fallback-ui #countdown{position:absolute;inset:0;display:grid;place-items:center;font:bold 100px Georgia,serif;text-shadow:0 0 50px #ffb25a}
        #ember-fallback-ui .ember-power{display:inline-block;background:#11252bd9;border:1px solid #eab5705c;border-radius:18px;padding:7px 12px;margin:3px;font-size:10px;letter-spacing:.08em}
        #ember-fallback-ui .ember-mobile{position:absolute;left:50%;bottom:max(18px,env(safe-area-inset-bottom));transform:translateX(-50%);display:none;gap:10px;pointer-events:auto}
        #ember-fallback-ui .ember-mobile button{width:58px;height:52px;background:#183333d9;font-size:22px;padding:0}
        @media(pointer:coarse){#ember-fallback-ui .ember-mobile{display:flex}#ember-fallback-ui .ember-bottom{bottom:90px}#ember-fallback-ui .ember-panel{padding:25px 22px}}
        @media(max-width:580px){#ember-fallback-ui .ember-hud{left:10px;top:10px;gap:12px;padding:10px 12px}#ember-fallback-ui .ember-hud strong{font-size:19px}#ember-fallback-ui .ember-corner{right:10px;top:10px}#ember-fallback-ui .ember-corner button{padding:12px;font-size:10px}}
      `;
      document.head.append(style);
      this.root = document.createElement('div');
      this.root.id = 'ember-fallback-ui';
      const add = html => this.root.insertAdjacentHTML('beforeend', html);
      const structuredPage = Boolean($('#game-container') && $('#game-canvas') && $('#main-menu') && $('#hud'));
      if (!$('#menu-screen, #menuScreen, #start-screen, #startScreen, #main-menu, [data-screen="menu"]')) add(`
        <section id="menu-screen" class="ember-panel" aria-label="Main menu">
          <div class="ember-eyebrow">A LOST KINGDOM. ONE LAST SPARK.</div>
          <h1>Ruins of the<br>Ember Temple</h1>
          <p>You stole the temple's living ember.<br>Now its ancient guardian wants it back.</p>
          <button class="ember-primary" data-action="start">ENTER THE RUINS</button>
          <p>Best expedition · <strong id="best-score">0</strong></p>
          <div class="ember-controls">← → / A D · change lane &nbsp; ↑ / Space · jump<br>↓ / S · slide &nbsp; P / Esc · pause<br>Touch: swipe to move, jump or slide. Tap to jump.<br>Follow the gold. Watch the shadows. Keep the ember alive.</div>
        </section>`);
      if (!$('#pause-screen, #pauseScreen, #pause-menu, #pauseMenu, #pause-overlay, [data-screen="pause"]')) add(`
        <section id="pause-screen" class="ember-panel" hidden aria-label="Paused">
          <div class="ember-eyebrow">THE EMBER STILL BURNS</div><h2>Take a breath.</h2>
          <p>Your expedition is paused.</p><button class="ember-primary" data-action="resume">CONTINUE</button><br>
          <button data-action="restart">RESTART</button> <button data-action="menu">MAIN MENU</button>
        </section>`);
      if (!$('#game-over-screen, #gameOverScreen, #gameover-screen, #gameOver, #game-over-overlay, [data-screen="gameover"]')) add(`
        <section id="game-over-screen" class="ember-panel" hidden aria-label="Expedition results">
          <div class="ember-eyebrow">THE TEMPLE REMEMBERS</div><h2>Expedition ended</h2>
          <p id="game-over-reason"></p><p id="new-record" hidden>✦ A new temple record ✦</p>
          <div class="ember-stats"><span>SCORE<strong id="final-score">0</strong></span><span>METERS<strong id="final-distance">0</strong></span><span>COINS<strong id="final-coins">0</strong></span></div>
          <button class="ember-primary" data-action="restart">RUN AGAIN</button><br><button data-action="menu">MAIN MENU</button>
        </section>`);
      if (!$('#hud, #game-hud, #gameHUD, [data-game-hud]')) add(`
        <div id="hud" class="ember-hud" hidden><div><small>SCORE</small><strong id="score">0</strong></div><div><small>DISTANCE</small><strong id="distance">0m</strong></div><div><small>COINS</small><strong id="coins">0</strong></div><div><small>CHAIN</small><strong id="combo">—</strong></div></div>`);
      if (!$('#countdown, #countdown-overlay, #countdownOverlay, [data-countdown]')) add('<div id="countdown" hidden role="status" aria-live="polite"></div>');
      if (!$('#toast, #game-toast, #game-notification, [data-game-toast]')) add('<div id="toast" class="ember-toast" role="status" aria-live="polite" hidden></div>');
      if (!$('#powerups, #power-up-indicators, #powerupBar, #powerup-indicator, [data-powerups], [data-power-up-indicators]')) add('<div class="ember-bottom"><div id="powerups"></div><div id="guardian-warning" hidden></div></div>');
      if (!structuredPage) {
        add('<div class="ember-corner"><button data-action="mute" aria-label="Toggle sound">SOUND ON</button><button data-action="pause" aria-label="Pause expedition">Ⅱ</button></div>');
        if (!$('[data-action="left"], #left-button')) add('<div class="ember-mobile"><button data-action="left" aria-label="Move left">←</button><button data-action="slide" aria-label="Slide">↓</button><button data-action="jump" aria-label="Jump">↑</button><button data-action="right" aria-label="Move right">→</button></div>');
      }
      if (this.root.childElementCount) document.body.append(this.root);
    }
    text(name, value) {
      if (this.nodes[name] && this.lastValues[name] !== value) {
        this.nodes[name].textContent = value;
        this.lastValues[name] = value;
      }
    }
    show(name, visible) {
      const node = this.nodes[name];
      if (!node) return;
      node.hidden = !visible;
      node.setAttribute('aria-hidden', String(!visible));
      if (visible) {
        node.style.removeProperty('display');
        if (getComputedStyle(node).display === 'none') node.style.display = name === 'countdown' ? 'grid' : 'block';
      } else node.style.display = 'none';
    }
    state(state) {
      this.show('menu', state === STATES.MENU);
      this.show('pause', state === STATES.PAUSED);
      this.show('over', state === STATES.OVER);
      this.show('hud', state !== STATES.MENU && state !== STATES.OVER);
      this.show('countdown', state === STATES.COUNTDOWN);
      this.show('help', false);
      this.show('settings', false);
      this.show('progression', false);
      if (state !== STATES.MENU) this.show('welcome', false);
      if (state === STATES.MENU || state === STATES.OVER) { this.show('event', false); this.show('boss', false); }
      if (state === STATES.MENU || state === STATES.OVER) this.show('toast', false);
      document.body.dataset.gameState = state;
      if (this.host && this.host.dataset) {
        this.host.dataset.state = state;
        this.host.dataset.gameState = state;
      }
      for (const button of document.querySelectorAll('[data-action="pause"]')) button.hidden = state === STATES.MENU || state === STATES.OVER;
      const panel = state === STATES.PAUSED ? this.nodes.pause : state === STATES.OVER ? this.nodes.over : state === STATES.MENU ? this.nodes.menu : null;
      if (panel) {
        const button = $('[data-action="start-game"], [data-action="start"], #start-button, button, [tabindex="0"]', panel);
        if (button) button.focus({ preventScroll: true });
      }
    }
    modal(name, visible) {
      const node = this.nodes[name];
      if (!node) return;
      if (visible) {
        if (!this.activeModal()) this.lastFocusBeforeModal = document.activeElement;
        for (const other of ['help', 'settings', 'progression', 'welcome']) if (other !== name) this.show(other, false);
      }
      node.hidden = !visible;
      node.setAttribute('aria-hidden', String(!visible));
      if (visible) {
        node.style.removeProperty('display');
        const focusTarget = $('button, input, select, [tabindex="0"]', node);
        if (focusTarget) focusTarget.focus({ preventScroll: true });
      } else {
        node.style.display = 'none';
        if (!this.activeModal() && this.lastFocusBeforeModal && typeof this.lastFocusBeforeModal.focus === 'function') {
          this.lastFocusBeforeModal.focus({ preventScroll: true });
          this.lastFocusBeforeModal = null;
        }
      }
    }
    openProgression(section, save) {
      this.progressionSection = section || this.progressionSection || 'characters';
      this.renderProgression(save);
      this.modal('progression', true);
    }
    renderProgression(save) {
      const content = this.nodes.progressionContent;
      if (!content) return;
      const data = save.data, section = this.progressionSection || 'characters';
      this.text('progressionTitle', section.charAt(0).toUpperCase() + section.slice(1));
      const tabs = ['characters', 'upgrades', 'collection', 'missions', 'achievements', 'leaderboard'].map(tab => `<button class="progression-tab ${section === tab ? 'is-active' : ''}" data-action="open-${tab}">${tab}</button>`).join('');
      let body = '';
      if (section === 'characters') {
        body = `<div class="progression-grid">${Object.entries(CHARACTERS).map(([id, character]) => {
          const unlocked = data.unlockedCharacters.includes(id), selected = data.selectedCharacter === id;
          return `<article class="character-card ${selected ? 'is-selected' : ''} ${unlocked ? '' : 'is-locked'}"><div class="character-swatch" style="--character-color:#${character.color.toString(16).padStart(6, '0')}"></div><h3>${character.name}</h3><p>${character.subtitle}</p><span class="character-stats">SPEED ${Math.round(character.speed * 100)} · JUMP ${Math.round(character.jump * 100)} · POWER ${Math.round(character.power * 100)}</span>${unlocked ? `<button class="button button-secondary" data-action="select-character" data-character="${id}">${selected ? 'Selected' : 'Select'}</button>` : `<button class="button button-secondary" data-action="unlock-character" data-character="${id}">${character.cost.toLocaleString()} coins</button>`}</article>`;
        }).join('')}</div><div class="cosmetic-panel"><span class="eyebrow">CUSTOMIZE YOUR EXPEDITION</span>${Object.entries(COSMETIC_STYLES).map(([slot, options]) => `<button class="cosmetic-chip" data-action="cycle-cosmetic" data-cosmetic="${slot}">${slot.toUpperCase()} · ${(options.find(option => option.id === data.cosmetics[slot]) || options[0]).label}</button>`).join('')}</div>`;
      } else if (section === 'upgrades') {
        body = `<div class="currency-strip">TREASURE <strong>${data.coins.toLocaleString()}</strong> · LEVEL ${data.playerLevel}</div><div class="upgrade-list">${Object.entries(UPGRADE_INFO).map(([id, info]) => { const level = data.upgrades[id] || 0, cost = Math.floor(info.base * (level + 1) ** 1.18); return `<div class="upgrade-row"><div><h3>${info.label}</h3><p>${info.description}</p></div><span class="upgrade-level">${'◆'.repeat(level)}${'◇'.repeat(info.cap - level)}</span><button class="button button-secondary" data-action="buy-upgrade" data-upgrade="${id}" ${level >= info.cap ? 'disabled' : ''}>${level >= info.cap ? 'MAX' : `${cost.toLocaleString()} coins`}</button></div>`; }).join('')}</div>`;
      } else if (section === 'collection') {
        body = `<div class="collection-summary"><strong>${data.relics}</strong><span>ANCIENT RELICS</span><strong>${data.gems}</strong><span>BLUE GEMS</span></div><div class="collection-grid">${['Mask of Tides', 'Sunstone Tablet', 'Violet Heart', 'Sky Compass', 'Moon Sigil', 'Ember Crown'].map((name, index) => `<div class="artifact-card ${data.relics > index ? 'is-found' : ''}"><span>${data.relics > index ? '✦' : '◇'}</span><strong>${name}</strong><small>${data.relics > index ? 'Recovered' : 'Undiscovered'}</small></div>`).join('')}</div>`;
      } else if (section === 'missions') {
        body = `<div class="mission-list">${MISSION_DEFS.map(mission => { const item = data.missions[mission.id], progress = Math.min(mission.target, item.progress); return `<div class="mission-row"><div><h3>${mission.label}</h3><progress max="${mission.target}" value="${progress}"></progress><small>${progress} / ${mission.target} · Reward ${mission.reward} coins</small></div>${item.claimed ? '<span class="claimed">CLAIMED</span>' : progress >= mission.target ? `<button class="button button-secondary" data-action="claim-mission" data-mission="${mission.id}">Claim</button>` : '<span class="locked-copy">In progress</span>'}</div>`; }).join('')}</div><div class="daily-card"><span class="eyebrow">DAILY CHALLENGE · STREAK ${data.daily.streak || 0}</span><h3>${data.daily.label || 'Loading today’s challenge…'}</h3><progress max="${data.daily.target || 1}" value="${Math.min(data.daily.target || 1, data.daily.progress || 0)}"></progress><p>${data.daily.progress || 0} / ${data.daily.target || 1} · Reward ${data.daily.reward || 0} coins</p>${data.daily.claimed ? '<strong class="claimed">CLAIMED TODAY</strong>' : (data.daily.progress || 0) >= (data.daily.target || 1) ? '<button class="button button-secondary" data-action="claim-daily">Claim daily reward</button>' : ''}</div>`;
      } else if (section === 'leaderboard') {
        const history = [...data.history].sort((a, b) => b.score - a.score);
        body = `<div class="leaderboard-card"><span class="eyebrow">LOCAL BEST · OFFLINE</span><h3>Only your expeditions live here.</h3><div class="local-score"><strong>${data.best.toLocaleString()}</strong><span>BEST SCORE</span></div><div class="leaderboard-list"><div><b>1</b><strong>YOU</strong><span>${data.best.toLocaleString()}</span></div>${history.slice(0, 4).map((run, index) => `<div><b>${index + 2}</b><strong>YOU · RUN ${history.length - index}</strong><span>${run.score.toLocaleString()}</span></div>`).join('')}</div></div>`;
      } else {
        body = `<div class="achievement-list">${ACHIEVEMENT_DEFS.map(achievement => { const item = data.achievements[achievement.id], progress = Math.min(achievement.target, item.progress); return `<div class="achievement-row ${item.unlocked ? 'is-unlocked' : ''}"><span class="achievement-icon">${item.unlocked ? '✦' : '◇'}</span><div><h3>${achievement.label}</h3><p>${achievement.description}</p><progress max="${achievement.target}" value="${progress}"></progress><small>${progress} / ${achievement.target}</small></div></div>`; }).join('')}</div>`;
      }
      content.innerHTML = `<nav class="progression-tabs">${tabs}</nav>${body}`;
    }
    activeModal() { return ['help', 'settings', 'progression', 'welcome'].find(name => this.nodes[name] && !this.nodes[name].hidden) || null; }
    updateMute(muted) {
      for (const node of document.querySelectorAll('[data-action="mute"], [data-action="toggle-mute"], #mute-button, #game-mute-button, #muteButton, #sound-toggle, #soundToggle')) {
        node.setAttribute('aria-pressed', String(muted));
        node.setAttribute('aria-label', muted ? 'Enable sound' : 'Mute sound');
        if (!node.querySelector('svg, img')) node.textContent = muted ? 'SOUND OFF' : 'SOUND ON';
      }
    }
    toast(message, seconds = 2) {
      if (this.nodes.toastText) this.text('toastText', message);
      else this.text('toast', message);
      this.toastTime = seconds; this.show('toast', true);
    }
    update(game, dt) {
      if (this.toastTime > 0) {
        this.toastTime -= dt;
        if (this.toastTime <= 0) this.show('toast', false);
      }
      this.hudClock -= dt;
      if (this.hudClock > 0) return;
      this.hudClock = 0.1;
      this.text('score', Math.floor(game.score).toLocaleString());
       this.text('distance', String(Math.floor(game.runDistance ? game.runDistance() : game.distance)));
      this.text('coins', String(game.coins));
      this.text('combo', game.combo > 1 ? `×${game.combo}` : '—');
       this.text('multiplier', game.scoreMultiplier().toFixed(2).replace(/\.00$/, ''));
       this.text('pauseDistance', String(Math.floor(game.runDistance ? game.runDistance() : game.distance)));
       this.text('wallet', this.save.data.coins.toLocaleString());
       this.text('biome', (BIOMES[game.currentBiome] || BIOMES[0]).name.toUpperCase());
       this.text('objective', game.objectiveText || (game.mode === 'adventure' ? 'FOLLOW THE OBJECTIVE' : 'FOLLOW THE GOLD'));
       if (this.nodes.guardianFill) this.nodes.guardianFill.style.width = `${Math.round(clamp((game.guardian ? game.guardian.threat : 0) * 100, 0, 100))}%`;
      for (const type of POWER_TYPES) {
        const node = this.powerNodes[type];
        if (!node) continue;
        const seconds = Math.ceil(game.powers[type]);
        node.hidden = !seconds || game.state === STATES.MENU || game.state === STATES.OVER;
        if (seconds) {
          const value = `${POWER_INFO[type].icon} ${POWER_INFO[type].label} ${seconds}s`;
          const timer = node.querySelector(`#${type}-timer, #${type === 'speed' ? 'boost' : type}-timer`);
          const progress = node.querySelector('progress');
          if (timer) timer.textContent = `${seconds}s`;
          if (progress) {
            const duration = Math.max(0.1, game.powerDuration ? game.powerDuration(type) : POWER_INFO[type].duration);
            const maxVal = Number(progress.max) || 100;
            progress.value = clamp(game.powers[type] / duration * maxVal, 0, maxVal);
          }
          if (!timer && !node.querySelector('svg, progress')) node.textContent = value;
        }
      }
      this.show('powers', POWER_TYPES.some(type => game.powers[type] > 0) && game.state !== STATES.MENU && game.state !== STATES.OVER);
      const warning = game.guardian && game.guardian.threat > 0.55 && game.state === STATES.RUNNING;
       this.show('guardian', warning);
       if (warning) this.text('guardian', 'THE ASHBOUND IS CLOSE');
       this.show('event', Boolean(game.worldEvent && game.worldEvent.time > 0 && game.state === STATES.RUNNING));
       if (game.worldEvent && game.worldEvent.time > 0) this.text('event', `${game.worldEvent.label} · ${Math.ceil(game.worldEvent.time)}s`);
       this.show('boss', Boolean(game.boss && game.boss.active && game.state === STATES.RUNNING));
       if (game.boss && game.boss.active) {
         this.text('bossName', game.boss.warning > 0 ? `⚠ ${game.boss.name} · ATTACK` : game.boss.name);
         if (this.nodes.bossProgress) this.nodes.bossProgress.value = clamp(game.boss.time / game.boss.duration * 100, 0, 100);
       }
    }
    result(game, record) {
      this.text('finalScore', Math.floor(game.score).toLocaleString());
       this.text('finalDistance', String(Math.floor(game.runDistance ? game.runDistance() : game.distance)));
      this.text('finalCoins', String(game.coins));
      this.text('finalBest', this.save.data.best.toLocaleString());
      this.text('finalMultiplier', game.scoreMultiplier().toFixed(2).replace(/\.00$/, ''));
      this.text('reason', game.deathReason);
      this.text('best', this.save.data.best.toLocaleString());
      this.text('bestDistance', Math.floor(this.save.data.bestDistance).toLocaleString());
      this.show('record', record);
    }
    error(message) {
      this.show('loading', false);
      this.modal('welcome', false); this.modal('progression', false); this.modal('help', false); this.modal('settings', false);
      this.state(STATES.MENU);
      const panel = this.nodes.menu || this.root;
      const notice = document.createElement('p');
      notice.setAttribute('role', 'alert');
      notice.textContent = message;
      panel.append(notice);
      for (const node of document.querySelectorAll('[data-action="start"], [data-action="start-game"], [data-action="start-adventure"], [data-action="start-endless"], #start-button, #startButton')) node.disabled = true;
    }
  }

  class InputManager {
    constructor(canvas, onGesture) {
      this.queue = [];
      this.maxQueue = 18;
      this.pointer = null;
      this.onGesture = onGesture;
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      const keys = {
        ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
        ArrowUp: 'jump', KeyW: 'jump', Space: 'jump', ArrowDown: 'slide', KeyS: 'slide',
        Escape: 'pause', KeyP: 'pause', Enter: 'start', KeyR: 'restart', KeyM: 'mute',
      };
      document.addEventListener('keydown', event => {
        if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
        const action = keys[event.code];
        if (!action || event.ctrlKey || event.metaKey || event.altKey) return;
        // Let keyboard activation of real buttons produce their normal click.
        if ((event.code === 'Space' || event.code === 'Enter') && event.target.closest('button, a')) return;
        event.preventDefault();
        this.onGesture();
        if (!event.repeat) this.push(action, { fromKeyboard: true });
      }, options);
      const idActions = {
        'start-button': 'start', startButton: 'start', playButton: 'start', 'play-button': 'start',
        'restart-button': 'restart', restartButton: 'restart', retryButton: 'restart',
        'pause-button': 'pause', pauseButton: 'pause', 'resume-button': 'resume', resumeButton: 'resume',
        'menu-button': 'menu', menuButton: 'menu', 'mute-button': 'mute', muteButton: 'mute',
        'sound-toggle': 'mute', soundToggle: 'mute', 'left-button': 'left', 'right-button': 'right',
        'jump-button': 'jump', 'slide-button': 'slide',
      };
      document.addEventListener('click', event => {
        const control = event.target.closest('[data-action], button, [role="button"]');
        if (!control) return;
        const action = control.dataset.action || idActions[control.id];
         if (action) { this.onGesture(); this.push(action, { ...control.dataset }); }
      }, options);
      canvas.addEventListener('pointerdown', event => {
        if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
        event.preventDefault();
        this.onGesture();
        this.pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, time: performance.now() };
        try { canvas.setPointerCapture(event.pointerId); } catch (_) {}
      }, options);
      canvas.addEventListener('pointerup', event => {
        const pointer = this.pointer;
        if (!pointer || pointer.id !== event.pointerId) return;
        this.pointer = null;
        const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
        const threshold = Math.max(22, Math.min(innerWidth, innerHeight) * 0.045);
        if (Math.max(Math.abs(dx), Math.abs(dy)) >= threshold) {
          this.push(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'jump' : 'slide'));
        } else if (performance.now() - pointer.time < 450) this.push('jump');
      }, options);
      canvas.addEventListener('pointercancel', () => { this.pointer = null; }, options);
    }
    push(action, meta = null) {
      if (this.queue.length >= this.maxQueue) this.queue.shift();
      this.queue.push({ action, meta, time: performance.now() });
    }
    consume(handler) {
      const now = performance.now();
       while (this.queue.length) {
         const event = this.queue.shift();
         if (now - event.time < 600) handler(event.action, event.meta || {});
      }
    }
    clear() { this.queue.length = 0; this.pointer = null; }
    dispose() { this.controller.abort(); this.clear(); }
  }

  class AudioManager {
    constructor(save) {
      this.save = save;
      this.muted = save.data.muted;
      this.context = null;
      this.unavailable = false;
      this.active = false;
      const settings = save.data.settings || {};
      this.musicEnabled = settings.music !== false;
      this.sfxEnabled = settings.sfx !== false;
      this.musicVolume = clamp(Number.isFinite(settings.musicVolume) ? settings.musicVolume / 100 : 0.6, 0, 1);
      this.sfxVolume = clamp(Number.isFinite(settings.sfxVolume) ? settings.sfxVolume / 100 : 0.8, 0, 1);
      this.beat = 0;
      this.nextBeat = 0;
      this.notes = [0, 7, 12, 10, 7, 3, 5, 7, 0, 3, 7, 12, 10, 7, 5, 3];
    }
    unlock() {
      if (this.unavailable) return;
      try {
        if (!this.context) {
          const Context = window.AudioContext || window.webkitAudioContext;
          if (!Context) { this.unavailable = true; return; }
          this.context = new Context();
          this.master = this.context.createGain();
          this.master.gain.value = this.muted ? 0 : 0.32;
          const compressor = this.context.createDynamicsCompressor();
          this.master.connect(compressor);
          compressor.connect(this.context.destination);
          this.createAmbience();
        }
        if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      } catch (_) { this.unavailable = true; }
    }
    createAmbience() {
      const ctx = this.context;
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const samples = buffer.getChannelData(0);
      let brown = 0;
      for (let i = 0; i < samples.length; i++) {
        brown = (brown + (Math.random() * 2 - 1) * 0.025) / 1.025;
        samples[i] = brown * 3;
      }
      this.ambient = ctx.createGain();
      this.ambient.gain.value = 0;
      this.ambient.connect(this.master);
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      this.ambientFilter = ctx.createBiquadFilter();
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.value = 750;
      noise.connect(this.ambientFilter);
      this.ambientFilter.connect(this.ambient);
      noise.start();
      const drone = ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 55;
      const gain = ctx.createGain();
      gain.gain.value = 0.07;
      drone.connect(gain);
      gain.connect(this.ambient);
      drone.start();
      this.ambientSources = [noise, drone];
    }
    tone(frequency, duration, type = 'sine', volume = 0.2, end = frequency, delay = 0, channel = 'sfx') {
      const ctx = this.context;
      if (!ctx || this.muted || ctx.state !== 'running' || (channel === 'music' && !this.musicEnabled) || (channel === 'sfx' && !this.sfxEnabled)) return;
      try {
        const at = ctx.currentTime + delay;
        const oscillator = ctx.createOscillator(), gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(Math.max(20, frequency), at);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
        gain.gain.setValueAtTime(0.001, at);
        gain.gain.linearRampToValueAtTime(volume * (channel === 'music' ? this.musicVolume : this.sfxVolume), at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
        oscillator.connect(gain);
        gain.connect(this.master);
        oscillator.start(at);
        oscillator.stop(at + duration + 0.02);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      } catch (_) { /* Audio failure must never stop a run. */ }
    }
    sfx(name, combo = 0) {
      if (name === 'coin') this.tone(680 + Math.min(combo, 20) * 22, 0.11, 'sine', 0.2, 1300);
      else if (name === 'jump') this.tone(190, 0.18, 'triangle', 0.2, 420);
      else if (name === 'slide') this.tone(220, 0.15, 'sawtooth', 0.055, 60);
      else if (name === 'near') this.tone(350, 0.22, 'sine', 0.17, 700);
      else if (name === 'hit') { this.tone(95, 0.45, 'sawtooth', 0.24, 25); this.tone(53, 0.6, 'sine', 0.3, 24); }
      else if (name === 'shield') { this.tone(680, 0.32, 'triangle', 0.25, 90); this.tone(1050, 0.4, 'sine', 0.15, 220); }
      else if (name === 'power') {
        for (let i = 0; i < 4; i++) this.tone(440 * 2 ** (i * 3 / 12), 0.3, 'triangle', 0.15, 440 * 2 ** (i * 3 / 12), i * 0.07);
      } else if (name === 'count') this.tone(440, 0.13, 'sine', 0.14);
      else if (name === 'go') this.tone(660, 0.3, 'triangle', 0.22, 990);
    }
    toggle() {
      this.muted = !this.muted;
      this.save.data.muted = this.muted;
      this.save.write();
      this.unlock();
      if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.32, this.context.currentTime, 0.05);
    }
    setSetting(setting, value) {
      if (setting === 'music') {
        this.musicEnabled = Boolean(value);
        this.save.data.settings.music = this.musicEnabled;
      } else if (setting === 'sfx') {
        this.sfxEnabled = Boolean(value);
        this.save.data.settings.sfx = this.sfxEnabled;
      } else if (setting === 'music-volume') {
        this.musicVolume = clamp(Number(value) / 100, 0, 1);
        this.save.data.settings.musicVolume = clamp(Number(value), 0, 100);
      } else if (setting === 'sfx-volume') {
        this.sfxVolume = clamp(Number(value) / 100, 0, 1);
        this.save.data.settings.sfxVolume = clamp(Number(value), 0, 100);
      }
      this.save.write();
    }
    setActive(active) {
      this.active = active;
      if (this.ambient) this.ambient.gain.setTargetAtTime(active ? 0.46 : 0.04, this.context.currentTime, 0.4);
      if (this.context) this.nextBeat = this.context.currentTime + 0.1;
    }
    update(speed, biome) {
      const ctx = this.context;
      if (!ctx || ctx.state !== 'running' || !this.active || this.muted) return;
      if (this.biome !== biome) {
        this.biome = biome;
        const motifs = [[0, 7, 12, 10, 7, 3, 5, 7], [0, 3, 7, 10, 12, 10, 7, 3], [0, 5, 9, 12, 14, 12, 9, 5], [0, 3, 6, 10, 15, 10, 6, 3], [0, 2, 7, 9, 12, 9, 7, 2], [0, 4, 7, 11, 14, 11, 7, 4], [0, 2, 5, 9, 12, 9, 5, 2]];
        this.notes = motifs[biome] || motifs[0];
        this.tone(220 + biome * 18, 0.45, 'sine', 0.04, 330 + biome * 20, 0, 'music');
      }
      const ambience = biome === 2 ? 1300 : biome === 3 || biome === 6 ? 1650 : biome === 4 ? 420 : biome === 1 ? 520 : biome === 5 ? 980 : 850;
       this.ambientFilter.frequency.setTargetAtTime(ambience, ctx.currentTime, 0.5);
      if (this.nextBeat < ctx.currentTime - 0.5) this.nextBeat = ctx.currentTime;
      let budget = 3;
      while (this.nextBeat < ctx.currentTime + 0.12 && budget-- > 0) {
        const delay = Math.max(0, this.nextBeat - ctx.currentTime);
        const note = this.notes[this.beat % this.notes.length];
        this.tone(146.83 * 2 ** (note / 12), 0.28, 'triangle', 0.055, 146.83 * 2 ** (note / 12), delay, 'music');
        if (this.beat % 4 === 0) this.tone(83, 0.16, 'sine', 0.22, 34, delay, 'music');
        if (this.beat % 8 === 4) this.tone(110, 0.09, 'triangle', 0.07, 43, delay, 'music');
        this.beat++;
        this.nextBeat += clamp(0.28 - (speed - 14) * 0.002, 0.21, 0.28);
      }
    }
    dispose() {
      if (this.ambientSources) for (const source of this.ambientSources) { try { source.stop(); } catch (_) {} }
      if (this.context) this.context.close().catch(() => {});
    }
  }

  // All repeating geometry/materials are shared across the recyclable world.
  class Assets {
    constructor() {
      this.detailScale = 1;
      this.geometry = {
        box: new THREE.BoxGeometry(1, 1, 1),
        cylinder: new THREE.CylinderGeometry(1, 1, 1, 8),
        taper: new THREE.CylinderGeometry(0.65, 1, 1, 7),
        cone: new THREE.ConeGeometry(1, 1, 6),
        sphere: new THREE.IcosahedronGeometry(1, 1),
        rock: new THREE.DodecahedronGeometry(1, 0),
        ring: new THREE.TorusGeometry(0.35, 0.09, 5, 12),
        halo: new THREE.TorusGeometry(1, 0.035, 5, 24),
        plane: new THREE.PlaneGeometry(1, 1),
        leaf: new THREE.ConeGeometry(1, 1, 4),
      };
      this.material = {};
      const matte = (name, color, extra = {}) => {
        this.material[name] = new THREE.MeshStandardMaterial({ color, roughness: 0.85, flatShading: true, ...extra });
      };
      // The material library is intentionally varied. Shared materials keep
      // the runner fast, while the palette prevents every prop from reading
      // as the same green procedural primitive.
      matte('stone', 0xc18b5c); matte('darkStone', 0x28323d); matte('sand', 0xd7b477);
      matte('sandstone', 0xd79b5d); matte('sandstoneDark', 0x86533f); matte('jungleStone', 0x4e6870);
      matte('waterStone', 0x769ca0); matte('caveStone', 0x4d4b6d); matte('volcanic', 0x252833);
      matte('sunsetStone', 0xb86664); matte('moonStone', 0x4e5d82);
      matte('terracotta', 0xc46045); matte('trim', 0xd19b58); matte('turquoise', 0x2bd5d0, { emissive: 0x0a8f99, emissiveIntensity: 0.38 });
      matte('violet', 0x9e65d8, { emissive: 0x5c2c9c, emissiveIntensity: 0.6 }); matte('sunsetGold', 0xffc265, { metalness: 0.72, roughness: 0.28, emissive: 0xc9572e, emissiveIntensity: 0.35 });
      matte('moonGold', 0xa4c8da, { metalness: 0.62, roughness: 0.3, emissive: 0x3657a6, emissiveIntensity: 0.4 });
      matte('moss', 0x578a69); matte('jungleBank', 0x1c4d4c); matte('waterBank', 0x255d70); matte('caveBank', 0x242746); matte('sunsetBank', 0x65384f); matte('moonBank', 0x1d2b4d);
      matte('bark', 0x6b4537); matte('barkDark', 0x3b2932); matte('leaf', 0x126d61); matte('leafLight', 0x5ba76c); matte('leafTeal', 0x27a29a); matte('leafLime', 0x9abb52); matte('vine', 0x3c6f56);
      matte('gold', 0xffd34f, { metalness: 0.72, roughness: 0.24, emissive: 0xb75b13, emissiveIntensity: 0.32 });
      matte('lava', 0xff4e2e, { emissive: 0xff270e, emissiveIntensity: 2.1 });
      matte('ember', 0xffb457, { emissive: 0xff7028, emissiveIntensity: 2.5 });
      matte('rune', 0x45e7d3, { emissive: 0x14bfd0, emissiveIntensity: 1.1 });
      matte('runePurple', 0xd45eff, { emissive: 0x7625d8, emissiveIntensity: 1.25 });
      matte('moonCyan', 0x65e9ff, { emissive: 0x1a83d0, emissiveIntensity: 1.35 });
      matte('crystalBlue', 0x3ad9ff, { emissive: 0x087bc9, emissiveIntensity: 1.65, roughness: 0.25 });
      matte('crystalViolet', 0xb466ff, { emissive: 0x6a22d1, emissiveIntensity: 1.55, roughness: 0.25 });
      matte('cloth', 0xd14d8e); matte('leather', 0x563a38); matte('skin', 0xe1a175);
      matte('hat', 0xf0b65a); matte('boot', 0x282b3b); matte('ivory', 0xffead0);
      matte('guardian', 0x263844, { metalness: 0.25 });
      matte('water', 0x25c4df, { metalness: 0.45, roughness: 0.18, transparent: true, opacity: 0.68, emissive: 0x076d9d, emissiveIntensity: 0.34 });
      matte('foam', 0xbaf6ed, { transparent: true, opacity: 0.72, emissive: 0x62d8d8, emissiveIntensity: 0.5 });
      matte('sandPatch', 0xb8754d); matte('jungleDirt', 0x765243); matte('leafLitter', 0x78954e); matte('crystalDust', 0x5b71b5); matte('lavaPatch', 0x6c302e); matte('roseSand', 0xd27f69); matte('moonMoss', 0x496d72);
      matte('flowerPink', 0xff5ebc, { emissive: 0x9c155f, emissiveIntensity: 0.65 }); matte('flowerMagenta', 0xd957ff, { emissive: 0x6d1a9e, emissiveIntensity: 0.7 }); matte('flowerOrange', 0xff864d, { emissive: 0xb52e16, emissiveIntensity: 0.5 }); matte('flowerYellow', 0xffdd59, { emissive: 0xa36d0b, emissiveIntensity: 0.48 }); matte('flowerBlue', 0x52d9ff, { emissive: 0x1c67af, emissiveIntensity: 0.65 });
      matte('cloud', 0xffd8d0, { transparent: true, opacity: 0.13, depthWrite: false });
      matte('mountain', 0x304861); matte('mountainWarm', 0x6d3e50); matte('mountainBlue', 0x263c70);
      matte('shadow', 0x020e12, { transparent: true, opacity: 0.35, depthWrite: false });
      this.material.flame = new THREE.MeshBasicMaterial({ color: 0xffb451, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false });
      this.material.shield = new THREE.MeshBasicMaterial({ color: 0x77c9ff, transparent: true, opacity: 0.14, wireframe: true, depthWrite: false });
      for (const type of POWER_TYPES) matte(type, POWER_INFO[type].color, { emissive: POWER_INFO[type].color, emissiveIntensity: 0.55, metalness: 0.4, roughness: 0.3 });
      this.themeMaterials = BIOMES.map(theme => ({
        floor: this.material[theme.floor], bank: this.material[theme.bank], patch: this.material[theme.patch],
        stone: this.material[theme.stone], dark: theme.bank === 'volcanic' ? this.material.volcanic : this.material.darkStone,
        trim: this.material[theme.trim], accent: this.material[theme.accent],
      }));
    }
    themeMaterial(biome, part) {
      return this.themeMaterials[biome % this.themeMaterials.length][part] || this.material.stone;
    }
    mesh(shape, material, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
      const mesh = new THREE.Mesh(this.geometry[shape], typeof material === 'string' ? this.material[material] : material);
      mesh.position.set(x, y, z);
      mesh.scale.set(sx, sy, sz);
      if (parent) parent.add(mesh);
      return mesh;
    }
    dispose() {
      for (const geometry of Object.values(this.geometry)) geometry.dispose();
      for (const material of Object.values(this.material)) material.dispose();
    }
  }

  class ParticleSystem {
    constructor(scene) {
      const count = CONFIG.particleCount;
      this.count = count;
      this.cursor = 0;
      this.positions = new Float32Array(count * 3);
      this.colors = new Float32Array(count * 3);
      this.velocity = new Float32Array(count * 3);
      this.life = new Float32Array(count);
      this.duration = new Float32Array(count);
      this.gravity = new Float32Array(count);
      this.baseColor = new Float32Array(count * 3);
      this.positions.fill(-999);
      this.geometry = new THREE.BufferGeometry();
      this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
      this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
      this.material = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      this.points = new THREE.Points(this.geometry, this.material);
      this.points.frustumCulled = false;
      scene.add(this.points);
      this.color = new THREE.Color();
      this.qualityScale = 1;
    }
    setQuality(scale) { this.qualityScale = clamp(scale, 0.25, 1); }
    emit(x, y, z, color, amount = 12, force = 3, gravity = 5) {
      this.color.setHex(color);
      for (let n = 0; n < Math.max(1, Math.round(amount * this.qualityScale)); n++) {
        const i = this.cursor++ % this.count, p = i * 3;
        this.positions[p] = x; this.positions[p + 1] = y; this.positions[p + 2] = z;
        this.velocity[p] = (Math.random() - 0.5) * force;
        this.velocity[p + 1] = Math.random() * force;
        this.velocity[p + 2] = (Math.random() - 0.5) * force;
        this.life[i] = this.duration[i] = 0.35 + Math.random() * 0.65;
        this.gravity[i] = gravity;
        this.baseColor[p] = this.color.r; this.baseColor[p + 1] = this.color.g; this.baseColor[p + 2] = this.color.b;
      }
    }
    update(dt, worldDelta) {
      for (let i = 0; i < this.count; i++) {
        if (this.life[i] <= 0) continue;
        const p = i * 3;
        this.life[i] -= dt;
        if (this.life[i] <= 0) { this.positions[p + 1] = -999; continue; }
        this.velocity[p + 1] -= this.gravity[i] * dt;
        this.positions[p] += this.velocity[p] * dt;
        this.positions[p + 1] += this.velocity[p + 1] * dt;
        this.positions[p + 2] += this.velocity[p + 2] * dt + worldDelta;
        const fade = this.life[i] / this.duration[i];
        this.colors[p] = this.baseColor[p] * fade;
        this.colors[p + 1] = this.baseColor[p + 1] * fade;
        this.colors[p + 2] = this.baseColor[p + 2] * fade;
      }
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
    reset() { this.life.fill(0); this.positions.fill(-999); }
    dispose() { this.geometry.dispose(); this.material.dispose(); }
  }

  class Player {
    constructor(scene, assets) {
      this.assets = assets;
      this.group = new THREE.Group();
      this.visual = new THREE.Group();
      this.group.add(this.visual);
      scene.add(this.group);
      this.characterMaterials = [];
      this.bounds = new THREE.Box3();
      this.build();
      this.reset();
    }
    build() {
      const a = this.assets, root = this.visual;
      this.tunic = a.mesh('box', 'cloth', root, 0, 1.2, 0, 0.66, 0.7, 0.4);
      a.mesh('box', 'leather', root, 0, 0.93, 0, 0.69, 0.13, 0.44);
      a.mesh('box', 'gold', root, 0, 0.94, -0.235, 0.15, 0.12, 0.035);
      this.scarf = a.mesh('box', 'leather', root, 0, 1.27, -0.23, 0.11, 0.74, 0.025);
      this.scarf.rotation.z = -0.47;
      a.mesh('box', 'leather', root, 0, 1.19, 0.34, 0.53, 0.57, 0.27);
      a.mesh('box', 'hat', root, 0, 1.47, 0.33, 0.43, 0.12, 0.26);
      a.mesh('sphere', 'skin', root, 0, 1.73, -0.015, 0.26, 0.28, 0.23);
      a.mesh('box', 'skin', root, 0, 1.7, -0.245, 0.08, 0.1, 0.09);
      this.hatBand = a.mesh('cylinder', 'hat', root, 0, 1.94, 0, 0.44, 0.075, 0.4);
      this.hatCrown = a.mesh('taper', 'hat', root, 0, 2.04, 0, 0.27, 0.22, 0.26);
      a.mesh('cylinder', 'leather', root, 0, 1.985, 0, 0.276, 0.055, 0.27);
      this.arms = [];
      this.legs = [];
      for (const sign of [-1, 1]) {
        const arm = new THREE.Group();
        arm.position.set(sign * 0.43, 1.46, 0);
        root.add(arm);
        a.mesh('box', 'cloth', arm, 0, -0.15, 0, 0.22, 0.34, 0.26);
        a.mesh('box', 'skin', arm, 0, -0.43, -0.05, 0.16, 0.3, 0.17);
        this.arms.push(arm);
        const leg = new THREE.Group();
        leg.position.set(sign * 0.18, 0.89, 0);
        root.add(leg);
        a.mesh('box', 'leather', leg, 0, -0.26, 0, 0.24, 0.52, 0.27);
        a.mesh('box', 'boot', leg, 0, -0.66, -0.055, 0.25, 0.35, 0.35);
        this.legs.push(leg);
      }
      this.ember = a.mesh('sphere', 'ember', this.arms[1], 0, -0.5, -0.19, 0.12, 0.15, 0.12);
      this.shield = a.mesh('sphere', 'shield', this.group, 0, 1.05, 0, 1, 1.35, 1);
      this.shadow = a.mesh('plane', 'shadow', this.group, 0, 0.012, 0, 1.2, 1.4, 1);
      this.shadow.rotation.x = -Math.PI / 2;
      this.visual.traverse(node => { if (node.isMesh) node.castShadow = true; });
    }
    applyCharacter(id, cosmetics = {}) {
      const character = CHARACTERS[id] || CHARACTERS.explorer;
      const outfit = COSMETIC_STYLES.outfit.find(style => style.id === cosmetics.outfit);
      const color = outfit && outfit.color ? outfit.color : character.color;
      for (const mesh of [this.tunic, this.hatCrown]) {
        if (!mesh.material.userData.characterMaterial) { mesh.material = mesh.material.clone(); mesh.material.userData.characterMaterial = true; this.characterMaterials.push(mesh.material); }
        mesh.material.color.setHex(color);
        if (mesh.material.emissive) mesh.material.emissive.setHex(color);
      }
      if (!this.hatBand.material.userData.characterMaterial) { this.hatBand.material = this.hatBand.material.clone(); this.hatBand.material.userData.characterMaterial = true; this.characterMaterials.push(this.hatBand.material); }
      this.hatBand.material.color.setHex(color);
      if (!this.scarf.material.userData.characterMaterial) { this.scarf.material = this.scarf.material.clone(); this.scarf.material.userData.characterMaterial = true; this.characterMaterials.push(this.scarf.material); }
      const scarfColors = { ember: 0xff6948, aqua: 0x58e5dc, violet: 0xd957ff };
      this.scarf.material.color.setHex(scarfColors[cosmetics.scarf] || scarfColors.ember);
      const headColors = { traveler: 0xf0b65a, 'sun-crown': 0xffd15b, 'moon-hood': 0x718cff };
      this.hatCrown.material.color.setHex(headColors[cosmetics.head] || headColors.traveler);
      this.trailColor = (COSMETIC_STYLES.trail.find(style => style.id === cosmetics.trail) || COSMETIC_STYLES.trail[0]).color;
    }
    reset() {
      this.lane = 1; this.x = 0; this.y = 0; this.vy = 0;
      this.slideTime = 0; this.phase = 0; this.grounded = true; this.jumpCount = 0;
      this.invulnerable = 0; this.jumpBuffer = 0; this.coyote = 0.08;
      this.dead = false; this.deathTime = 0; this.group.visible = true;
      this.group.position.set(0, 0, 0); this.visual.rotation.set(0, 0, 0);
      this.visual.position.set(0, 0, 0);
      this.updateBounds();
    }
    move(direction) { this.lane = clamp(this.lane + direction, 0, 2); }
    jump() { this.jumpBuffer = 0.15; }
    slide() {
      if (this.y > 0.15) this.vy = Math.min(this.vy, -12);
      this.slideTime = CONFIG.slideDuration;
      this.jumpBuffer = 0;
    }
    update(dt, game) {
      this.x = damp(this.x, CONFIG.lanes[this.lane], 17, dt);
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.slideTime = Math.max(0, this.slideTime - dt);
      this.jumpBuffer = Math.max(0, this.jumpBuffer - dt);
      const hasGround = game.powers.burst > 0 || game.track.hasGround(this.x, game.distance);
      if (this.grounded && hasGround) this.coyote = 0.075;
      else this.coyote = Math.max(0, this.coyote - dt);
      const canDoubleJump = game.powers.doubleJump > 0 && this.jumpCount === 1 && !this.grounded;
      if (this.jumpBuffer > 0 && (this.coyote > 0 || canDoubleJump)) {
        this.vy = game.jumpVelocity(); this.grounded = false;
        this.jumpCount = canDoubleJump ? 2 : 1;
        this.slideTime = 0; this.jumpBuffer = 0; this.coyote = 0;
        game.audio.sfx('jump');
        game.particles.emit(this.x, this.y + 0.1, 0.2, canDoubleJump ? 0x8ee8ff : 0xb6c2a0, canDoubleJump ? 13 : 7, 2, 7);
      }
      if (!hasGround || !this.grounded) {
        this.vy -= CONFIG.gravity * dt;
        this.y += this.vy * dt;
      }
      if (hasGround && this.y <= 0 && this.vy <= 0) {
        if (!this.grounded && this.vy < -4) game.particles.emit(this.x, 0.05, 0, 0xa3b99c, 6, 2, 8);
        this.y = 0; this.vy = 0; this.grounded = true; this.jumpCount = 0;
      } else if (!hasGround) this.grounded = false;
      if (game.powers.burst > 0 && this.y < 0) { this.y = 0; this.vy = 0; this.grounded = true; this.jumpCount = 0; }
      this.phase += dt * game.speed * 0.72;
      this.animate(dt, game);
      this.updateBounds();
      if (this.y < -3.3) game.die('The broken causeway claimed your ember.');
    }
    animate(dt, game) {
      const sliding = this.slideTime > 0 && this.y < 0.4;
      const running = !this.dead && game.state === STATES.RUNNING;
      const stride = running && this.grounded && !sliding ? Math.sin(this.phase) : 0;
      const lean = sliding ? -1.23 : this.dead ? -1.1 : 0.08;
      this.visual.rotation.x = damp(this.visual.rotation.x, lean, 20, dt);
      this.visual.rotation.z = damp(this.visual.rotation.z, this.dead ? 0.7 : (CONFIG.lanes[this.lane] - this.x) * 0.055, 10, dt);
      this.visual.position.y = sliding ? 0.015 : Math.abs(stride) * 0.035;
      for (let i = 0; i < 2; i++) {
        const sign = i === 0 ? 1 : -1;
        this.legs[i].rotation.x = sliding ? -0.6 : !this.grounded ? -0.45 : stride * sign * 0.65;
        this.arms[i].rotation.x = sliding ? -1.5 : !this.grounded ? -1.6 : -stride * sign * 0.65 - 0.12;
      }
      this.group.position.set(this.x, this.y, 0);
      this.shadow.position.y = 0.014 - this.y;
      this.shadow.visible = this.y > -0.1;
      this.shadow.scale.setScalar(clamp(1 - this.y * 0.12, 0.3, 1));
      this.shield.visible = game.powers.shield > 0;
      this.shield.rotation.y += dt;
      this.visual.visible = this.invulnerable <= 0 || Math.floor(game.time * 15) % 2 === 0;
      this.visual.scale.setScalar(game.powers.ghost > 0 ? 1.04 + Math.sin(game.time * 8) * 0.025 : 1);
    }
    updateBounds() {
      const height = this.slideTime > 0 && this.y < 0.4 ? 0.72 : 1.82;
      this.bounds.min.set(this.x - 0.36, this.y + 0.08, -0.32);
      this.bounds.max.set(this.x + 0.36, this.y + height, 0.32);
    }
    updateDeath(dt, game) {
      this.dead = true;
      this.deathTime += dt;
      if (this.y < 0 || !this.grounded) { this.vy -= CONFIG.gravity * dt; this.y += this.vy * dt; }
      this.animate(dt, game);
    }
    dispose(scene) {
      scene.remove(this.group);
      for (const material of this.characterMaterials) material.dispose();
    }
  }

  class Obstacle {
    constructor(type, lane, distance, segment, assets, random, biome = 0) {
      this.type = type; this.lane = lane; this.x = CONFIG.lanes[lane];
      this.distance = distance; this.segment = segment;
      this.hit = false; this.passed = false; this.nearChecked = false;
      this.phase = random.range(0, Math.PI * 2);
      this.bounds = new THREE.Box3();
      this.group = new THREE.Group();
      this.group.position.set(this.x, 0, segment.start - distance);
      segment.group.add(this.group);
      this.width = 2.12; this.depth = 1.6; this.bottom = 0; this.top = 1.05;
      const a = assets, g = this.group;
      const stone = a.themeMaterial(biome, 'stone');
      const dark = a.themeMaterial(biome, 'dark');
      const trim = a.themeMaterial(biome, 'trim');
      const accent = a.themeMaterial(biome, 'accent');
      if (type === 'jump') {
        a.mesh('box', stone, g, 0, 0.47, 0, 2.1, 0.94, 1.25);
        a.mesh('box', trim, g, 0, 0.99, 0, 2.2, 0.13, 1.35);
        a.mesh('box', accent, g, 0, 0.5, 0.65, 0.46, 0.13, 0.035);
      } else if (type === 'slide') {
        this.width = 2.6; this.bottom = 1.04; this.top = 3.8; this.depth = 1.4;
        for (const x of [-1.23, 1.23]) a.mesh('box', dark, g, x, 1.85, 0, 0.22, 3.7, 1.4);
        a.mesh('box', stone, g, 0, 2.5, 0, 2.65, 2.9, 1.45);
        a.mesh('box', trim, g, 0, 1.08, 0, 2.65, 0.13, 1.53);
        for (const x of [-0.7, 0, 0.7]) a.mesh('box', accent, g, x, 1.65, 0.75, 0.13, 0.4, 0.025);
      } else if (type === 'lane') {
        this.width = 2.35; this.top = 4.1; this.depth = 2;
        a.mesh('box', stone, g, 0, 1.95, 0, 2.2, 3.9, 1.8);
        a.mesh('box', trim, g, 0, 4, 0, 2.35, 0.23, 2);
        a.mesh('rock', dark, g, 0, 2.8, 1, 0.7, 0.65, 0.2);
        for (const x of [-0.25, 0.25]) a.mesh('box', accent, g, x, 2.88, 1.18, 0.12, 0.1, 0.03);
      } else if (type === 'gap') {
        this.width = 2.74; this.depth = 5.8; this.top = 0; this.bottom = -8;
        a.mesh('box', biome === 4 ? a.material.lava : dark, g, 0, -4.7, 0, 2.7, 0.2, 5.8);
        for (const z of [-3, 3]) a.mesh('box', trim, g, 0, -0.16, z, 2.74, 0.32, 0.25);
      } else if (type === 'fire') {
        this.top = 1.15; this.depth = 1.45;
        a.mesh('box', dark, g, 0, 0.08, 0, 2.15, 0.16, 1.5);
        a.mesh('box', 'lava', g, 0, 0.17, 0, 1.9, 0.06, 1.2);
        this.flames = [];
        for (const x of [-0.7, -0.25, 0.25, 0.7]) this.flames.push(a.mesh('cone', 'flame', g, x, 0.65, 0, 0.23, 1, 0.3));
      } else if (type === 'spinner') {
        this.depth = 0.9;
        a.mesh('box', dark, g, 0, 0.1, 0, 2.35, 0.2, 1.4);
        this.rotor = new THREE.Group();
        this.rotor.position.y = 1.35;
        g.add(this.rotor);
        a.mesh('box', trim, this.rotor, 0, 0, 0, 2.5, 0.25, 0.65);
        a.mesh('sphere', 'lava', this.rotor, 0, 0, 0.36, 0.22, 0.22, 0.16);
        for (const x of [-1.15, 1.15]) a.mesh('cone', accent, this.rotor, x, 0.25, 0, 0.13, 0.45, 0.14);
      } else if (type === 'falling-rock') {
        this.width = 2.3; this.depth = 2.2;
        this.rock = a.mesh('rock', stone, g, 0, 8, 0, 1.15, 1.3, 1.1);
        this.warning = a.mesh('halo', 'lava', g, 0, 0.035, 0, 1.05, 1.05, 1.05);
        this.warning.rotation.x = -Math.PI / 2;
      }
      g.traverse(node => { if (node.isMesh && type !== 'gap') node.castShadow = true; });
    }
    update(distance, time) {
      const ahead = this.distance - distance;
      if (this.type === 'spinner') {
        const angle = time * 2.5 + this.phase;
        this.rotor.rotation.z = angle;
        this.width = 2 * (Math.abs(Math.cos(angle)) * 1.25 + Math.abs(Math.sin(angle)) * 0.125);
        const h = Math.abs(Math.sin(angle)) * 1.25 + Math.abs(Math.cos(angle)) * 0.125;
        this.bottom = 1.35 - h; this.top = 1.35 + h;
      } else if (this.type === 'falling-rock') {
        const drop = clamp((26 - ahead) / 19, 0, 1);
        const y = 8 - drop * drop * 6.72;
        this.rock.position.y = y;
        this.rock.rotation.set(drop * 2, this.phase + drop * 3, drop);
        this.bottom = y - 1.28; this.top = y + 1.28;
        this.warning.visible = ahead > -2;
        this.warning.scale.setScalar(0.95 + Math.sin(time * 13) * 0.08);
      } else if (this.flames) {
        for (let i = 0; i < this.flames.length; i++) this.flames[i].scale.y = 0.8 + Math.sin(time * 12 + i * 2 + this.phase) * 0.2;
      }
      const z = -ahead;
      this.bounds.min.set(this.x - this.width / 2, this.bottom, z - this.depth / 2);
      this.bounds.max.set(this.x + this.width / 2, this.top, z + this.depth / 2);
    }
    break(game) {
      this.hit = true;
      if (this.type !== 'gap') this.group.visible = false;
      game.particles.emit(this.x, 1, game.distance - this.distance, 0xffc775, 25, 6, 7);
    }
  }

  class Enemy {
    constructor(type, lane, distance, segment, assets, random) {
      this.type = type; this.lane = lane; this.x = CONFIG.lanes[lane]; this.distance = distance; this.segment = segment;
      this.phase = random.range(0, Math.PI * 2); this.bounds = new THREE.Box3(); this.group = new THREE.Group();
      this.group.position.set(this.x, 0, segment.start - distance); segment.group.add(this.group);
      this.baseY = type === 'flying' || type === 'swarm' ? (type === 'swarm' ? 2.2 : 2.8) : 0;
      this.width = type === 'beast' ? 1.05 : 0.85; this.depth = 1.1; this.top = type === 'flying' || type === 'swarm' ? this.baseY + 0.8 : 1.7; this.bottom = type === 'flying' || type === 'swarm' ? this.baseY - 0.55 : 0;
      const a = assets, g = this.group;
      if (type === 'beast') {
        a.mesh('rock', 'jungleStone', g, 0, 0.85, 0, 0.85, 0.66, 1.15);
        a.mesh('sphere', 'flowerOrange', g, -0.32, 1.08, -0.86, 0.12, 0.08, 0.08);
        a.mesh('sphere', 'flowerOrange', g, 0.32, 1.08, -0.86, 0.12, 0.08, 0.08);
        for (const sign of [-1, 1]) a.mesh('cone', 'leafLime', g, sign * 0.5, 1.55, 0, 0.16, 0.5, 0.16);
      } else if (type === 'flying') {
        a.mesh('sphere', 'guardian', g, 0, 0, 0, 0.48, 0.34, 0.66);
        for (const sign of [-1, 1]) a.mesh('leaf', 'leafLight', g, sign * 0.7, 0.05, 0, 0.55, 0.18, 0.3);
        a.mesh('sphere', 'gold', g, 0, 0, -0.52, 0.1, 0.08, 0.08);
      } else if (type === 'guardian') {
        a.mesh('box', 'darkStone', g, 0, 1.1, 0, 0.95, 1.55, 0.85);
        a.mesh('box', 'sunsetGold', g, 0, 1.55, -0.46, 0.5, 0.15, 0.06);
        for (const sign of [-1, 1]) a.mesh('sphere', 'runePurple', g, sign * 0.2, 1.55, -0.5, 0.08, 0.08, 0.08);
      } else if (type === 'fire') {
        a.mesh('sphere', 'ember', g, 0, 1.05, 0, 0.52, 0.72, 0.52);
        a.mesh('cone', 'flame', g, 0, 1.8, 0, 0.28, 0.85, 0.28);
        a.mesh('ring', 'lava', g, 0, 0.08, 0, 0.75, 0.75, 0.75).rotation.x = Math.PI / 2;
      } else {
        for (const sign of [-1, 1]) {
          const mote = a.mesh('cone', 'crystalViolet', g, sign * 0.42, 0, 0, 0.26, 0.42, 0.26);
          mote.rotation.z = sign * 0.5;
        }
        a.mesh('sphere', 'runePurple', g, 0, 0, -0.18, 0.25, 0.25, 0.25);
      }
      g.traverse(node => { if (node.isMesh) node.castShadow = true; });
    }
    update(distance, time, frozen = false) {
      const speed = frozen ? 0.2 : 1;
      const ahead = this.distance - distance;
      const sway = Math.sin(time * speed * 2.2 + this.phase) * (this.type === 'flying' || this.type === 'swarm' ? 0.85 : 0.2);
      this.group.position.x = this.x + (this.type === 'flying' ? sway : sway * 0.3);
      this.group.position.y = this.baseY + (this.type === 'flying' || this.type === 'swarm' ? Math.sin(time * speed * 3 + this.phase) * 0.35 : Math.abs(Math.sin(time * speed * 5 + this.phase)) * 0.08);
      if (this.type === 'fire') this.group.rotation.y = time * speed * 2;
      const z = -ahead;
      this.bounds.min.set(this.group.position.x - this.width / 2, this.group.position.y + this.bottom - (this.type === 'flying' || this.type === 'swarm' ? this.baseY : 0), z - this.depth / 2);
      this.bounds.max.set(this.group.position.x + this.width / 2, this.group.position.y + this.top - (this.type === 'flying' || this.type === 'swarm' ? this.baseY : 0), z + this.depth / 2);
    }
    break(game) {
      this.group.visible = false; this.defeated = true;
      game.particles.emit(this.group.position.x, this.group.position.y + 0.8, game.distance - this.distance, POWER_INFO.fireTrail.color, 18, 4, 4);
    }
  }

  class TrackSegment {
    constructor() {
      this.group = new THREE.Group();
      this.obstacles = []; this.enemies = []; this.coins = []; this.pickups = []; this.torches = []; this.waterMeshes = [];
      this.rows = []; this.start = 0; this.biome = 0;
    }
    clear() {
      this.group.clear();
      this.obstacles.length = this.enemies.length = this.coins.length = this.pickups.length = this.torches.length = this.waterMeshes.length = this.rows.length = 0;
      this.routeType = ''; this.routeLane = 1; this.special = null; this.specialUsed = false;
    }
  }

  class TrackManager {
    constructor(scene, assets) {
      this.scene = scene; this.assets = assets;
      this.segments = [];
      for (let i = 0; i < CONFIG.segmentCount; i++) {
        const segment = new TrackSegment();
        this.segments.push(segment);
        scene.add(segment.group);
      }
      this.safeLane = 1;
      this.nextStart = 0;
    }
    reset(seed, startDistance = 0) {
      this.random = new Random(seed);
      this.safeLane = 1;
      this.nextStart = startDistance - CONFIG.segmentLength;
      for (const segment of this.segments) {
        this.generate(segment, this.nextStart);
        this.nextStart += CONFIG.segmentLength;
      }
      this.update(startDistance, 0);
    }
    generate(segment, start) {
      segment.clear(); segment.start = start;
       segment.biome = biomeForDistance(start);
      const rng = this.random, a = this.assets;
      const difficulty = 1 - Math.exp(-Math.max(0, start) / 1000);
      segment.entryLane = this.safeLane;
      let route = this.safeLane;
      for (const offset of [10, 27, 44]) {
        const previous = route;
        if (start > 55 && rng.next() < 0.6) route = clamp(route + (rng.next() < 0.5 ? -1 : 1), 0, 2);
        const row = { offset, safe: route, blocked: [false, false, false] };
        segment.rows.push(row);
        if (start >= 54) {
          for (let lane = 0; lane < 3; lane++) {
            if (lane === route || rng.next() > 0.62 + difficulty * 0.32) continue;
            const types = start < 160 ? ['jump', 'slide', 'lane'] : start < 330 ? ['jump', 'slide', 'lane', 'gap', 'fire'] : ['jump', 'slide', 'lane', 'gap', 'fire', 'spinner', 'falling-rock'];
             segment.obstacles.push(new Obstacle(rng.pick(types), lane, start + offset, segment, a, rng, segment.biome));
            row.blocked[lane] = true;
          }
        }
        // The golden thread changes at most one lane in a 17m interval.
        // A clear lane is reserved even when both alternative lanes are blocked.
        for (let n = 0; n < 7; n++) {
          const along = offset - 6 + n * 1.6;
          const blend = clamp((along - (offset - 8)) / 5, 0, 1);
          const x = lerp(CONFIG.lanes[previous], CONFIG.lanes[route], blend);
          this.addCoin(segment, x, 1, start + along);
        }
        if (start > 100 && rng.next() < 0.32) {
          const obstacle = segment.obstacles[segment.obstacles.length - 1];
          if (obstacle && Math.abs(obstacle.distance - (start + offset)) < 1 && ['jump', 'gap', 'fire'].includes(obstacle.type)) {
            for (let n = 0; n < 5; n++) this.addCoin(segment, obstacle.x, 1.9 + Math.sin(n / 4 * Math.PI) * 0.9, obstacle.distance - 2.8 + n * 1.4);
          }
        }
      }
      // Validation is independent of generation: reachable clear lanes are
      // propagated across rows. Repair to a central clear route if needed.
      if (!this.validateRoute(segment)) {
        for (const obstacle of segment.obstacles) if (obstacle.lane === 1) segment.group.remove(obstacle.group);
        segment.obstacles = segment.obstacles.filter(obstacle => obstacle.lane !== 1);
        for (const row of segment.rows) { row.blocked[1] = false; row.safe = 1; }
        route = 1;
      }
      this.safeLane = route;
      segment.exitLane = route;
      if (start >= 108 && rng.next() < 0.58) {
        const row = segment.rows[rng.int(2)];
        const type = POWER_TYPES[(Math.floor(start / CONFIG.segmentLength) + rng.int(POWER_TYPES.length)) % POWER_TYPES.length];
        this.addPower(segment, type, row.safe, start + row.offset + 6.5);
      }
      if (start >= 180 && rng.next() < 0.38) {
        const row = segment.rows[1], riskyLane = row.safe === 1 ? (rng.next() < 0.5 ? 0 : 2) : 1;
        segment.routeType = rng.next() < 0.18 ? 'secret' : rng.next() < 0.5 ? 'dangerous' : 'safe';
        segment.routeLane = riskyLane;
        for (let n = 0; n < (segment.routeType === 'secret' ? 9 : 6); n++) this.addCoin(segment, CONFIG.lanes[riskyLane], 1.15 + Math.sin(n / 8 * Math.PI) * 0.65, start + 22 + n * 1.55);
        if (segment.routeType === 'secret') this.addPower(segment, 'coinStorm', riskyLane, start + 33);
      }
      if (start >= 220 && rng.next() < Math.min(0.5, 0.18 + difficulty * 0.2)) {
        const row = segment.rows[2], enemyLane = row.safe === 1 ? (rng.next() < 0.5 ? 0 : 2) : 1;
        const enemyTypes = segment.biome === 1 ? ['beast', 'flying'] : segment.biome === 3 ? ['swarm', 'flying'] : segment.biome === 4 ? ['fire'] : segment.biome === 0 || segment.biome === 5 ? ['guardian', 'flying'] : ['flying', 'guardian'];
        this.addEnemy(segment, rng.pick(enemyTypes), enemyLane, start + 39);
      }
      if (start >= 300 && rng.next() < 0.2) segment.special = rng.pick(['wallrun', 'vine', 'zipline', 'platform']);
      this.buildFloor(segment);
      this.buildEnvironment(segment, rng);
    }
    validateRoute(segment) {
      let reachable = [false, false, false];
      reachable[segment.entryLane] = true;
      for (const row of segment.rows) {
        const next = [false, false, false];
        for (let lane = 0; lane < 3; lane++) {
          if (row.blocked[lane]) continue;
          for (let previous = 0; previous < 3; previous++) {
            if (reachable[previous] && Math.abs(previous - lane) <= 1) next[lane] = true;
          }
        }
        if (!next.some(Boolean)) return false;
        reachable = next;
      }
      return reachable[segment.rows[segment.rows.length - 1].safe];
    }
    addCoin(segment, x, y, distance) {
      const roll = this.random.next();
      const relicThreshold = segment.biome === 3 ? 0.975 : 0.992;
      const kind = roll > relicThreshold ? 'relic' : roll > 0.94 ? 'crystal' : roll > 0.78 ? 'gem' : 'gold';
      const material = kind === 'relic' ? 'gold' : kind === 'crystal' ? 'crystalViolet' : kind === 'gem' ? 'crystalBlue' : 'gold';
      const mesh = this.assets.mesh('ring', material, segment.group, x, y, segment.start - distance, kind === 'relic' ? 1.35 : kind === 'gold' ? 1 : 1.12, kind === 'relic' ? 1.35 : kind === 'gold' ? 1 : 1.12, kind === 'relic' ? 1.35 : kind === 'gold' ? 1 : 1.12);
      segment.coins.push({ mesh, x, y, baseY: y, distance, kind, collected: false, phase: this.random.range(0, 6.28), attracted: false });
    }
    addPower(segment, type, lane, distance) {
      const group = new THREE.Group();
      group.position.set(CONFIG.lanes[lane], 1.2, segment.start - distance);
      segment.group.add(group);
      this.assets.mesh(type === 'shield' ? 'sphere' : 'rock', type, group, 0, 0, 0, 0.4, 0.4, 0.4);
      const halo = this.assets.mesh('halo', type, group, 0, 0, 0, 0.58, 0.58, 0.58);
      halo.rotation.x = Math.PI / 2;
      segment.pickups.push({ group, type, x: CONFIG.lanes[lane], distance, collected: false, bounds: new THREE.Box3() });
    }
    addEnemy(segment, type, lane, distance) {
      segment.enemies.push(new Enemy(type, lane, distance, segment, this.assets, this.random));
    }
    buildFloor(segment) {
       const a = this.assets, length = CONFIG.segmentLength;
       const floor = a.themeMaterial(segment.biome, 'floor');
       const bank = a.themeMaterial(segment.biome, 'bank');
       const trim = a.themeMaterial(segment.biome, 'trim');
       const patch = a.themeMaterial(segment.biome, 'patch');
      for (let lane = 0; lane < 3; lane++) {
        const gaps = segment.obstacles.filter(o => o.type === 'gap' && o.lane === lane).sort((p, q) => p.distance - q.distance);
        let from = 0;
        const piece = (begin, end) => {
          if (end - begin <= 0) return;
           const mesh = a.mesh('box', floor, segment.group, CONFIG.lanes[lane], -0.28, -(begin + end) / 2, 2.76, 0.56, end - begin);
          mesh.receiveShadow = true;
        };
        for (const gap of gaps) {
          const offset = gap.distance - segment.start;
          piece(from, offset - gap.depth / 2);
          from = offset + gap.depth / 2;
        }
        piece(from, length);
      }
      for (const sign of [-1, 1]) {
         a.mesh('box', bank, segment.group, sign * 4.7, -0.7, -length / 2, 1.05, 1.3, length);
         a.mesh('box', trim, segment.group, sign * 4.36, 0.07, -length / 2, 0.25, 0.14, length);
      }
      for (let offset = 2; offset < length; offset += 6) {
        a.mesh('box', trim, segment.group, -4.36, 0.16, -offset, 0.27, 0.18, 0.5);
        a.mesh('box', trim, segment.group, 4.36, 0.16, -offset, 0.27, 0.18, 0.5);
      }
      // Small, readable surface notes break up the long path without ever
      // changing its collision shape.
      for (let n = 0; n < Math.max(4, Math.round(9 * this.assets.detailScale)); n++) {
        const z = -3 - n * 5.7;
        const detail = a.mesh('box', patch, segment.group, this.random.range(-3.8, 3.8), 0.012, z, this.random.range(0.25, 0.8), 0.025, this.random.range(0.35, 1.15));
        detail.rotation.y = this.random.range(-0.35, 0.35);
      }
    }
    buildEnvironment(segment, rng) {
      const a = this.assets, g = segment.group, length = CONFIG.segmentLength;
      const theme = segment.biome;
      const stone = a.themeMaterial(theme, 'stone');
      const dark = a.themeMaterial(theme, 'dark');
      const bank = a.themeMaterial(theme, 'bank');
      const accent = a.themeMaterial(theme, 'accent');
      const waterLike = theme === 4 ? a.material.lava : a.material.water;
      const flowerCluster = (x, z, count = 5) => {
        const cluster = new THREE.Group(); cluster.position.set(x, 0, z); g.add(cluster);
        const colors = ['flowerPink', 'flowerMagenta', 'flowerOrange', 'flowerYellow', 'flowerBlue'];
        for (let i = 0; i < count; i++) {
          const angle = rng.range(0, Math.PI * 2), radius = rng.range(0.08, 0.48);
          a.mesh('cylinder', theme === 3 ? 'crystalBlue' : 'leafLime', cluster, Math.cos(angle) * radius, 0.17, Math.sin(angle) * radius, 0.018, 0.28, 0.018);
          a.mesh('sphere', rng.pick(colors), cluster, Math.cos(angle) * radius, 0.43, Math.sin(angle) * radius, 0.11, 0.07, 0.11);
          a.mesh('sphere', 'flowerYellow', cluster, Math.cos(angle) * radius, 0.43, Math.sin(angle) * radius - 0.03, 0.035, 0.035, 0.035);
        }
      };
      const broadTree = (x, z, scale = 1) => {
        const tree = new THREE.Group(); tree.position.set(x, -1, z); tree.scale.setScalar(scale); g.add(tree);
        const height = rng.range(5.2, 8.5);
        const trunk = a.mesh('taper', rng.next() > 0.45 ? 'bark' : 'barkDark', tree, 0, height / 2, 0, 0.42, height, 0.42);
        trunk.rotation.z = rng.range(-0.12, 0.12);
        for (let f = 0; f < 6; f++) {
          const angle = f * Math.PI / 3 + rng.range(-0.22, 0.22);
          const leaf = a.mesh('sphere', rng.pick(['leaf', 'leafLight', 'leafTeal', 'leafLime']), tree, Math.cos(angle) * 1.45, height - rng.range(0, 0.8), Math.sin(angle) * 1.45, rng.range(0.45, 0.8), 0.17, rng.range(0.28, 0.48));
          leaf.rotation.y = -angle;
        }
        for (let vine = 0; vine < 2; vine++) {
          const hanging = a.mesh('cylinder', 'vine', tree, rng.range(-1.2, 1.2), height - 0.3, rng.range(-0.35, 0.35), 0.035, rng.range(1.1, 2.8), 0.035);
          hanging.rotation.z = rng.range(-0.18, 0.18);
        }
      };
      for (const sign of [-1, 1]) {
        a.mesh('box', bank, g, sign * 16, -1.4, -length / 2, 20, 1.3, length);
        const stream = a.mesh('box', waterLike, g, sign * 7.4, -0.83, -length / 2, 3.4, 0.09, length);
        stream.receiveShadow = true;
        segment.waterMeshes.push({ mesh: stream, baseY: -0.83, phase: sign * 0.8 });
        if (theme !== 4) {
          for (let wave = 0; wave < 5; wave++) {
            const foam = a.mesh('box', a.material.foam, g, sign * (6.35 + rng.range(-0.5, 0.5)), -0.76, -3 - wave * 10.5, rng.range(0.45, 1.1), 0.018, 0.08);
            segment.waterMeshes.push({ mesh: foam, baseY: -0.76, phase: wave * 1.5 });
          }
        }
        for (let n = 0; n < Math.max(2, Math.round(4 * a.detailScale)); n++) {
          const z = -n * 13.5 - rng.range(1, 6);
          const x = sign * rng.range(9, 16);
          if (theme !== 4 && theme !== 3) broadTree(x, z, theme === 5 ? 0.82 : rng.range(0.8, 1.1));
          if (theme === 1 || theme === 2 || theme === 5 || theme === 6) flowerCluster(sign * rng.range(5.2, 8.1), z - 1.5, Math.max(3, Math.round((theme === 2 ? 4 : 6) * a.detailScale)));
          const rubble = a.mesh('rock', theme === 4 ? 'volcanic' : dark, g, sign * rng.range(5.9, 8.2), rng.range(-0.1, 0.4), z - 2, rng.range(0.4, 1), rng.range(0.6, 1.3), rng.range(0.5, 1));
          rubble.rotation.y = rng.range(0, 6.28);
        }
        for (let n = 0; n < 2; n++) {
          const z = -9 - n * 27, x = sign * 5.65;
          const h = theme === 2 ? 7.5 : theme === 3 ? 5.5 : theme === 4 ? 4.8 : 4.4;
          a.mesh('box', dark, g, x, h / 2, z, 1.25, h, 1.25);
          a.mesh('box', stone, g, x, h, z, 1.6, 0.4, 1.6);
          a.mesh('box', accent, g, x - sign * 0.64, 2.2, z - 0.66, 0.035, 0.9, 0.25);
          a.mesh('cylinder', 'leather', g, x - sign * 0.9, 2.45, z, 0.12, 0.7, 0.12);
          segment.torches.push(a.mesh('cone', 'flame', g, x - sign * 0.9, 3, z, 0.21, 0.75, 0.21));
          if (theme !== 1 && theme !== 4) {
            const vine = a.mesh('cylinder', 'vine', g, x + sign * 0.4, h / 2, z + 0.65, 0.045, h, 0.045);
            vine.rotation.z = sign * 0.09;
          }
        }
      }
      const chapter = Math.floor(Math.max(0, segment.start) / length);
      if (segment.routeType) {
        const routeColor = segment.routeType === 'secret' ? 'runePurple' : segment.routeType === 'dangerous' ? 'ember' : 'gold';
        const routeBeacon = a.mesh('halo', routeColor, g, CONFIG.lanes[segment.routeLane], 3.2, -22, 0.82, 0.82, 0.82);
        routeBeacon.rotation.x = Math.PI / 2;
        a.mesh('sphere', routeColor, g, CONFIG.lanes[segment.routeLane], 2.55, -22, 0.18, 0.18, 0.18);
      }
      if (segment.special) {
        const x = segment.special === 'wallrun' ? -4.9 : segment.special === 'zipline' ? 0 : CONFIG.lanes[segment.routeLane || 1];
        const accentMaterial = segment.special === 'vine' ? 'leafLight' : segment.special === 'zipline' ? 'gold' : segment.special === 'platform' ? 'crystalBlue' : 'turquoise';
        a.mesh('box', accentMaterial, g, x, segment.special === 'zipline' ? 4.4 : 1.9, -27, segment.special === 'platform' ? 1.6 : 0.18, segment.special === 'platform' ? 0.22 : 0.12, segment.special === 'platform' ? 0.7 : 7.5);
        if (segment.special === 'zipline') a.mesh('cylinder', 'gold', g, 0, 5.8, -27, 0.035, 10, 0.035).rotation.z = Math.PI / 2;
        if (segment.special === 'vine') a.mesh('cylinder', 'vine', g, CONFIG.lanes[segment.routeLane || 1], 3.1, -27, 0.08, 4.2, 0.08);
      }
      if (segment.start >= 0 && chapter % 4 === 0) {
        const z = -length * 0.52;
        for (const sign of [-1, 1]) {
          a.mesh('box', stone, g, sign * 5.45, 3.4, z, 1.2, 6.8, 1.35);
          a.mesh('box', a.themeMaterial(theme, 'trim'), g, sign * 5.45, 6.85, z, 1.55, 0.38, 1.6);
          a.mesh('box', accent, g, sign * 5.02, 3.55, z - 0.7, 0.06, 1.45, 0.08);
        }
        a.mesh('box', stone, g, 0, 7.05, z, 12, 1.15, 1.45);
        a.mesh('box', a.themeMaterial(theme, 'trim'), g, 0, 7.7, z, 12.7, 0.22, 1.65);
        for (const x of [-3.6, -1.8, 0, 1.8, 3.6]) a.mesh('box', accent, g, x, 6.85, z - 0.78, 0.42, 0.52, 0.06);
        for (const sign of [-1, 1]) a.mesh('box', theme === 4 ? 'lava' : theme === 3 ? 'runePurple' : 'gold', g, sign * 4.5, 4.4, z - 0.77, 0.7, 1.5, 0.06);
      }
      if (theme === 2) {
        for (const sign of [-1, 1]) {
          const x = sign * 12.4, z = -length * 0.55;
          const fall = a.mesh('box', 'water', g, x, 3.8, z, 2.7, 7.6, 0.16);
          const veil = a.mesh('box', 'foam', g, x + sign * 0.12, 3.6, z - 0.1, 1.35, 7.1, 0.05);
          segment.waterMeshes.push({ mesh: fall, baseY: 3.8, phase: sign });
          segment.waterMeshes.push({ mesh: veil, baseY: 3.6, phase: sign + 2 });
          a.mesh('rock', 'waterStone', g, x, -0.12, z + 0.25, 2.5, 0.65, 1.25);
          for (let mist = 0; mist < 4; mist++) a.mesh('sphere', 'foam', g, x + rng.range(-1.8, 1.8), rng.range(0.2, 1.2), z + 0.8 + rng.range(-0.3, 0.5), 0.28, 0.12, 0.28);
        }
      } else if (theme === 3) {
        for (const sign of [-1, 1]) for (let n = 0; n < 4; n++) {
          const crystal = a.mesh('cone', rng.next() > 0.5 ? 'crystalBlue' : 'crystalViolet', g, sign * rng.range(7.5, 11.5), rng.range(0.9, 2.3), -8 - n * 13, rng.range(0.22, 0.55), rng.range(1.4, 3.8), rng.range(0.22, 0.55));
          crystal.rotation.z = rng.range(-0.2, 0.2); crystal.rotation.y = rng.range(0, 6.28);
        }
      } else if (theme === 4) {
        for (const sign of [-1, 1]) {
          const pool = a.mesh('box', 'lava', g, sign * 9.8, -0.48, -length * 0.56, 4.8, 0.08, 5.6);
          segment.waterMeshes.push({ mesh: pool, baseY: -0.48, phase: sign * 2 });
          for (let n = 0; n < 3; n++) a.mesh('rock', 'volcanic', g, sign * rng.range(8, 13), rng.range(0.3, 1.4), -10 - n * 13, rng.range(0.7, 1.6), rng.range(0.8, 2), rng.range(0.7, 1.4));
        }
      } else if (theme === 5) {
        for (const sign of [-1, 1]) {
          a.mesh('box', 'sunsetGold', g, sign * 10.8, 4.7, -length * 0.55, 0.22, 8.8, 0.22);
          a.mesh('box', sign < 0 ? 'flowerMagenta' : 'flowerOrange', g, sign * 10.5, 6.1, -length * 0.55, 1.3, 1.8, 0.08);
          a.mesh('rock', 'mountainBlue', g, sign * 9.5, 7.1, -length * 0.48, 2.8, 0.7, 2.1);
          a.mesh('box', 'gold', g, sign * 9.5, 7.8, -length * 0.48, 1.2, 0.18, 1.2);
        }
        a.mesh('box', 'moonStone', g, 0, 6.6, -length * 0.5, 13.5, 0.18, 0.55);
        for (const x of [-5.5, -2.75, 0, 2.75, 5.5]) a.mesh('sphere', 'cloud', g, x, 5.4, -length * 0.5, 1.1, 0.22, 0.6);
      } else if (theme === 6) {
        for (const sign of [-1, 1]) {
          const shrineX = sign * 7.2;
          a.mesh('cylinder', 'moonGold', g, shrineX, 3.4, -length * 0.54, 2.2, 0.32, 2.2);
          const moonRing = a.mesh('ring', 'moonCyan', g, shrineX, 4.6, -length * 0.54, 2.1, 2.1, 2.1);
          moonRing.rotation.x = Math.PI / 2;
          a.mesh('sphere', 'moonCyan', g, shrineX + sign * 2.1, 4.9, -length * 0.54, 0.3, 0.3, 0.3);
        }
      }
      g.traverse(node => {
        if (!node.isMesh) return;
        const transparent = Boolean(node.material && node.material.transparent);
        node.castShadow = !transparent;
        node.receiveShadow = !transparent;
      });
    }
    hasGround(x, distance) {
      for (const segment of this.segments) {
        if (distance < segment.start - 0.1 || distance > segment.start + CONFIG.segmentLength + 0.1) continue;
        for (const obstacle of segment.obstacles) {
          if (obstacle.type === 'gap' && Math.abs(x - obstacle.x) < obstacle.width / 2 && Math.abs(distance - obstacle.distance) < obstacle.depth / 2) return false;
        }
      }
      return true;
    }
    update(distance, time, game = null) {
      for (const segment of this.segments) {
        if (segment.start + CONFIG.segmentLength < distance - 22) {
          this.generate(segment, this.nextStart);
          this.nextStart += CONFIG.segmentLength;
        }
        segment.group.position.z = distance - segment.start;
        segment.group.visible = segment.start < distance + 180 && segment.start + CONFIG.segmentLength > distance - 45;
         if (!segment.group.visible) continue;
         for (let i = 0; i < segment.torches.length; i++) segment.torches[i].scale.y = 0.64 + Math.sin(time * 11 + i + segment.start) * 0.13;
         for (const water of segment.waterMeshes) {
           water.mesh.position.y = water.baseY + Math.sin(time * 2.2 + water.phase) * 0.018;
           water.mesh.scale.x = 1 + Math.sin(time * 1.7 + water.phase) * 0.018;
         }
         for (const obstacle of segment.obstacles) {
           if (Math.abs(obstacle.distance - distance) < 65) obstacle.update(distance, game && game.powers.timeFreeze > 0 ? time * 0.28 : time);
         }
         for (const enemy of segment.enemies) {
           if (!enemy.defeated && Math.abs(enemy.distance - distance) < 65) enemy.update(distance, time, Boolean(game && game.powers.timeFreeze > 0));
         }
        for (const coin of segment.coins) {
          if (coin.collected) continue;
          coin.mesh.rotation.y = time * 2.8 + coin.phase;
          if (!coin.attracted) coin.mesh.position.y = coin.baseY + Math.sin(time * 3 + coin.phase) * 0.1;
        }
        for (const pickup of segment.pickups) {
          if (pickup.collected) continue;
          pickup.group.rotation.y = time * 1.5;
          pickup.group.position.y = 1.2 + Math.sin(time * 3 + pickup.distance) * 0.18;
        }
      }
    }
    interact(game, dt) {
      const p = game.player, distance = game.distance;
      for (const segment of this.segments) {
        if (segment.start > distance + 23 || segment.start + CONFIG.segmentLength < distance - 12) continue;
        if (segment.special && !segment.specialUsed && Math.abs(distance - (segment.start + 27)) < 1.6) {
          segment.specialUsed = true; game.performParkour(segment.special);
        }
        for (const obstacle of segment.obstacles) {
          const ahead = obstacle.distance - distance;
          if (Math.abs(ahead) > 10 || obstacle.hit) continue;
          if (obstacle.type !== 'gap' && p.bounds.intersectsBox(obstacle.bounds)) {
            if (game.powers.burst > 0 || game.powers.fireTrail > 0 || p.invulnerable > 0) {
              obstacle.break(game);
              game.addScore(15);
            } else if (game.powers.shield > 0) {
              game.powers.shield = 0; p.invulnerable = 1.5;
              obstacle.break(game); game.combo = 0;
              game.guardian.threat = clamp(game.guardian.threat + 0.22, 0, 1);
              game.cameraRig.shake = 0.35; game.hitFeedback(0.18);
              game.audio.sfx('shield'); game.ui.toast('SHIELD SHATTERED · KEEP RUNNING');
            } else {
              const reasons = { jump: 'A forgotten altar stopped your escape.', slide: 'The low temple gate caught you standing.', lane: 'You ran into a guardian pillar.', fire: 'The ember vents burned too brightly.', spinner: 'The temple’s turning blade found you.', 'falling-rock': 'An ancient ceiling stone sealed your fate.' };
              game.guardian.threat = clamp(game.guardian.threat + 0.16, 0, 1);
              game.die(reasons[obstacle.type] || 'The temple reclaimed its ember.');
              return;
            }
          }
          if (!obstacle.nearChecked && ahead < -obstacle.depth / 2 - 0.35) {
            obstacle.nearChecked = true;
            const horizontal = Math.abs(p.x - obstacle.x) - obstacle.width / 2 - 0.36;
            const vertical = p.bounds.min.y - obstacle.top;
            const slid = obstacle.type === 'slide' && p.slideTime > 0 && Math.abs(p.x - obstacle.x) < 1;
            const cleared = (vertical > 0 && vertical < 0.8 && Math.abs(p.x - obstacle.x) < 1.2) || (horizontal > 0 && horizontal < 0.8) || slid;
            if (cleared && p.y > -0.1 && game.powers.burst <= 0) game.nearMiss();
          }
        }
        for (const enemy of segment.enemies) {
          const ahead = enemy.distance - distance;
          if (enemy.defeated || Math.abs(ahead) > 8) continue;
          if (enemy.bounds.intersectsBox(p.bounds)) {
            if (game.powers.ghost > 0 || game.powers.fireTrail > 0 || game.powers.burst > 0) {
              enemy.break(game); game.addScore(40); game.recordAction('enemy');
            } else if (game.powers.shield > 0) {
              game.powers.shield = 0; p.invulnerable = 1.5; enemy.break(game); game.guardian.threat = clamp(game.guardian.threat + 0.16, 0, 1); game.audio.sfx('shield'); game.ui.toast('SHIELD SHATTERED · THE BEAST BREAKS');
            } else {
              game.enemyHit(enemy.type); return;
            }
          } else if (!enemy.passed && ahead < -enemy.depth / 2 - 0.3) {
            enemy.passed = true; game.addScore(35); game.guardian.threat = clamp(game.guardian.threat - 0.025, 0, 1); game.recordAction('enemyDodge');
          }
        }
        for (const coin of segment.coins) {
          if (coin.collected) continue;
          let dz = distance - coin.distance;
          if (Math.abs(dz) > 20) continue;
          const dx = p.x - coin.x, dy = p.y + 0.95 - coin.y;
           const radius = game.powers.burst > 0 ? 12 : game.powers.magnet > 0 ? 16 + game.upgradeLevel('magnet') * 1.8 : 0;
          if (radius && dx * dx + dy * dy + dz * dz < radius * radius) {
            coin.attracted = true;
            const pull = 1 - Math.exp(-12 * dt);
            coin.x += dx * pull; coin.y += dy * pull;
            coin.distance = lerp(coin.distance, distance, pull);
            coin.mesh.position.set(coin.x, coin.y, segment.start - coin.distance);
            dz = distance - coin.distance;
          }
          const cx = p.x - coin.x, cy = p.y + 0.95 - coin.y;
          if (cx * cx + cy * cy + dz * dz < 0.95 * 0.95) {
            coin.collected = true; coin.mesh.visible = false;
             game.collectCoin(coin.x, coin.y, dz, coin);
          }
        }
        for (const pickup of segment.pickups) {
          if (pickup.collected || Math.abs(distance - pickup.distance) > 2) continue;
          const z = distance - pickup.distance, y = pickup.group.position.y;
          pickup.bounds.min.set(pickup.x - 0.58, y - 0.58, z - 0.58);
          pickup.bounds.max.set(pickup.x + 0.58, y + 0.58, z + 0.58);
          if (p.bounds.intersectsBox(pickup.bounds)) {
            pickup.collected = true; pickup.group.visible = false;
            game.grantPower(pickup.type);
          }
        }
      }
    }
     biomeAt(distance) { return biomeForDistance(distance); }
    dispose() { for (const segment of this.segments) { this.scene.remove(segment.group); segment.clear(); } }
  }

  // The Ashbound: a six-legged, stone-and-ember guardian, not a borrowed character.
  class Guardian {
    constructor(scene, assets) {
      this.group = new THREE.Group();
      this.body = new THREE.Group();
      this.group.add(this.body);
      scene.add(this.group);
      const a = assets, b = this.body;
      a.mesh('rock', 'guardian', b, 0, 1.25, 0, 1.25, 0.9, 1.6);
      a.mesh('rock', 'darkStone', b, 0, 1.45, -1.32, 0.9, 0.85, 0.75);
      for (const x of [-0.48, 0.48]) {
        a.mesh('sphere', 'lava', b, x, 1.68, -1.96, 0.2, 0.1, 0.1);
        const horn = a.mesh('cone', 'trim', b, x * 1.8, 2.25, -1.2, 0.2, 1.2, 0.22);
        horn.rotation.z = -x * 0.8;
      }
      for (let n = 0; n < 4; n++) a.mesh('cone', 'ember', b, 0, 2.1, -0.55 + n * 0.65, 0.2, 0.65, 0.25);
      this.legs = [];
      for (const sign of [-1, 1]) {
        for (let n = 0; n < 3; n++) {
          const pivot = new THREE.Group();
          pivot.position.set(sign * 0.9, 1.15, -0.8 + n * 0.8);
          pivot.rotation.z = sign * 0.4; b.add(pivot);
          a.mesh('box', 'guardian', pivot, sign * 0.25, -0.35, 0, 0.35, 0.8, 0.3);
          a.mesh('cone', 'trim', pivot, sign * 0.45, -0.9, -0.1, 0.22, 0.6, 0.28);
          this.legs.push(pivot);
        }
      }
      b.traverse(node => { if (node.isMesh) node.castShadow = true; });
      this.reset();
    }
    reset() { this.threat = 0.18; this.phase = 0; this.group.position.set(0, 0, 10); }
    update(dt, game) {
      const dying = game.state === STATES.DYING;
      const recovering = game.powers.speed > 0 || game.powers.lightning > 0 || game.powers.burst > 0;
      const comboProtection = game.combo >= 25 ? 0.007 : 0;
      this.threat = Math.max(0.08, this.threat - dt * (recovering ? 0.045 : 0.012 + comboProtection));
      const behind = dying ? 2.4 : 9.5 - this.threat * 6.6;
      this.group.position.z = damp(this.group.position.z, behind, dying ? 4 : 2, dt);
      this.group.position.x = damp(this.group.position.x, game.player.x * 0.75, 3, dt);
      this.phase += dt * (game.state === STATES.RUNNING || dying ? game.speed * 0.9 + 3 : 2);
      this.body.position.y = Math.sin(this.phase * 2) * 0.07;
      this.body.rotation.z = Math.sin(this.phase) * 0.04;
      for (let i = 0; i < this.legs.length; i++) this.legs[i].rotation.x = Math.sin(this.phase + i * Math.PI / 3) * 0.65;
      if (game.state === STATES.RUNNING && this.threat >= 0.99) { game.guardianEscapes = (game.guardianEscapes || 0) + 1; game.die('GUARDIAN CAUGHT YOU'); }
    }
  }

  class Environment {
    constructor(scene, assets) {
      this.assets = assets;
      this.group = new THREE.Group();
      scene.add(this.group);
      this.skyColors = [0x4d82a7, 0x267c83, 0x4ca5bd, 0x302c70, 0x4f202a, 0x9c456a, 0x1e3265].map(color => new THREE.Color(color));
      this.skyTop = [0x204c82, 0x103f56, 0x237ab0, 0x161a4b, 0x211d3d, 0x5e285b, 0x101b4b].map(color => new THREE.Color(color));
      this.skyHorizon = [0xffc477, 0x7bd1c1, 0x9ee8e7, 0x8e6bd0, 0xff713c, 0xffa16a, 0x426ca6].map(color => new THREE.Color(color));
      this.fogColors = BIOMES.map(theme => new THREE.Color(theme.fog));
      this.hemiTargets = [0xffd1ae, 0xffd1ae, 0x8bb9ff, 0x8bb9ff, 0xffd1ae, 0xffd1ae, 0x8bb9ff].map(color => new THREE.Color(color));
      this.groundTargets = [0x29453e, 0x29453e, 0x294b60, 0x20244b, 0x321d28, 0x4b293f, 0x20244b].map(color => new THREE.Color(color));
      this.sunTargets = [0xffb46d, 0xffbd88, 0xa9c9ff, 0xa9c9ff, 0xff8c54, 0xffa16a, 0xa9c9ff].map(color => new THREE.Color(color));
      scene.background = this.skyColors[0].clone();
      scene.fog = new THREE.FogExp2(this.skyColors[0], 0.012);
      this.sky = new THREE.Mesh(
        new THREE.SphereGeometry(160, 32, 16),
        new THREE.ShaderMaterial({
          uniforms: { topColor: { value: this.skyTop[0].clone() }, horizonColor: { value: this.skyHorizon[0].clone() } },
          vertexShader: 'varying vec3 vWorldPosition; void main(){ vec4 worldPosition = modelMatrix * vec4(position, 1.0); vWorldPosition = worldPosition.xyz; gl_Position = projectionMatrix * viewMatrix * worldPosition; }',
          fragmentShader: 'uniform vec3 topColor; uniform vec3 horizonColor; varying vec3 vWorldPosition; void main(){ float h = smoothstep(-18.0, 78.0, vWorldPosition.y); vec3 color = mix(horizonColor, topColor, h); float sun = pow(max(0.0, 1.0 - length(vWorldPosition - vec3(-34.0, 45.0, -120.0)) / 48.0), 3.0); color += vec3(1.0, 0.38, 0.12) * sun * 0.34; gl_FragColor = vec4(color, 1.0); }',
          side: THREE.BackSide, depthTest: false, depthWrite: false,
        }),
      );
      this.sky.renderOrder = -100;
      scene.add(this.sky);
      this.hemi = new THREE.HemisphereLight(0xffd7bd, 0x21324b, 1.55);
      scene.add(this.hemi);
      this.sun = new THREE.DirectionalLight(0xffc58e, 3.2);
      this.sun.position.set(-15, 25, -35);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(1024, 1024);
      Object.assign(this.sun.shadow.camera, { left: -17, right: 17, top: 19, bottom: -19, near: 1, far: 85 });
      this.sun.shadow.bias = -0.0008;
      this.sun.target.position.set(0, 0, -15);
      scene.add(this.sun, this.sun.target);
      this.torchLight = new THREE.PointLight(0xff8b3d, 8, 22, 2);
      this.torchLight.position.set(0, 2.8, -6);
      scene.add(this.torchLight);
      this.emberLight = new THREE.PointLight(0xff7040, 3, 7, 2);
      scene.add(this.emberLight);
      this.cyanLight = new THREE.PointLight(0x28d9e8, 2.6, 18, 2);
      this.cyanLight.position.set(-7, 3, -14); scene.add(this.cyanLight);
      this.violetLight = new THREE.PointLight(0x9c5cff, 2.2, 16, 2);
      this.violetLight.position.set(7, 3, -21); scene.add(this.violetLight);
      this.lavaLight = new THREE.PointLight(0xff321f, 2.5, 17, 2);
      this.lavaLight.position.set(0, 1, -18); scene.add(this.lavaLight);
      const rng = new Random(0xe4be7);
      for (let n = 0; n < 18; n++) {
        const mountain = assets.mesh('cone', rng.pick(['mountain', 'mountainBlue', 'mountainWarm']), this.group, (n - 8.5) * 23, 13, -118 - rng.range(0, 45), rng.range(16, 27), rng.range(38, 68), rng.range(16, 28));
        mountain.rotation.y = rng.range(0, 6.28);
      }
      for (let n = 0; n < 9; n++) {
        const tower = assets.mesh('box', n % 2 ? 'sandstoneDark' : 'moonStone', this.group, (n - 4) * 19, rng.range(6, 12), -92 - rng.range(0, 34), rng.range(1.1, 2.4), rng.range(9, 19), rng.range(1.1, 2.4));
        assets.mesh('box', 'gold', this.group, tower.position.x, tower.position.y + tower.scale.y * 0.5, tower.position.z, tower.scale.x * 1.4, 0.25, tower.scale.z * 1.4);
      }
      for (let n = 0; n < 8; n++) {
        const cloud = assets.mesh('sphere', 'cloud', this.group, (n - 3.5) * 29, 24 + rng.range(-3, 8), -105 - rng.range(0, 40), rng.range(2.5, 6), rng.range(0.35, 0.8), rng.range(1.3, 3.2));
        cloud.rotation.z = rng.range(-0.12, 0.12);
      }
      for (let n = 0; n < 4; n++) {
        const x = (n - 1.5) * 34;
        assets.mesh('box', 'water', this.group, x, 5 + (n % 2) * 2, -139 - n * 4, 4.5, 10 + (n % 2) * 4, 0.12);
        assets.mesh('box', 'foam', this.group, x + 0.25, 1.1, -138 - n * 4, 5.8, 0.22, 0.9);
      }
      this.moon = assets.mesh('sphere', 'moonCyan', this.group, -43, 57, -150, 6, 6, 1);
      this.moon.material.emissiveIntensity = 1.8;
      this.timer = 0;
    }
    update(dt, game) {
      const biome = game.track.biomeAt(game.distance);
      const color = this.skyColors[biome], top = this.skyTop[biome], horizon = this.skyHorizon[biome];
      game.scene.background.lerp(color, 1 - Math.exp(-dt * 0.6));
      game.scene.fog.color.lerp(this.fogColors[biome], 1 - Math.exp(-dt * 0.8));
      this.sky.material.uniforms.topColor.value.lerp(top, 1 - Math.exp(-dt * 0.8));
      this.sky.material.uniforms.horizonColor.value.lerp(horizon, 1 - Math.exp(-dt * 0.8));
      const warmZone = biome === 0 || biome === 4 || biome === 5;
      const dayState = Math.floor(Math.max(0, game.distance) / 700) % 5;
      const night = dayState >= 3;
      this.hemi.color.lerp(this.hemiTargets[biome], 1 - Math.exp(-dt * 1.1));
      this.hemi.groundColor.lerp(this.groundTargets[biome], 1 - Math.exp(-dt * 1.1));
      this.sun.color.lerp(this.sunTargets[biome], 1 - Math.exp(-dt * 1.1));
      this.sun.intensity = night ? 0.9 : warmZone ? 3.25 : 2.25;
      this.torchLight.intensity = (warmZone ? 8 : 4.2) + Math.sin(game.time * 13) * 1.3 + Math.sin(game.time * 19) * 0.6;
      this.emberLight.position.set(game.player.x + 0.4, Math.max(0.5, game.player.y + 1), -0.1);
      this.emberLight.intensity = game.powers.burst > 0 ? 8 : biome === 4 ? 5 : 2.4;
      const lowLighting = game.graphicsQuality === 'low';
      this.cyanLight.intensity = lowLighting ? 0.7 : night ? 6.5 : (biome === 2 || biome === 6) ? 5.5 : biome === 3 ? 3.5 : 0.7;
      this.violetLight.intensity = lowLighting ? 0.5 : night || biome === 3 || biome === 5 || biome === 6 ? 4.4 : 0.45;
      this.moon.visible = night || biome === 6;
      this.lavaLight.intensity = lowLighting ? 0.5 : biome === 4 ? 8 + Math.sin(game.time * 9) * 1.5 : 0.25;
      this.cyanLight.position.x = -7 + Math.sin(game.time * 0.4) * 1.5;
      this.violetLight.position.x = 7 + Math.cos(game.time * 0.35) * 1.5;
      this.group.rotation.y = Math.sin(game.distance / 160) * 0.025;
      this.timer -= dt;
      if (this.timer <= 0 && game.state !== STATES.PAUSED) {
        this.timer = game.powers.burst > 0 ? 0.045 : 0.2;
        if (game.powers.burst > 0) game.particles.emit(game.player.x, 0.5 + game.player.y, 0.3, 0xff9b46, 5, 1.7, -1);
        else if (game.powers.speed > 0 || game.powers.lightning > 0) game.particles.emit(game.player.x, 0.5 + game.player.y, 0.25, game.player.trailColor || 0xff9b46, 4, 1.5, -1);
        else game.particles.emit((Math.random() - 0.5) * 15, Math.random() * 4 + 0.2, -Math.random() * 40, biome === 4 ? 0xff7441 : biome === 3 || biome === 6 ? 0x7b8dff : biome === 2 ? 0x91f4eb : 0xffb3d1, 2, 0.4, -0.3);
      }
    }
    dispose(scene) {
      scene.remove(this.group, this.sky, this.hemi, this.sun, this.sun.target, this.torchLight, this.emberLight, this.cyanLight, this.violetLight, this.lavaLight);
      this.sky.geometry.dispose(); this.sky.material.dispose();
    }
  }

  class CameraRig {
    constructor(camera) {
      this.camera = camera;
      this.target = new THREE.Vector3();
      this.look = new THREE.Vector3(0, 1.1, -12);
      this.shake = 0;
      this.turn = 0;
      this.lastX = 0;
      camera.position.set(0, 5, 9.4);
      camera.lookAt(this.look);
    }
    reset() { this.shake = 0; this.lastX = 0; this.turn = 0; }
    update(dt, game) {
      const player = game.player, menu = game.state === STATES.MENU;
      const laneMotion = (player.x - this.lastX) / Math.max(dt, 0.001);
      this.lastX = player.x;
      // Temple bends are cinematic sweeps; the three physical lanes remain legible.
      this.turn = damp(this.turn, Math.sin(game.distance / 145) * 0.65, 1.5, dt);
      this.shake = Math.max(0, this.shake - dt * 1.7);
      const shakeScale = game.cameraShakeEnabled === false ? 0 : 1;
      const noiseX = Math.sin(game.time * 73) * this.shake * 0.18 * shakeScale;
      const noiseY = Math.sin(game.time * 91) * this.shake * 0.12 * shakeScale;
      const boost = game.powers.burst > 0 ? 1.1 : game.powers.lightning > 0 ? 1 : game.powers.speed > 0 ? 0.6 : 0;
      this.target.set(player.x * 0.38 + this.turn + noiseX, (menu ? 5.6 : 4.8) + Math.max(0, player.y) * 0.17 + noiseY, 9.4 + boost);
      this.camera.position.lerp(this.target, 1 - Math.exp(-dt * 7));
      this.target.set(player.x * 0.35 + this.turn * 1.7, 1.1 + Math.max(0, player.y) * 0.22, -12);
      this.look.lerp(this.target, 1 - Math.exp(-dt * 9));
      this.camera.lookAt(this.look);
      this.camera.rotateZ(clamp(-laneMotion * 0.002, -0.025, 0.025) - this.turn * 0.023);
      const fov = (menu ? 61 : 62) + boost * 9 + (game.speed - CONFIG.minSpeed) * 0.12;
      const nextFov = damp(this.camera.fov, fov, 4, dt);
      if (Math.abs(nextFov - this.camera.fov) > 0.002) { this.camera.fov = nextFov; this.camera.updateProjectionMatrix(); }
    }
  }

  class Game {
    constructor(ui, save) {
      this.ui = ui; this.save = save; this.state = STATES.MENU;
      this.mode = 'endless'; this.adventureIndex = save.data.adventureLevel || 0; this.currentBiome = 0;
      this.objectiveText = 'FOLLOW THE GOLD'; this.worldEvent = { type: '', label: '', time: 0 }; this.boss = { active: false, name: '', time: 0, duration: 0 };
      this.impactTime = 0;
      this.time = 0; this.lastTime = 0; this.accumulator = 0;
      this.fixedStep = 1 / 120; this.uiTime = 0;
      this.powers = Object.fromEntries(POWER_TYPES.map(type => [type, 0]));
      this.renderer = new THREE.WebGLRenderer({ canvas: ui.canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(62, 1, 0.1, CONFIG.far);
      this.assets = new Assets();
      this.audio = new AudioManager(save);
      this.particles = new ParticleSystem(this.scene);
      this.track = new TrackManager(this.scene, this.assets);
      this.player = new Player(this.scene, this.assets);
      this.guardian = new Guardian(this.scene, this.assets);
      this.environment = new Environment(this.scene, this.assets);
      this.cameraShakeEnabled = save.data.settings.cameraShake;
      this.graphicsQuality = save.data.settings.graphics;
      this.touchControls = save.data.settings.touchControls;
      this.applySettingsToControls();
      this.setGraphicsQuality(this.graphicsQuality, false);
      this.setTouchControls(this.touchControls, false);
      this.cameraRig = new CameraRig(this.camera);
      this.debugNode = null;
      if (DEBUG) this.createDebugOverlay();
      this.input = new InputManager(ui.canvas, () => this.audio.unlock());
      this.boundAction = (action, meta) => this.action(action, meta);
      this.boundFrame = time => this.frame(time);
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      window.addEventListener('resize', () => this.resize(), options);
      window.addEventListener('orientationchange', () => requestAnimationFrame(() => this.resize()), options);
      document.addEventListener('fullscreenchange', () => this.resize(), options);
      document.addEventListener('change', event => {
        const setting = event.target.closest('[data-setting]');
        if (!setting) return;
        const value = setting.type === 'checkbox' ? setting.checked : setting.value;
        this.audio.setSetting(setting.dataset.setting, value);
        if (setting.dataset.setting === 'graphics') this.setGraphicsQuality(value);
        if (setting.dataset.setting === 'camera-shake') {
          this.cameraShakeEnabled = Boolean(value);
          this.save.data.settings.cameraShake = this.cameraShakeEnabled;
          this.save.write();
        }
        if (setting.dataset.setting === 'touch-controls') this.setTouchControls(value);
        if (setting.dataset.setting === 'high-contrast' || setting.dataset.setting === 'large-ui') {
          const key = setting.dataset.setting === 'high-contrast' ? 'highContrast' : 'largeUI';
          this.save.data.settings[key] = Boolean(value); document.documentElement.classList.toggle(setting.dataset.setting === 'high-contrast' ? 'high-contrast-mode' : 'large-ui-mode', Boolean(value)); this.save.write();
        }
        if (setting.dataset.setting.endsWith('-volume')) {
          const output = document.querySelector(`#${setting.id}-value`);
          if (output) output.textContent = `${value}%`;
        }
      }, options);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.pause();
        this.lastTime = 0; this.accumulator = 0;
      }, options);
      window.addEventListener('blur', () => this.pause(), options);
      ui.canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault(); this.contextLost = true; this.pause();
        this.ui.toast('GRAPHICS PAUSED · RESTORING THE TEMPLE', 30);
      }, options);
      ui.canvas.addEventListener('webglcontextrestored', () => {
        this.contextLost = false; this.lastTime = 0;
        this.ui.toast('THE TEMPLE IS RESTORED · PRESS CONTINUE', 3);
      }, options);
      this.resize();
      this.reset();
      this.transition(STATES.MENU);
      if (!this.save.data.seenIntro) this.ui.modal('welcome', true);
      this.frameId = requestAnimationFrame(this.boundFrame);
    }
    createDebugOverlay() {
      this.debugNode = document.createElement('pre');
      this.debugNode.className = 'ember-debug-overlay';
      this.debugNode.setAttribute('aria-hidden', 'true');
      document.body.append(this.debugNode);
      window.__emberTempleResetSave = () => { try { localStorage.removeItem(this.save.key); location.reload(); } catch (_) {} };
    }
    updateDebug(dt) {
      if (!this.debugNode) return;
      this.debugClock = (this.debugClock || 0) - dt;
      if (this.debugClock > 0) return;
      this.debugClock = 0.5;
      let activeObjects = 0;
      this.scene.traverse(node => { if (node.visible) activeObjects++; });
      const info = this.renderer.info;
      this.debugNode.textContent = `FPS ${(1 / Math.max(dt, 0.001)).toFixed(0)}\nFRAME ${(dt * 1000).toFixed(1)}ms\nDRAW CALLS ${info.render.calls}\nTRIANGLES ${info.render.triangles}\nVISIBLE OBJECTS ${activeObjects}\nSEGMENTS ${this.track.segments.length}\nPARTICLES ${this.particles.count}`;
    }
    applySettingsToControls() {
      const settings = this.save.data.settings;
      const controls = {
        music: settings.music,
        sfx: settings.sfx,
        'music-volume': settings.musicVolume,
        'sfx-volume': settings.sfxVolume,
        graphics: settings.graphics,
        'camera-shake': settings.cameraShake,
        'touch-controls': settings.touchControls,
        'high-contrast': settings.highContrast,
        'large-ui': settings.largeUI,
      };
      for (const [name, value] of Object.entries(controls)) {
        const node = document.querySelector(`[data-setting="${name}"]`);
        if (!node) continue;
        if (node.type === 'checkbox') node.checked = Boolean(value);
        else node.value = String(value);
        if (node.type === 'range') {
          const output = document.querySelector(`#${node.id}-value`);
          if (output) output.textContent = `${value}%`;
        }
      }
      document.documentElement.classList.toggle('high-contrast-mode', settings.highContrast === true);
      document.documentElement.classList.toggle('large-ui-mode', settings.largeUI === true);
    }
    setGraphicsQuality(value, persist = true) {
      if (!['low', 'medium', 'high'].includes(value)) value = 'high';
      this.graphicsQuality = value;
      const quality = {
        low: { pixelRatio: 1, shadows: false, particles: 0.42, shadowMap: 512 },
        medium: { pixelRatio: 1.35, shadows: true, particles: 0.7, shadowMap: 768 },
        high: { pixelRatio: 1.7, shadows: true, particles: 1, shadowMap: 1024 },
      }[value];
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.pixelRatio));
      if (this.assets) this.assets.detailScale = value === 'low' ? 0.55 : value === 'medium' ? 0.8 : 1;
      this.renderer.shadowMap.enabled = quality.shadows;
      if (this.environment && this.environment.sun) {
        this.environment.sun.castShadow = quality.shadows;
        this.environment.sun.shadow.mapSize.set(quality.shadowMap, quality.shadowMap);
      }
      if (this.particles) this.particles.setQuality(quality.particles);
      if (persist) {
        this.save.data.settings.graphics = value;
        this.save.write();
      }
    }
    setTouchControls(value, persist = true) {
      if (!['auto', 'on', 'off'].includes(value)) value = 'auto';
      this.touchControls = value;
      const node = document.querySelector('#touch-controls');
      if (node) {
        const coarse = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : 'ontouchstart' in window;
        node.hidden = value === 'off' || (value === 'auto' && !coarse);
      }
      if (persist) {
        this.save.data.settings.touchControls = value;
        this.save.write();
      }
    }
    resize() {
      const rect = this.ui.canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width || innerWidth), height = Math.max(1, rect.height || innerHeight);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    }
    characterStats() { return CHARACTERS[this.save.data.selectedCharacter] || CHARACTERS.explorer; }
    upgradeLevel(name) { return clamp(Number(this.save.data.upgrades[name]) || 0, 0, UPGRADE_INFO[name] ? UPGRADE_INFO[name].cap : 5); }
    jumpVelocity() { return CONFIG.jumpVelocity * this.characterStats().jump * (1 + this.upgradeLevel('jump') * 0.035); }
    powerDuration(type) { return POWER_INFO[type].duration * this.characterStats().power * (1 + this.upgradeLevel('duration') * 0.06 + (type === 'shield' ? this.upgradeLevel('shield') * 0.07 : 0)); }
    runDistance() { return Math.max(0, this.distance - (this.startDistance || 0)); }
    hitFeedback(duration = 0.16) { this.impactTime = Math.max(this.impactTime, duration); }
    reset(mode = this.mode) {
      this.mode = mode || 'endless';
      this.adventureIndex = clamp(this.save.data.adventureLevel || 0, 0, ADVENTURE_LEVELS.length - 1);
      this.startDistance = this.mode === 'adventure' ? ADVENTURE_LEVELS[this.adventureIndex].biome * CONFIG.segmentLength * 5 : 0;
      this.currentBiome = biomeForDistance(this.startDistance);
      this.objectiveText = this.mode === 'adventure' ? ADVENTURE_LEVELS[this.adventureIndex].objective : 'FOLLOW THE GOLD';
      this.distance = 0; this.score = 0; this.coins = 0; this.combo = 0;
      this.gems = 0; this.relics = 0; this.eventCount = 0; this.bossCompleted = 0;
      this.bestCombo = 0; this.comboTimer = 0; this.nearMisses = 0;
      this.speed = CONFIG.minSpeed; this.deathReason = ''; this.deathClock = 0;
      this.countdown = 3.05; this.lastCount = -1; this.countdownResume = false;
      this.savedRun = false; this.accumulator = 0;
      this.worldEvent = { type: '', label: '', time: 0 }; this.boss = { active: false, name: '', time: 0, duration: 0 };
      this.nextEventDistance = this.startDistance + (this.mode === 'adventure' ? 220 : 320);
      this.nextBossDistance = this.startDistance + (this.mode === 'adventure' ? 780 : 1100);
      this.eventCompleted = false; this.adventureSuccess = false; this.progressClock = 0;
      this.revivesRemaining = this.upgradeLevel('revive'); this.powerUses = 0; this.totalRunTime = 0; this.guardianEscapes = 0;
      this.impactTime = 0;
      this.saveClock = 5;
      for (const type of POWER_TYPES) this.powers[type] = 0;
      this.input.clear(); this.player.applyCharacter(this.save.data.selectedCharacter, this.save.data.cosmetics); this.player.reset(); this.guardian.reset();
      this.particles.reset(); this.cameraRig.reset(); this.track.reset(randomSeed(), this.startDistance);
      this.distance = this.startDistance;
      this.currentBiome = this.track.biomeAt(this.distance); this.track.update(this.distance, this.time, this);
      this.ui.hudClock = 0;
    }
    transition(next) {
      this.state = next;
      this.ui.state(next);
      this.audio.setActive(next === STATES.RUNNING);
      this.accumulator = 0;
    }
    start(mode = this.mode || 'endless') {
      if (this.contextLost) return;
      this.save.data.seenIntro = true; this.save.write();
      this.ui.modal('welcome', false); this.ui.modal('progression', false);
      this.audio.unlock(); this.reset(mode); this.transition(STATES.COUNTDOWN);
      this.ui.text('countdownValue', '3');
      if (!this.ui.nodes.countdownValue) this.ui.text('countdown', '3');
    }
    pause() {
      if (this.state !== STATES.RUNNING && this.state !== STATES.COUNTDOWN) return;
      this.pausedFrom = this.state;
      this.transition(STATES.PAUSED); this.input.clear();
    }
    resume() {
      if (this.state !== STATES.PAUSED || this.contextLost) return;
      this.audio.unlock();
      this.countdown = 3.05; this.lastCount = -1; this.countdownResume = true;
      this.transition(STATES.COUNTDOWN); this.ui.text('countdownValue', '3');
      if (!this.ui.nodes.countdownValue) this.ui.text('countdown', '3');
    }
    menu() {
      if ((this.state === STATES.RUNNING || this.state === STATES.PAUSED || this.state === STATES.DYING) && !this.savedRun && this.runDistance() > 0) {
        this.save.finish(this); this.savedRun = true;
      }
      this.reset('endless'); this.transition(STATES.MENU);
      this.ui.text('best', this.save.data.best.toLocaleString());
    }
    action(action, meta = {}) {
      const aliases = {
        'start-game': 'start-endless', 'pause-game': 'pause', 'resume-game': 'resume',
        'restart-game': 'restart', 'return-menu': 'menu', 'toggle-mute': 'mute',
        'open-help': 'help', 'close-help': 'close-help',
        'open-settings': 'settings', 'close-settings': 'close-settings',
      };
      action = aliases[action] || action;
      if (action === 'pause') {
        for (const modal of ['progression', 'help', 'settings', 'welcome']) {
          if (this.ui.nodes[modal] && !this.ui.nodes[modal].hidden) { this.ui.modal(modal, false); return; }
        }
      }
      if (action === 'dismiss-welcome') { this.save.data.seenIntro = true; this.save.write(); this.ui.modal('welcome', false); return; }
      if (this.ui.activeModal() && meta && meta.fromKeyboard && ['start', 'start-endless', 'play', 'restart', 'retry', 'jump'].includes(action)) return;
      if (action === 'start-adventure') { this.start('adventure'); return; }
      if (action === 'start-endless' || action === 'start' || action === 'play') {
        if (this.state === STATES.PAUSED) this.resume();
        else if (this.state === STATES.MENU || this.state === STATES.OVER) this.start('endless');
        return;
      }
      const progressionSections = { 'open-characters': 'characters', 'open-upgrades': 'upgrades', 'open-collection': 'collection', 'open-missions': 'missions', 'open-achievements': 'achievements', 'open-leaderboard': 'leaderboard' };
      if (progressionSections[action]) { if (this.state === STATES.RUNNING || this.state === STATES.COUNTDOWN) this.pause(); this.ui.openProgression(progressionSections[action], this.save); return; }
      if (action === 'close-progression') { this.ui.modal('progression', false); return; }
      if (action === 'select-character') {
        if (this.save.data.unlockedCharacters.includes(meta.character)) { this.save.data.selectedCharacter = meta.character; this.save.write(); this.ui.toast(`${CHARACTERS[meta.character].name.toUpperCase()} SELECTED`, 1.5); this.ui.renderProgression(this.save); }
        return;
      }
      if (action === 'cycle-cosmetic') {
        const slot = meta.cosmetic, options = COSMETIC_STYLES[slot];
        if (options) { const current = options.findIndex(option => option.id === this.save.data.cosmetics[slot]); this.save.data.cosmetics[slot] = options[(current + 1) % options.length].id; this.save.write(); this.player.applyCharacter(this.save.data.selectedCharacter, this.save.data.cosmetics); this.ui.renderProgression(this.save); }
        return;
      }
      if (action === 'unlock-character') {
        const character = CHARACTERS[meta.character];
        if (character && !this.save.data.unlockedCharacters.includes(meta.character) && this.save.spendCoins(character.cost)) { this.save.data.unlockedCharacters.push(meta.character); this.save.write(); this.ui.toast(`${character.name.toUpperCase()} UNLOCKED`, 2); this.ui.renderProgression(this.save); }
        else this.ui.toast('MORE TREASURE NEEDED', 1.3);
        return;
      }
      if (action === 'buy-upgrade') { this.buyUpgrade(meta.upgrade); return; }
      if (action === 'claim-mission') { this.claimMission(meta.mission); return; }
      if (action === 'claim-daily') { this.claimDaily(); return; }
      if (action === 'mute' || action === 'sound') { this.audio.toggle(); this.ui.updateMute(this.audio.muted); return; }
      if (action === 'help') { if (this.state === STATES.RUNNING || this.state === STATES.COUNTDOWN) this.pause(); this.ui.modal('help', true); return; }
      if (action === 'close-help') { this.ui.modal('help', false); return; }
      if (action === 'settings') { if (this.state === STATES.RUNNING || this.state === STATES.COUNTDOWN) this.pause(); this.ui.modal('settings', true); return; }
      if (action === 'close-settings') { this.ui.modal('settings', false); return; }
      if (action === 'menu' || action === 'home') { this.menu(); return; }
      if (action === 'pause') {
        if (this.state === STATES.PAUSED) this.resume(); else this.pause();
        return;
      }
      if (action === 'resume') { this.resume(); return; }
      if (action === 'restart' || action === 'retry') { this.start(this.mode); return; }
      if (this.state === STATES.MENU && action === 'jump') { this.start(); return; }
      if (this.ui.activeModal()) return;
      if (this.state !== STATES.RUNNING) return;
      if (action === 'left') this.player.move(-1);
      else if (action === 'right') this.player.move(1);
      else if (action === 'jump') this.player.jump();
      else if (action === 'slide') { this.player.slide(); this.audio.sfx('slide'); }
    }
    performParkour(type) {
      const effects = { wallrun: ['WALL RUN', 0x58e5dc], vine: ['VINE SWING', 0x6bdc9a], zipline: ['ZIPLINE', 0xffd15b], platform: ['PLATFORM JUMP', 0xb466ff] };
      const [label, color] = effects[type] || ['PARKOUR', 0x8ee8ff];
      this.player.invulnerable = Math.max(this.player.invulnerable, type === 'platform' ? 0.65 : 1.15);
      if (type === 'platform' && this.player.grounded) this.player.jump();
      this.addScore(type === 'zipline' ? 180 : 100); this.combo++; this.comboTimer = 2.8 + this.upgradeLevel('combo') * 0.18; this.cameraRig.shake = Math.max(this.cameraRig.shake, 0.12);
      this.particles.emit(this.player.x, this.player.y + 1, 0, color, 22, 3.5, -1); this.audio.sfx('near'); this.ui.toast(`${label} · +${type === 'zipline' ? 180 : 100}`, 1.2);
    }
    buyUpgrade(id) {
      const info = UPGRADE_INFO[id], level = this.upgradeLevel(id);
      if (!info || level >= info.cap) return;
      const cost = Math.floor(info.base * (level + 1) ** 1.18);
      if (!this.save.spendCoins(cost)) { this.ui.toast('MORE TREASURE NEEDED', 1.3); return; }
      this.save.data.upgrades[id] = level + 1; this.save.write(); this.ui.toast(`${info.label} LEVEL ${level + 1}`, 1.4); this.ui.renderProgression(this.save);
    }
    claimMission(id) {
      const mission = MISSION_DEFS.find(item => item.id === id), item = this.save.data.missions[id];
      if (!mission || !item || item.claimed || item.progress < mission.target) return;
      item.claimed = true; this.save.data.coins += mission.reward; this.save.awardXP(mission.reward); this.save.write(); this.ui.toast(`MISSION COMPLETE · +${mission.reward} COINS`, 2); this.ui.renderProgression(this.save);
    }
    claimDaily() {
      const daily = this.save.data.daily;
      if (!daily || daily.claimed || daily.progress < daily.target) return;
      daily.claimed = true; daily.lastReward = new Date().toISOString(); this.save.data.coins += daily.reward; this.save.awardXP(daily.reward); this.save.write(); this.ui.toast(`DAILY REWARD · +${daily.reward} COINS`, 2); this.ui.renderProgression(this.save);
    }
    recordAction(type, amount = 1) {
      const values = { distance: this.runDistance(), coins: this.save.data.totalCoins + this.coins, near: this.nearMisses, powers: this.powerUses || 0, relics: this.save.data.relics + this.relics, guardian: this.guardianEscapes || 0, time: this.totalRunTime || 0, biomes: this.save.data.visitedBiomes.length };
      if (type === 'enemy' || type === 'enemyDodge') values.near += type === 'enemyDodge' ? 1 : 0;
      for (const mission of MISSION_DEFS) {
        const item = this.save.data.missions[mission.id];
        if (!item || item.claimed) continue;
        if (mission.type === type || (mission.type === 'coins' && type === 'coins') || (mission.type === 'near' && (type === 'near' || type === 'enemyDodge'))) item.progress = Math.max(item.progress, Math.min(mission.target, values[mission.type] || amount));
      }
      const daily = this.save.data.daily;
      if (daily && daily.type === type) {
        if (daily.id === 'dailyCoins') {
          if (this.powerUses === 0) daily.progress = Math.max(daily.progress, Math.min(daily.target, this.coins));
        } else {
          daily.progress = Math.max(daily.progress, Math.min(daily.target, values[type] || amount));
        }
      }
      for (const achievement of ACHIEVEMENT_DEFS) {
        const item = this.save.data.achievements[achievement.id];
        if (!item || item.unlocked) continue;
        const value = values[achievement.type] || 0;
        item.progress = Math.max(item.progress, Math.min(achievement.target, value));
        if (item.progress >= achievement.target) { item.unlocked = true; this.save.data.coins += 150; this.save.write(); this.ui.toast(`ACHIEVEMENT · ${achievement.label}`, 2); }
      }
    }
    scoreMultiplier() { return (this.powers.multiplier > 0 ? 2 : 1) * (1 + Math.min(4, Math.floor(this.combo / 12)) * 0.25); }
    addScore(amount) { this.score += amount * this.scoreMultiplier(); }
    collectCoin(x, y, z, coin = { kind: 'gold' }) {
      this.coins++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.comboTimer = 2.6 + this.upgradeLevel('combo') * 0.18;
      const values = { gold: 25, gem: 90, crystal: 260, relic: 1000 }, colors = { gold: 0xffd37d, gem: 0x52d9ff, crystal: 0xd957ff, relic: 0xfff0a6 };
      if (coin.kind === 'gem') this.gems++;
      if (coin.kind === 'crystal' || coin.kind === 'relic') this.relics += coin.kind === 'relic' ? 1 : 0;
      this.addScore((values[coin.kind] || values.gold) * (1 + this.upgradeLevel('coinValue') * 0.08)); this.audio.sfx('coin', this.combo);
      this.particles.emit(x, y, z, colors[coin.kind] || colors.gold, coin.kind === 'relic' ? 18 : 5, 2.5, 2);
      this.recordAction(coin.kind === 'relic' ? 'relics' : 'coins');
      if (coin.kind === 'relic') this.ui.toast('ANCIENT RELIC RECOVERED', 2);
      if (this.combo % 25 === 0) this.ui.toast(`${this.combo} COIN CHAIN · THE EMBER GROWS`, 1.6);
    }
    nearMiss() {
      this.nearMisses++; this.addScore(75);
      this.guardian.threat = clamp(this.guardian.threat - 0.08, 0.08, 1);
      this.recordAction('near');
      this.audio.sfx('near'); this.cameraRig.shake = Math.max(this.cameraRig.shake, 0.1);
      this.ui.toast('CLOSE CALL +75', 0.9);
    }
    grantPower(type) {
      this.powers[type] = Math.min(this.powers[type] + this.powerDuration(type), this.powerDuration(type) * 1.5);
      this.powerUses = (this.powerUses || 0) + 1; this.recordAction('powers');
      this.audio.sfx('power'); this.addScore(100);
      this.particles.emit(this.player.x, this.player.y + 1, 0, POWER_INFO[type].color, 24, 4, -1);
      this.ui.toast(`${POWER_INFO[type].icon} ${POWER_INFO[type].label} AWAKENED`, 2);
      if (type === 'burst') {
        this.player.invulnerable = Math.max(this.player.invulnerable, 0.6);
        if (this.player.y < 0) { this.player.y = 0; this.player.vy = 0; }
      }
      if (type === 'coinStorm') {
        for (let n = 0; n < 12; n++) {
          const coinDistance = this.distance + 5 + n * 2.2;
          const segment = this.track.segments.find(item => item.start <= coinDistance && item.start + CONFIG.segmentLength >= coinDistance);
          if (segment) this.track.addCoin(segment, CONFIG.lanes[this.player.lane], 1.2 + Math.sin(n / 11 * Math.PI) * 0.6, coinDistance);
        }
      }
    }
    enemyHit(type) {
      if (this.characterStats().resistance > 0 && this.powers.shield <= 0) {
        this.powers.shield = this.powerDuration('shield') * 0.45; this.player.invulnerable = 1.1; this.guardian.threat = clamp(this.guardian.threat + 0.12, 0, 1); this.hitFeedback(0.18); this.ui.toast('WARRIOR RESOLVE · HIT ABSORBED', 1.4); return;
      }
      this.guardian.threat = clamp(this.guardian.threat + 0.24, 0, 1); this.combo = 0; this.cameraRig.shake = 0.4; this.hitFeedback(0.24); this.ui.toast(`${type.toUpperCase()} ATTACK`, 1); this.die(`The ${type} caught your trail.`);
    }
    die(reason) {
      if (this.state !== STATES.RUNNING) return;
      const canRevive = this.powers.phoenix > 0 || this.revivesRemaining > 0;
      if (canRevive) {
        if (this.powers.phoenix > 0) this.powers.phoenix = 0; else this.revivesRemaining--;
        this.player.y = 0; this.player.vy = this.jumpVelocity() * 0.72; this.player.grounded = false; this.player.invulnerable = 2;
        this.guardian.threat = 0.4; this.combo = 0; this.cameraRig.shake = 0.55; this.particles.emit(this.player.x, 1, 0, POWER_INFO.phoenix.color, 36, 5, -2); this.audio.sfx('shield'); this.ui.toast('PHOENIX RESCUE · KEEP RUNNING', 2); return;
      }
      // A shield also bridges a failed jump, giving a usable escape window.
      if (this.player.y < -3 && this.powers.shield > 0) {
        this.powers.shield = 0; this.powers.burst = Math.max(this.powers.burst, 1.7);
        this.player.y = 0; this.player.vy = this.jumpVelocity() * 0.65;
        this.player.grounded = false; this.player.invulnerable = 1.5;
        this.player.updateBounds(); this.audio.sfx('shield');
        this.ui.toast('SHIELD RESCUE · REACH SOLID GROUND');
        return;
      }
      this.deathReason = reason; this.deathClock = 0; this.hitFeedback(0.32);
      this.player.dead = true; this.cameraRig.shake = 0.8;
      this.audio.sfx('hit');
      this.particles.emit(this.player.x, Math.max(0.2, this.player.y + 1), 0, 0xff9d63, 40, 7, 8);
      this.transition(STATES.DYING);
      if (navigator.vibrate) { try { navigator.vibrate([60, 30, 100]); } catch (_) {} }
    }
    triggerWorldEvent() {
      const biome = this.currentBiome;
      const options = biome === 1 ? [['rain', 'TROPICAL DOWNPOUR'], ['quake', 'TEMPLE COLLAPSE']] : biome === 2 ? [['wave', 'WATER SURGE'], ['storm', 'RIVER STORM']] : biome === 3 ? [['crystal', 'CRYSTAL CAVE-IN'], ['storm', 'MAGIC STORM']] : biome === 4 ? [['lava', 'LAVA ERUPTION'], ['quake', 'VOLCANIC QUAKE']] : biome === 5 ? [['bridge', 'SKY BRIDGE COLLAPSE'], ['storm', 'SKY STORM']] : biome === 6 ? [['mist', 'MOONLIT MIST'], ['guardian', 'GUARDIAN ATTACK']] : [['quake', 'ANCIENT EARTHQUAKE'], ['storm', 'TEMPLE STORM']];
      const [type, label] = options[Math.floor(this.time * 10) % options.length];
      this.worldEvent = { type, label, time: type === 'guardian' ? 8 : 6 };
      this.eventCount++; this.eventCompleted = true; this.guardian.threat = clamp(this.guardian.threat + (type === 'guardian' ? 0.18 : 0.04), 0, 1);
      this.cameraRig.shake = type === 'quake' || type === 'collapse' || type === 'lava' ? 0.6 : 0.2;
      this.ui.toast(label, 2.5);
      if (this.mode === 'adventure' && ADVENTURE_LEVELS[this.adventureIndex].type === 'event') this.objectiveText = 'SURVIVE THE EVENT';
    }
    triggerBoss() {
      const names = ['THE STONE TITAN', 'THE FIRE SERPENT', 'THE CRYSTAL GUARDIAN', 'THE ASHBOUND'];
       this.boss = { active: true, name: names[this.currentBiome % names.length], time: 16, duration: 16, attackClock: 2.2, warning: 0 };
      this.nextBossDistance += 1250; this.cameraRig.shake = 0.4; this.ui.toast(`BOSS ENCOUNTER · ${this.boss.name}`, 3);
    }
    updateWorld(dt) {
      if (this.worldEvent.time > 0) {
        this.worldEvent.time -= dt;
        if (this.worldEvent.type === 'quake' || this.worldEvent.type === 'lava' || this.worldEvent.type === 'collapse') this.cameraRig.shake = Math.max(this.cameraRig.shake, 0.18);
        if (this.worldEvent.type === 'rain' || this.worldEvent.type === 'storm' || this.worldEvent.type === 'mist') this.particles.emit((Math.random() - 0.5) * 14, Math.random() * 4 + 1, -Math.random() * 32, this.worldEvent.type === 'rain' ? 0x79dfff : 0xb18cff, 2, 1.2, -0.2);
        if (this.worldEvent.type === 'lava') this.particles.emit((Math.random() - 0.5) * 10, 0.2, -Math.random() * 28, 0xff5430, 4, 2.4, 2);
      }
      if (this.boss.active) {
        this.boss.time -= dt; this.boss.attackClock -= dt; this.boss.warning = Math.max(0, this.boss.warning - dt); this.cameraRig.shake = Math.max(this.cameraRig.shake, 0.04);
        if (this.boss.warning <= 0 && this.boss.attackClock <= 0) {
          this.boss.warning = 1.2; this.boss.attackClock = 3.4; this.cameraRig.shake = Math.max(this.cameraRig.shake, 0.18); this.ui.toast(`${this.boss.name} ATTACK INCOMING`, 1.1);
        }
        if (Math.random() < dt * 3) this.particles.emit((Math.random() - 0.5) * 8, 1 + Math.random() * 3, -8 - Math.random() * 20, this.currentBiome === 4 ? 0xff4b2b : 0xb466ff, 3, 2, 2);
        if (this.boss.time <= 0) { this.boss.active = false; this.boss.warning = 0; this.bossCompleted++; this.guardianEscapes++; this.guardian.threat = clamp(this.guardian.threat - 0.25, 0.1, 1); this.addScore(500); this.recordAction('guardian'); this.ui.toast(`${this.boss.name} SURVIVED · +500`, 2.2); }
      }
      if (this.mode === 'adventure' && this.adventureIndex < ADVENTURE_LEVELS.length) {
        const level = ADVENTURE_LEVELS[this.adventureIndex], progress = this.runDistance();
        this.objectiveText = level.type === 'relic' ? `${level.objective.toUpperCase()} · ${this.relics}/${level.target}` : level.type === 'boss' ? `${level.objective.toUpperCase()} · ${this.bossCompleted}/${level.target}` : `${level.objective.toUpperCase()} · ${Math.floor(progress)}/${level.target}M`;
        if ((level.type === 'distance' && progress >= level.target) || (level.type === 'event' && this.eventCount > 0 && progress >= level.target) || (level.type === 'relic' && this.relics >= level.target) || (level.type === 'boss' && this.bossCompleted >= level.target)) this.completeAdventure(level);
      }
    }
    completeAdventure(level) {
      if (this.adventureSuccess) return;
      this.adventureSuccess = true; this.save.data.adventureCompleted = [...new Set([...this.save.data.adventureCompleted, level.id])];
      this.save.data.adventureLevel = clamp(this.adventureIndex + 1, 0, ADVENTURE_LEVELS.length - 1);
      if (level.biome + 1 < BIOMES.length) this.save.data.unlockedBiomes = [...new Set([...this.save.data.unlockedBiomes, level.biome + 1])];
      this.save.data.coins += level.reward; this.save.awardXP(level.reward); this.deathReason = `ADVENTURE COMPLETE · ${level.name}`; this.ui.toast(`${level.name.toUpperCase()} COMPLETE · +${level.reward} COINS`, 3); this.finish();
    }
    finish() {
      const record = !this.savedRun && this.save.finish(this);
      this.savedRun = true;
      this.ui.result(this, record);
      this.transition(STATES.OVER);
    }
    simulate(dt) {
      if (this.state === STATES.PAUSED || this.state === STATES.OVER) return;
      this.time += dt;
      this.impactTime = Math.max(0, this.impactTime - dt);
      let worldDelta = 0;
      if (this.state === STATES.COUNTDOWN) {
        this.countdown -= dt;
        const value = Math.ceil(Math.max(0, this.countdown - 0.05));
        if (value !== this.lastCount) {
          this.lastCount = value;
          this.ui.text('countdownValue', value > 0 ? String(value) : 'RUN');
          if (!this.ui.nodes.countdownValue) this.ui.text('countdown', value > 0 ? String(value) : 'RUN');
          this.audio.sfx(value > 0 ? 'count' : 'go');
        }
        if (this.countdown <= 0) {
          this.transition(STATES.RUNNING);
          this.ui.toast(this.countdownResume ? 'THE EMBER IS STILL YOURS' : 'FOLLOW THE GOLD · OUTRUN THE ASHBOUND', 2.5);
        }
        this.player.animate(dt, this);
      } else if (this.state === STATES.RUNNING) {
        for (const type of POWER_TYPES) this.powers[type] = Math.max(0, this.powers[type] - dt);
        this.totalRunTime += dt;
        this.saveClock -= dt;
        if (this.saveClock <= 0) { this.saveClock = 5; this.save.write(); }
        const difficulty = 1 - Math.exp(-this.distance / 1500);
        const baseSpeed = lerp(CONFIG.minSpeed, CONFIG.maxSpeed, difficulty);
        const character = this.characterStats();
        const boost = this.powers.burst > 0 ? 1.65 : this.powers.lightning > 0 ? 1.55 : this.powers.speed > 0 ? 1.25 : 1;
        const upgradeSpeed = 1 + this.upgradeLevel('speed') * 0.025;
        this.speed = damp(this.speed, baseSpeed * character.speed * upgradeSpeed * boost, 2.4, dt);
        worldDelta = this.speed * dt; this.distance += worldDelta;
        this.addScore(worldDelta * 4);
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 0;
        this.currentBiome = this.track.biomeAt(this.distance);
        if (!this.save.data.visitedBiomes.includes(this.currentBiome)) { this.save.data.visitedBiomes.push(this.currentBiome); this.save.data.unlockedBiomes = [...new Set([...this.save.data.unlockedBiomes, this.currentBiome])]; this.recordAction('biomes'); }
        if (this.currentBiome === 4 && this.save.data.daily.type === 'volcano') this.save.data.daily.progress = 1;
        this.track.update(this.distance, this.time, this);
        this.player.update(dt, this);
        if (this.state === STATES.RUNNING) this.track.interact(this, dt);
        if (this.state === STATES.RUNNING) {
          if (this.distance >= this.nextEventDistance) { this.triggerWorldEvent(); this.nextEventDistance += 300 + this.currentBiome * 18; }
          if (this.distance >= this.nextBossDistance && !this.boss.active) this.triggerBoss();
          this.progressClock -= dt;
          if (this.progressClock <= 0) { this.progressClock = 0.35; this.recordAction('distance'); this.recordAction('time'); }
        }
      } else if (this.state === STATES.DYING) {
        this.deathClock += dt;
        this.speed = damp(this.speed, 0, 3.6, dt);
        worldDelta = this.speed * dt; this.distance += worldDelta;
        this.track.update(this.distance, this.time, this);
        this.player.updateDeath(dt, this);
        if (this.deathClock > 1.15) this.finish();
      } else {
        this.player.phase += dt * 2;
        this.player.animate(dt, this);
        this.track.update(this.distance, this.time, this);
      }
      this.guardian.update(dt, this);
      this.updateWorld(dt);
      this.environment.update(dt, this);
      this.particles.update(dt, worldDelta);
      this.cameraRig.update(dt, this);
    }
    frame(now) {
      if (this.disposed) return;
      this.frameId = requestAnimationFrame(this.boundFrame);
      const dt = this.lastTime ? clamp((now - this.lastTime) / 1000, 0, 0.075) : 0;
      this.lastTime = now;
      this.input.consume(this.boundAction);
      if (!this.contextLost && !document.hidden) {
        this.accumulator += dt;
        let budget = 10;
        while (this.accumulator >= this.fixedStep && budget-- > 0) {
          this.accumulator -= this.fixedStep;
          this.simulate(this.fixedStep);
        }
        this.renderer.render(this.scene, this.camera);
       }
       this.ui.update(this, dt);
       if (this.ui.host) this.ui.host.classList.toggle('impact-flash', this.impactTime > 0);
       this.updateDebug(dt);
      this.audio.update(this.speed, this.track.biomeAt(this.distance));
    }
    dispose() {
      if (this.disposed) return;
       this.disposed = true; cancelAnimationFrame(this.frameId);
       this.controller.abort(); this.input.dispose(); this.audio.dispose();
       this.track.dispose(); this.player.dispose(this.scene); this.scene.remove(this.guardian.group); this.environment.dispose(this.scene); this.particles.dispose(); this.assets.dispose(); this.renderer.dispose();
       if (this.debugNode) this.debugNode.remove();
    }
  }

  async function bootstrap() {
    if (window.__emberTempleGame) return;
    const save = new SaveManager();
    const ui = new UI(save);
    try {
      ui.show('loading', true);
      const progress = $('#loading-progress');
      const percent = $('#loading-percent');
      if (progress) progress.value = 18;
      if (percent) percent.textContent = '18%';
      // Dynamic ES-module import also lets the UI explain a failed CDN request.
      THREE = await import(THREE_URL);
      if (progress) progress.value = 72;
      if (percent) percent.textContent = '72%';
      const game = new Game(ui, save);
      if (progress) progress.value = 100;
      if (percent) percent.textContent = '100%';
      ui.show('loading', false);
      window.__emberTempleGame = game;
      window.addEventListener('pagehide', event => { if (!event.persisted) game.dispose(); });
      // Useful for a host page without requiring any particular markup.
      window.dispatchEvent(new CustomEvent('ember-temple-ready', { detail: { game } }));
    } catch (error) {
      console.error('[Ember Temple] Unable to initialize:', error);
      ui.error('The temple could not open. Check your connection and enable WebGL / hardware acceleration, then reload this page.');
    }
  }

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap, { once: true });
    else bootstrap();
  }
})();
