import { useEffect } from "react";

/**
 * Runs a requestAnimationFrame loop on a <canvas>, handling sizing and resize/cleanup.
 *
 * `setup(ctx, getSize)` runs once when the canvas mounts — build your scene there (e.g. particle
 * positions) using the initial size — and must return a `draw(frame)` function that renders one
 * frame. `getSize()` always returns the *current* canvas size, so `draw` can react to resizes.
 */
export function useCanvasAnimation(canvasRef, setup) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const resize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener("resize", resize);

    const draw = setup(ctx, () => ({ width, height }));

    let animId;
    let frame = 0;
    const loop = () => {
      draw(frame);
      frame += 1;
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
    // Intentionally runs once on mount: `setup` builds the whole scene (particle
    // positions, etc.) up front, so re-running it on every render would reset the animation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
