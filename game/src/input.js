// DOCKLIGHT — keyboard and mouse. WASD or arrows to move, Shift (or C)
// to sneak, E to grab intel, R to restart the level, Esc for the menu,
// Enter to confirm on screens. Mouse clicks hit the on-screen buttons.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    moveX: 0,
    moveY: 0,
    sneak: false,
    // Callbacks the game loop wires up.
    onInteract: null,
    onRestart: null,
    onPause: null,
    onConfirm: null,
    onAnyKey: null,
    // Mouse position in canvas pixels, and a click queue the loop drains.
    mouseX: 0,
    mouseY: 0,
    clicks: [],
  };

  function refreshMove() {
    let x = 0;
    let y = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
    input.moveX = x;
    input.moveY = y;
    input.sneak = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyC');
  }

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(event.code);
    refreshMove();
    if (input.onAnyKey) input.onAnyKey();
    if (event.code === 'KeyE' && input.onInteract) input.onInteract();
    if (event.code === 'KeyR' && input.onRestart) input.onRestart();
    if (event.code === 'Escape' && input.onPause) input.onPause();
    if ((event.code === 'Enter' || event.code === 'Space') && input.onConfirm) input.onConfirm();
  });

  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
    refreshMove();
  });

  window.addEventListener('blur', () => {
    keys.clear();
    refreshMove();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * canvas.width;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * canvas.height;
  });

  canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    input.clicks.push({ x, y });
    if (input.onAnyKey) input.onAnyKey();
  });

  return input;
}
