import './ui/style.css';
import { Game } from './game/game';
import { Chapter1, titleScene } from './data/chapter1';
import { Save } from './systems/save';
import { txDom } from './text/tx';

const $ = (id: string) => document.getElementById(id)!;

function boot() {
  txDom();
  let game: Game;
  try {
    game = new Game();
  } catch (err) {
    console.error(err);
    document.body.innerHTML = '<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#efe6d6;background:#0c0a10;font:16px system-ui">이 기기에서 그래픽을 시작할 수 없어요. 브라우저를 최신 버전으로 업데이트해 주세요.</div>';
    return;
  }
  game.run(Chapter1);
  game.toTitle(titleScene(game));
  (window as unknown as { game: Game }).game = game;

  let settingsBack: 'title' | 'pause' = 'title';
  const click = (id: string, fn: () => void) => $(id).addEventListener('click', (e) => { e.stopPropagation(); game.audio.unlock(); game.audio.play('select'); fn(); });
  click('btn-new', () => game.newGame());
  click('btn-continue', () => game.continueGame());
  click('btn-settings', () => { settingsBack = 'title'; game.ui.screen('settings'); });
  click('btn-pause-settings', () => { settingsBack = 'pause'; game.ui.screen('settings'); });
  click('btn-settings-back', () => game.ui.screen(settingsBack));
  click('btn-pause', () => game.pause());
  click('btn-resume', () => game.resume());
  click('btn-quit', () => { game.save(); game.toTitle(titleScene(game)); });
  click('btn-again', () => { Save.clear(); game.newGame(); });
  click('btn-end-title', () => game.toTitle(titleScene(game)));
  const toggle = (id: string, k: 'sfx' | 'music' | 'saver' | 'haptic') => click(id, () => { game.settings[k] = !game.settings[k]; Save.storeSettings(game.settings); game.applySettings(); if (k === 'music' && game.settings.music && game.state === 'title') game.audio.music('title'); });
  toggle('opt-sfx', 'sfx'); toggle('opt-music', 'music'); toggle('opt-saver', 'saver'); toggle('opt-haptic', 'haptic');
  click('opt-speed', () => { const sp = [0.6, 1, 1.8]; game.settings.textSpeed = sp[(sp.indexOf(game.settings.textSpeed) + 1) % 3]; Save.storeSettings(game.settings); game.applySettings(); });
  if (!('vibrate' in navigator)) $('opt-haptic').hidden = true;
  if (document.fullscreenEnabled && !matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) {
    $('opt-fullscreen').hidden = false;
    click('opt-fullscreen', async () => {
      try {
        if (!document.fullscreenElement) await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        await (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape');
      } catch { /* optional */ }
    });
  }
}
boot();

if (import.meta.env.PROD && 'serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
