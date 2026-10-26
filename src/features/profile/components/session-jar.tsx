import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { DeviceMotion } from 'expo-sensors';
import { Card } from '@/components/ui/card';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

export interface JarBall {
  id: string;
  radius: number;
  /** Programme sessions in the accent; anything else in the muted ink. */
  tone: 'lift' | 'other';
}

export const JAR_HEIGHT = 220;
/** Pixels per second squared at 1g. */
const G = 1600;
/** Velocity kept per frame: a little air, so the pile settles. */
const DAMP = 0.985;
/** Frames of near-stillness before the sim sleeps. */
const SLEEP_AFTER = 45;

/**
 * Every finished session as a ball in a jar, Up Bank style: the jar fills
 * over the peak, a new session drops in from the top, and tilting the
 * phone rolls the pile around. The point is that the collection is
 * physical, so showing up accumulates into something you can play with.
 *
 * Verlet integration on the UI thread (a Reanimated frame callback), three
 * relaxation passes of circle-circle and wall constraints per frame, drawn
 * as two Skia paths (one per tone) plus a highlight pass. The sim sleeps
 * once the pile is still and wakes on the next tilt, so an idle Profile
 * costs nothing. With no motion sensor (the simulator) gravity just points
 * down.
 */
export function SessionJar({ balls }: { balls: JarBall[] }) {
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const radii = useMemo(() => balls.map((b) => b.radius), [balls]);
  const isLift = useMemo(() => balls.map((b) => b.tone === 'lift'), [balls]);

  // Interleaved x, y per ball; `prev` is last frame's, for Verlet.
  const pos = useSharedValue<number[]>([]);
  const prev = useSharedValue<number[]>([]);
  const count = useSharedValue(0);
  const gravity = useSharedValue({ x: 0, y: 1 });
  const still = useSharedValue(0);

  // The frame callback sleeps itself (from the UI thread) and the seeding
  // and tilt effects wake it; a ref so both can be declared before it.
  const frameRef = useRef<{ setActive: (active: boolean) => void } | null>(null);
  function sleep() {
    frameRef.current?.setActive(false);
  }
  function wake() {
    still.set(0);
    frameRef.current?.setActive(true);
  }

  const frame = useFrameCallback((info) => {
    const n = count.get();
    if (n === 0 || width === 0) return;
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 1 / 30);
    const p = pos.get().slice();
    const q = prev.get().slice();
    const g = gravity.get();
    const ax = g.x * G * dt * dt;
    const ay = g.y * G * dt * dt;

    for (let i = 0; i < n; i++) {
      const x = p[2 * i];
      const y = p[2 * i + 1];
      const vx = (x - q[2 * i]) * DAMP;
      const vy = (y - q[2 * i + 1]) * DAMP;
      q[2 * i] = x;
      q[2 * i + 1] = y;
      p[2 * i] = x + vx + ax;
      p[2 * i + 1] = y + vy + ay;
    }

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < n; i++) {
        const ri = radii[i];
        for (let j = i + 1; j < n; j++) {
          let dx = p[2 * j] - p[2 * i];
          let dy = p[2 * j + 1] - p[2 * i + 1];
          const minD = ri + radii[j];
          let d2 = dx * dx + dy * dy;
          if (d2 >= minD * minD) continue;
          if (d2 < 1e-6) {
            // Two balls on the same spot: nudge them apart deterministically.
            dx = 0.01 * (j - i);
            dy = 0.01;
            d2 = dx * dx + dy * dy;
          }
          const d = Math.sqrt(d2);
          const push = ((minD - d) / d) * 0.5;
          p[2 * i] -= dx * push;
          p[2 * i + 1] -= dy * push;
          p[2 * j] += dx * push;
          p[2 * j + 1] += dy * push;
        }
        // Walls and floor. No ceiling: new balls drop in from above.
        if (p[2 * i] < ri) p[2 * i] = ri;
        else if (p[2 * i] > width - ri) p[2 * i] = width - ri;
        if (p[2 * i + 1] > JAR_HEIGHT - ri) p[2 * i + 1] = JAR_HEIGHT - ri;
      }
    }

    let moved = 0;
    for (let k = 0; k < 2 * n; k++) moved += Math.abs(p[k] - q[k]);
    pos.set(p);
    prev.set(q);

    if (moved / n < 0.02) {
      still.set(still.get() + 1);
      if (still.get() === SLEEP_AFTER) runOnJS(sleep)();
    } else {
      still.set(0);
    }
  });

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  // Seed, and add newcomers from the top; balls that are already in the
  // jar keep their places.
  useEffect(() => {
    if (width === 0) return;
    const n = radii.length;
    const p = pos.get().slice(0, 2 * n);
    for (let i = p.length / 2; i < n; i++) {
      p.push(radii[i] + Math.random() * (width - 2 * radii[i]), -radii[i] - 10 - Math.random() * 60);
    }
    pos.set(p);
    prev.set(p.slice());
    count.set(n);
    wake();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed only when the set of balls or the jar's width changes
  }, [radii, width]);

  // Tilt: the phone's gravity vector, in screen terms. Flat on a table
  // there's nothing to roll towards, so a gentle "down" takes over.
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    void (async () => {
      if (!(await DeviceMotion.isAvailableAsync()) || cancelled) return;
      DeviceMotion.setUpdateInterval(50);
      subscription = DeviceMotion.addListener((m) => {
        const a = m.accelerationIncludingGravity;
        if (a == null) return;
        const gx = a.x / 9.81;
        const gy = -a.y / 9.81;
        const next = Math.hypot(gx, gy) < 0.15 ? { x: 0, y: 1 } : { x: gx, y: gy };
        const current = gravity.get();
        if (Math.abs(next.x - current.x) < 0.02 && Math.abs(next.y - current.y) < 0.02) return;
        gravity.set(next);
        wake();
      });
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once
  }, []);

  const liftPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const p = pos.get();
    for (let i = 0; i < count.get(); i++) if (isLift[i]) path.addCircle(p[2 * i], p[2 * i + 1], radii[i]);
    return path;
  }, [isLift, radii]);
  const otherPath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const p = pos.get();
    for (let i = 0; i < count.get(); i++) if (!isLift[i]) path.addCircle(p[2 * i], p[2 * i + 1], radii[i]);
    return path;
  }, [isLift, radii]);
  // A small off-centre highlight on every ball: glassy, not flat.
  const shinePath = useDerivedValue(() => {
    const path = Skia.Path.Make();
    const p = pos.get();
    for (let i = 0; i < count.get(); i++) {
      const r = radii[i];
      path.addCircle(p[2 * i] - r * 0.3, p[2 * i + 1] - r * 0.3, r * 0.35);
    }
    return path;
  }, [radii]);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>EVERY SESSION</Text>
        <Text style={styles.count}>{balls.length}</Text>
      </View>
      <View style={styles.jar} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {width > 0 && (
          <Canvas style={{ width, height: JAR_HEIGHT }}>
            <Path path={otherPath} color={theme.colors.inkMuted} />
            <Path path={liftPath} color={theme.colors.accent} />
            <Path path={shinePath} color="rgba(255, 255, 255, 0.28)" />
          </Canvas>
        )}
        {balls.length === 0 && <Text style={styles.empty}>Your first session drops in here.</Text>}
      </View>
      {balls.length > 0 && <Text style={styles.hint}>Tilt your phone.</Text>}
    </Card>
  );
}

/** Ball size from session length: a quick 20 minutes is small, an hour
 * and a half is the biggest it gets. */
export function ballRadius(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  return Math.max(9, Math.min(20, 9 + minutes / 7));
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { ...theme.type.label, color: theme.colors.inkMuted },
  count: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  // The jar runs edge to edge inside the card; its floor is the card's
  // bottom padding.
  jar: { marginHorizontal: -theme.spacing.lg, height: JAR_HEIGHT, overflow: 'hidden', justifyContent: 'center' },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', position: 'absolute', alignSelf: 'center' },
  hint: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center' },
});
