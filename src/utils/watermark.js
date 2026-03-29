export function createUserWatermark(username) {
  const canvas = document.createElement('canvas');
  canvas.width = 300;
  canvas.height = 150;
  const ctx = canvas.getContext('2d');

  // Nearly invisible — visible only with image editing (brightness/contrast)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.008)';
  ctx.font = '11px Arial';
  ctx.rotate(-0.3);

  for (let y = 0; y < 150; y += 25) {
    for (let x = -50; x < 350; x += 120) {
      ctx.fillText(`PM:${username}`, x, y);
    }
  }

  return canvas.toDataURL();
}
