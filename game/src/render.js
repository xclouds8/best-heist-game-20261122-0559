// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with deep water. The look is the Floating Lantern Heist: dark teal water with
// drifting lantern light, a plank bazaar deck, striped market stalls, amber
// vision cones, red camera sweeps, a glowing Golden Koi shrine and a jade-green
// escape boat. Safe cover, danger and loot are readable at a glance: stalls are
// warm wood, cones are amber, cameras are red, loot is gold and jade.

import { FIELD, FONT, PALETTE } from './config.js';
import { BOAT, LANTERNS, SHRINE } from './level.js';
import { ALARM_ALARM, ALARM_SUSPICIOUS } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'won';
export const SCREEN_DAWN = 'dawn';

const PANEL = { width: 640, top: 150, line: 32, bottom: 76 };
const MINIMAP = { x: 1064, y: 592, width: 192, height: 108 };
const GUARD_RADIUS = 15;

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0, ratio: 1 };
  const scoreLabel = cachedLabel('Score ');
  const jadeLabel = cachedLabel('Jade ');
  const coinLabel = cachedLabel('Coins ');
  const bestLabel = cachedLabel('Best ');
  const finalLabel = cachedLabel('Score ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.ratio = ratio;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  /** Client (CSS pixel) point to field coordinates, for click-to-move. */
  function toField(clientX, clientY) {
    return {
      x: (clientX * view.ratio - view.x) / view.scale,
      y: (clientY * view.ratio - view.y) / view.scale,
    };
  }

  function drawWater(state) {
    context.fillStyle = PALETTE.waterDeep;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    // Slow shimmering bands under the bazaar, drifting with the elapsed time.
    const t = state.elapsed;
    context.strokeStyle = PALETTE.waterShimmer;
    context.lineWidth = 2;
    context.globalAlpha = 0.35;
    for (let band = 0; band < 5; band += 1) {
      const y = 40 + band * 150 + Math.sin(t * 0.4 + band * 1.7) * 8;
      context.beginPath();
      for (let x = 0; x <= FIELD.width; x += 32) {
        const wave = y + Math.sin(x * 0.02 + t * 0.9 + band) * 5;
        if (x === 0) context.moveTo(x, wave);
        else context.lineTo(x, wave);
      }
      context.stroke();
    }
    context.globalAlpha = 1;
    // Lantern reflections: warm vertical smears under each hanging lantern.
    for (const lantern of LANTERNS) {
      const flicker = 0.5 + Math.sin(t * 2.1 + lantern.x * 0.05) * 0.12;
      const gradient = context.createRadialGradient(lantern.x, lantern.y + 26, 2, lantern.x, lantern.y + 26, 46);
      gradient.addColorStop(0, `rgba(255, 179, 71, ${0.28 * flicker})`);
      gradient.addColorStop(1, 'rgba(255, 179, 71, 0)');
      context.fillStyle = gradient;
      context.fillRect(lantern.x - 48, lantern.y - 22, 96, 96);
    }
  }

  function drawDeck() {
    context.fillStyle = PALETTE.deck;
    context.fillRect(40, 80, 1200, 600);
    context.strokeStyle = PALETTE.deckPlank;
    context.lineWidth = 2;
    for (let x = 100; x < 1240; x += 60) {
      context.beginPath();
      context.moveTo(x, 80);
      context.lineTo(x, 680);
      context.stroke();
    }
    for (let y = 140; y < 680; y += 60) {
      context.beginPath();
      context.moveTo(40, y);
      context.lineTo(1240, y);
      context.stroke();
    }
    context.strokeStyle = PALETTE.deckEdge;
    context.lineWidth = 6;
    context.strokeRect(40, 80, 1200, 600);
  }

  function drawCone(x, y, angle, range, halfAngle, fill, edge) {
    context.beginPath();
    context.moveTo(x, y);
    context.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    context.closePath();
    context.fillStyle = fill;
    context.fill();
    context.strokeStyle = edge;
    context.lineWidth = 1.5;
    context.stroke();
  }

  function drawStalls(state) {
    for (const stall of state.stalls) {
      context.fillStyle = PALETTE.stallWood;
      context.fillRect(stall.x, stall.y, stall.width, stall.height);
      context.fillStyle = PALETTE.stallRoof;
      context.fillRect(stall.x - 6, stall.y - 12, stall.width + 12, 20);
      context.fillStyle = PALETTE.stallRoofDark;
      context.fillRect(stall.x - 6, stall.y + 8, stall.width + 12, 4);
      context.fillStyle = PALETTE.stallCloth;
      context.fillRect(stall.x + 8, stall.y + stall.height - 16, stall.width - 16, 12);
      text(stall.name, stall.x + stall.width / 2, stall.y + stall.height / 2 + 5, 13, PALETTE.text, 'center');
    }
  }

  function drawShrine(state) {
    const t = state.elapsed;
    const pulse = 0.7 + Math.sin(t * 2.4) * 0.3;
    const glow = context.createRadialGradient(SHRINE.x, SHRINE.y, 4, SHRINE.x, SHRINE.y, 90);
    glow.addColorStop(0, `rgba(245, 197, 66, ${0.5 * pulse})`);
    glow.addColorStop(1, 'rgba(245, 197, 66, 0)');
    context.fillStyle = glow;
    context.fillRect(SHRINE.x - 92, SHRINE.y - 92, 184, 184);
    // The shrine: a little red pavilion on a stone base.
    context.fillStyle = '#5d2a2a';
    context.fillRect(SHRINE.x - 40, SHRINE.y - 8, 80, 34);
    context.fillStyle = PALETTE.stallRoof;
    context.beginPath();
    context.moveTo(SHRINE.x - 48, SHRINE.y - 8);
    context.lineTo(SHRINE.x, SHRINE.y - 34);
    context.lineTo(SHRINE.x + 48, SHRINE.y - 8);
    context.closePath();
    context.fill();
    if (!state.hasKoi) {
      // The Golden Koi itself, circling its bowl.
      const swim = t * 1.4;
      const kx = SHRINE.x + Math.cos(swim) * 16;
      const ky = SHRINE.y + 8 + Math.sin(swim * 2) * 4;
      context.fillStyle = PALETTE.goldBright;
      context.beginPath();
      context.ellipse(kx, ky, 13, 7, Math.sin(swim) * 0.5, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(kx - 12, ky);
      context.lineTo(kx - 20, ky - 6);
      context.lineTo(kx - 20, ky + 6);
      context.closePath();
      context.fill();
      context.fillStyle = '#7a5b00';
      context.beginPath();
      context.arc(kx + 5, ky - 1, 1.8, 0, Math.PI * 2);
      context.fill();
      text('THE GOLDEN KOI', SHRINE.x, SHRINE.y - 44, 15, PALETTE.goldBright, 'center');
      if (state.koiProgress > 0) {
        context.strokeStyle = PALETTE.goldBright;
        context.lineWidth = 4;
        context.beginPath();
        context.arc(SHRINE.x, SHRINE.y + 8, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * state.koiProgress);
        context.stroke();
      }
    } else {
      text('THE KOI IS YOURS — RUN!', SHRINE.x, SHRINE.y - 44, 15, PALETTE.jade, 'center');
    }
  }

  function drawBoat(state) {
    const bob = Math.sin(state.elapsed * 1.1) * 2;
    context.fillStyle = '#1d3a2e';
    context.beginPath();
    context.moveTo(BOAT.x - BOAT.width / 2 - 8, BOAT.y + bob);
    context.lineTo(BOAT.x + BOAT.width / 2 + 8, BOAT.y + bob);
    context.lineTo(BOAT.x + BOAT.width / 2 - 14, BOAT.y + BOAT.height + bob);
    context.lineTo(BOAT.x - BOAT.width / 2 + 14, BOAT.y + BOAT.height + bob);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.jadeDark;
    context.fillRect(BOAT.x - BOAT.width / 2, BOAT.y - 6 + bob, BOAT.width, 8);
    text(state.hasKoi ? 'ESCAPE BOAT — GO!' : 'ESCAPE BOAT', BOAT.x, BOAT.y - 14 + bob, 14, state.hasKoi ? PALETTE.jade : PALETTE.muted, 'center');
  }

  function drawLoot(state) {
    for (const jade of state.jades) {
      if (jade.taken) continue;
      const t = state.elapsed;
      const bob = Math.sin(t * 2 + jade.x) * 2;
      context.fillStyle = PALETTE.jade;
      context.beginPath();
      context.moveTo(jade.x, jade.y - 12 + bob);
      context.lineTo(jade.x + 9, jade.y + bob);
      context.lineTo(jade.x, jade.y + 12 + bob);
      context.lineTo(jade.x - 9, jade.y + bob);
      context.closePath();
      context.fill();
      context.fillStyle = 'rgba(255,255,255,0.7)';
      context.beginPath();
      context.moveTo(jade.x, jade.y - 7 + bob);
      context.lineTo(jade.x + 4, jade.y + bob);
      context.lineTo(jade.x, jade.y + 7 + bob);
      context.lineTo(jade.x - 4, jade.y + bob);
      context.closePath();
      context.fill();
    }
    for (const coin of state.coins) {
      if (coin.taken) continue;
      context.fillStyle = PALETTE.gold;
      context.beginPath();
      context.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.goldBright;
      context.beginPath();
      context.arc(coin.x, coin.y, 3, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawGuards(state) {
    for (const guard of state.guards) {
      drawCone(guard.x, guard.y, guard.angle, 225, 0.61, PALETTE.cone, PALETTE.coneEdge);
    }
    for (const camera of state.cameras) {
      drawCone(camera.x, camera.y, camera.angle, 245, 0.52, PALETTE.cameraCone, PALETTE.cameraConeEdge);
    }
    for (const camera of state.cameras) {
      // The brass lantern-camera on its pole.
      context.strokeStyle = '#8a6d3b';
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(camera.x, camera.y + 8);
      context.lineTo(camera.x, camera.y + 26);
      context.stroke();
      context.fillStyle = '#b08d3e';
      context.beginPath();
      context.arc(camera.x, camera.y, 11, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#ff5c5c';
      context.beginPath();
      context.arc(camera.x + Math.cos(camera.angle) * 8, camera.y + Math.sin(camera.angle) * 8, 4, 0, Math.PI * 2);
      context.fill();
    }
    for (const guard of state.guards) {
      // A watchman silhouette: dark cloak, amber sash, wide-brimmed hat.
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.arc(guard.x, guard.y, GUARD_RADIUS, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.guardTrim;
      context.lineWidth = 2.5;
      context.beginPath();
      context.arc(guard.x, guard.y, GUARD_RADIUS - 2, 0, Math.PI * 2);
      context.stroke();
      context.fillStyle = PALETTE.guard;
      context.beginPath();
      context.ellipse(guard.x, guard.y - 3, 16, 5, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = guard.mode === 'chase' ? PALETTE.alarm : PALETTE.lanternGlow;
      context.beginPath();
      context.arc(guard.x + Math.cos(guard.angle) * 8, guard.y + Math.sin(guard.angle) * 8, 3.5, 0, Math.PI * 2);
      context.fill();
      if (guard.mode !== 'patrol') {
        text(guard.mode === 'chase' ? '!' : '?', guard.x, guard.y - 22, 20, guard.mode === 'chase' ? PALETTE.alarm : PALETTE.suspicious, 'center');
      }
      text(guard.name, guard.x, guard.y + 30, 11, PALETTE.muted, 'center');
    }
  }

  function drawThief(state) {
    const player = state.player;
    const blink = player.dashTimer > 0 ? 0.75 : 1;
    context.globalAlpha = blink;
    // A soft lantern glow the thief carries — the signature light of the heist.
    const glow = context.createRadialGradient(player.x, player.y, 4, player.x, player.y, 54);
    glow.addColorStop(0, 'rgba(255, 217, 138, 0.35)');
    glow.addColorStop(1, 'rgba(255, 217, 138, 0)');
    context.fillStyle = glow;
    context.fillRect(player.x - 56, player.y - 56, 112, 112);
    // Hooded cloak, pale mask, jade sash.
    context.fillStyle = PALETTE.thiefCoat;
    context.beginPath();
    context.moveTo(player.x, player.y - 15);
    context.lineTo(player.x + 13, player.y + 12);
    context.lineTo(player.x - 13, player.y + 12);
    context.closePath();
    context.fill();
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.arc(player.x, player.y - 6, 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = PALETTE.jade;
    context.fillRect(player.x - 8, player.y + 4, 16, 3);
    context.globalAlpha = 1;
    if (state.hasKoi) {
      context.fillStyle = PALETTE.goldBright;
      context.beginPath();
      context.ellipse(player.x + 12, player.y - 12, 8, 4, -0.5, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawSmoke(state) {
    if (!state.smoke.active) return;
    context.fillStyle = PALETTE.smoke;
    context.beginPath();
    context.arc(state.smoke.x, state.smoke.y, 90, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.35)';
    context.beginPath();
    context.arc(state.smoke.x - 30, state.smoke.y - 18, 34, 0, Math.PI * 2);
    context.arc(state.smoke.x + 28, state.smoke.y + 20, 30, 0, Math.PI * 2);
    context.fill();
  }

  function drawLanterns() {
    for (const lantern of LANTERNS) {
      context.strokeStyle = '#6b4e2e';
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(lantern.x, lantern.y - 14);
      context.lineTo(lantern.x, lantern.y - 4);
      context.stroke();
      context.fillStyle = PALETTE.lanternGlow;
      context.beginPath();
      context.ellipse(lantern.x, lantern.y + 4, 7, 10, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.lanternCore;
      context.beginPath();
      context.ellipse(lantern.x, lantern.y + 4, 3.5, 6, 0, 0, Math.PI * 2);
      context.fill();
    }
  }

  function alarmColor(state) {
    if (state.alarm === ALARM_ALARM) return PALETTE.alarm;
    if (state.alarm === ALARM_SUSPICIOUS) return PALETTE.suspicious;
    return PALETTE.calm;
  }

  function drawHud(state, best) {
    context.textBaseline = 'alphabetic';
    text(scoreLabel(state.score), 52, 38, 24, PALETTE.text, 'left');
    text(jadeLabel(state.collected) + '/5', 52, 64, 18, PALETTE.jade, 'left');
    text(coinLabel(state.coinCount), 150, 64, 18, PALETTE.gold, 'left');
    const minutes = Math.floor(state.timeLeft / 60);
    const seconds = Math.floor(state.timeLeft % 60);
    const timer = `${minutes}:${seconds < 10 ? '0' : ''}${seconds} to dawn`;
    text(timer, FIELD.width - 52, 38, 24, state.timeLeft < 30 ? PALETTE.alarm : PALETTE.text, 'right');
    text(state.hasKoi ? 'KOI STOLEN — REACH THE BOAT!' : 'Steal the Golden Koi, then reach the boat', FIELD.width - 52, 64, 16, state.hasKoi ? PALETTE.jade : PALETTE.muted, 'right');

    // The alarm meter: big, centred, impossible to miss.
    const barWidth = 300;
    const barX = (FIELD.width - barWidth) / 2;
    const barY = 14;
    context.fillStyle = 'rgba(4, 20, 26, 0.8)';
    context.fillRect(barX - 8, barY - 6, barWidth + 16, 52);
    context.strokeStyle = alarmColor(state);
    context.lineWidth = 2;
    context.strokeRect(barX - 8, barY - 6, barWidth + 16, 52);
    text('ALARM', barX + barWidth / 2, barY + 8, 13, alarmColor(state), 'center');
    context.fillStyle = '#12303c';
    context.fillRect(barX, barY + 14, barWidth, 12);
    context.fillStyle = alarmColor(state);
    context.fillRect(barX, barY + 14, (barWidth * state.detection) / 100, 12);
    const alarmName = state.alarm === ALARM_ALARM ? 'ALARM!' : state.alarm === ALARM_SUSPICIOUS ? 'SUSPICIOUS' : 'CALM';
    text(alarmName, barX + barWidth / 2, barY + 40, 12, alarmColor(state), 'center');

    // Tools, bottom left.
    const toolsY = FIELD.height - 66;
    context.fillStyle = 'rgba(4, 20, 26, 0.8)';
    context.fillRect(44, toolsY - 8, 330, 56);
    const smokeAfford = state.coinCount >= 25;
    const crackerAfford = state.coinCount >= 15;
    text('Q  Smoke lantern  25c', 56, toolsY + 14, 16, smokeAfford ? PALETTE.text : PALETTE.muted, 'left');
    text('E  Firecracker  15c', 56, toolsY + 38, 16, crackerAfford ? PALETTE.text : PALETTE.muted, 'left');
    text('Shift sneak · Space dash · P pause · M mute', 390, toolsY + 38, 14, PALETTE.muted, 'left');

    drawMinimap(state);
    void best;
  }

  function drawMinimap(state) {
    const scaleX = MINIMAP.width / FIELD.width;
    const scaleY = MINIMAP.height / FIELD.height;
    context.fillStyle = 'rgba(4, 20, 26, 0.85)';
    context.fillRect(MINIMAP.x - 6, MINIMAP.y - 6, MINIMAP.width + 12, MINIMAP.height + 12);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 1.5;
    context.strokeRect(MINIMAP.x - 6, MINIMAP.y - 6, MINIMAP.width + 12, MINIMAP.height + 12);
    context.fillStyle = PALETTE.deck;
    context.fillRect(MINIMAP.x, MINIMAP.y, MINIMAP.width, MINIMAP.height);
    for (const stall of state.stalls) {
      context.fillStyle = PALETTE.stallRoofDark;
      context.fillRect(MINIMAP.x + stall.x * scaleX, MINIMAP.y + stall.y * scaleY, stall.width * scaleX, stall.height * scaleY);
    }
    if (!state.hasKoi) {
      context.fillStyle = PALETTE.gold;
      context.fillRect(MINIMAP.x + SHRINE.x * scaleX - 3, MINIMAP.y + SHRINE.y * scaleY - 3, 6, 6);
    }
    context.fillStyle = PALETTE.jade;
    context.fillRect(MINIMAP.x + BOAT.x * scaleX - 4, MINIMAP.y + BOAT.y * scaleY - 2, 8, 4);
    for (const camera of state.cameras) {
      context.fillStyle = '#ff5c5c';
      context.beginPath();
      context.arc(MINIMAP.x + camera.x * scaleX, MINIMAP.y + camera.y * scaleY, 3, 0, Math.PI * 2);
      context.fill();
    }
    for (const guard of state.guards) {
      context.fillStyle = PALETTE.lanternGlow;
      context.beginPath();
      context.arc(MINIMAP.x + guard.x * scaleX, MINIMAP.y + guard.y * scaleY, 3.5, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = PALETTE.thief;
    context.beginPath();
    context.arc(MINIMAP.x + state.player.x * scaleX, MINIMAP.y + state.player.y * scaleY, 4, 0, Math.PI * 2);
    context.fill();
    text('MAP', MINIMAP.x, MINIMAP.y - 20, 12, PALETTE.muted, 'left');
  }

  function drawVignette(state) {
    if (state.detection <= 5) return;
    const strength = state.detection / 100;
    const gradient = context.createRadialGradient(
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.35,
      FIELD.width / 2, FIELD.height / 2, FIELD.height * 0.75,
    );
    gradient.addColorStop(0, 'rgba(255, 60, 60, 0)');
    gradient.addColorStop(1, `rgba(255, 60, 60, ${0.35 * strength})`);
    context.fillStyle = gradient;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function drawPanel(title, lines, prompt, accent) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(4, 20, 26, 0.88)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = accent || PALETTE.panelEdge;
    context.lineWidth = 3;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    // Long titles shrink to fit the panel instead of spilling over its edges.
    let titleSize = 46;
    context.font = `${titleSize}px ${FONT}`;
    while (titleSize > 24 && context.measureText(title).width > PANEL.width - 48) {
      titleSize -= 2;
      context.font = `${titleSize}px ${FONT}`;
    }
    text(title, FIELD.width / 2, y + 78, titleSize, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 20, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 22, PALETTE.lanternGlow, 'center');
  }

  const TITLE_LINES = [
    'A night bazaar on stilts. One Golden Koi. Three watchmen,',
    'two brass lantern-cameras, and an alarm that never sleeps.',
    'Sneak past the cones, grab the Koi, and reach the boat.',
    '',
    'Move: WASD / arrows, or click to walk · Shift: sneak',
    'Space: dash · Q: smoke lantern (25c) · E: firecracker (15c)',
    '',
    'Difficulty — press 1, 2 or 3 (or click):',
  ];

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, difficultyKey) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawWater(state);
    drawDeck();
    drawBoat(state);
    drawShrine(state);
    drawGuards(state);
    drawStalls(state);
    drawLanterns();
    drawLoot(state);
    drawSmoke(state);
    drawThief(state);
    drawVignette(state);
    if (screen === SCREEN_TITLE) {
      const lines = TITLE_LINES.slice();
      const difficulties = ['easy', 'normal', 'hard'];
      const names = { easy: '1 · Paper Lantern', normal: '2 · Festival Night', hard: '3 · Typhoon Watch' };
      for (const key of difficulties) {
        lines.push(`${difficultyKey === key ? '▶ ' : '   '}${names[key]}${difficultyKey === key ? ' ◀' : ''}`);
      }
      lines.push('');
      lines.push(bestLabel(best));
      drawPanel('THE FLOATING LANTERN HEIST', lines, 'Press Enter or click to begin');
      return;
    }
    drawHud(state, best);
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The watchmen wait. The lanterns sway.'], 'Press P to keep sneaking');
    } else if (screen === SCREEN_CAUGHT) {
      drawPanel(
        'CAUGHT!',
        [`${finalLabel(state.score)}  ·  ${bestLabel(best)}`, 'A watchman caught you under the lanterns.', 'The Koi stays in its shrine — for now.'],
        'Press R or click to try again',
        PALETTE.alarm,
      );
    } else if (screen === SCREEN_WIN) {
      const ghost = state.maxDetection < 40 ? 'Ghost bonus: never even suspected (+300)' : 'Spotted along the way — no ghost bonus';
      drawPanel(
        'THE KOI IS YOURS!',
        [`${finalLabel(state.score)}  ·  ${bestLabel(best)}`, `Jade looted: ${state.collected}/5 · Time to spare: ${Math.round(state.timeLeft)}s`, ghost],
        'Press R or click to steal it again',
        PALETTE.jade,
      );
    } else if (screen === SCREEN_DAWN) {
      drawPanel(
        'DAWN BREAKS',
        [`${finalLabel(state.score)}  ·  ${bestLabel(best)}`, 'The market wakes. The stalls open. The Koi stays.'],
        'Press R or click to try again',
        PALETTE.alarm,
      );
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
