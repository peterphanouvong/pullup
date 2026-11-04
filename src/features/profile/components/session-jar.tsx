import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';
import { useDerivedValue, useFrameCallback, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { DeviceMotion } from 'expo-sensors';
import { Card } from '@/components/ui/card';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';

export interface JarBall {
  id: string;
  radius: number;
  /** Programme sessions in the accent; anything else in the muted ink. */
  tone: 'lift' | 'other';
}

export const JAR_HEIGHT = 240;
/** Buoyancy at 1g, in points per second squared. Gentle: these float. */
const BUOYANCY = 380;
/** Velocity kept per frame. Water, not air. */
const DAMP = 0.962;
/** Sideways wander, so nothing ever quite sits still. */
const SWAY = 120;
/** How firmly bubbles push apart: well under 1, so they squish past
 * each other instead of clacking. */
const SOFTNESS = 0.3;

/**
 * Every finished session as a bubble in a jar, Up Bank style. Bubbles
 * rise, gather at the top, nudge past each other and sway; tilt the phone
 * and they drift the way you tilt. A new session floats in from below.
 *
 * Verlet integration on the UI thread (a Reanimated frame callback) with
 * soft circle constraints, drawn as a few Skia paths: a translucent fill
 * per tone, a thin rim and a highlight on every bubble. Runs only while
 * the Profile is the focused screen. With no motion sensor (the
 * simulator) gravity points down, so the bubbles float up.
 */
export function SessionJar({ balls }: { balls: JarBall[] }) {
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const radii = useMemo(() => balls.map((b) => b.radius), [balls]);
  const isLift = useMemo(() => balls.map((b) => b.tone === 'lift'), [balls]);
  // Each bubble's own rhythm, from its index so it's stable across renders.
  const phase = useMemo(() => balls.map((_, i) => (i * 2.399) % (Math.PI * 2)), [balls]);
  const tempo = useMemo(() => balls.map((_, i) => 0.5 + ((i * 7) % 5) * 0.12), [balls]);

  // Interleaved x, y per bubble; `prev` is last frame's, for Verlet.
  const pos = useSharedValue<number[]>([]);
  const prev = useSharedValue<number[]>([]);
  const count = useSharedValue(0);
  const gravity = useSharedValue({ x: 0, y: 1 });

  const frame = useFrameCallback((info) => {
    const n = count.get();
    if (n === 0 || width === 0) return;
    const dt = Math.min((info.timeSincePreviousFrame ?? 16) / 1000, 1 / 30);
    const time = info.timestamp / 1000;
    const p = pos.get().slice();
    const q = prev.get().slice();
    const g = gravity.get();

    for (let i = 0; i < n; i++) {
      const x = p[2 * i];
      const y = p[2 * i + 1];
      const vx = (x - q[2 * i]) * DAMP;
      const vy = (y - q[2 * i + 1]) * DAMP;
      // Against gravity (they float), plus a slow personal sway.
      const ax = -g.x * BUOYANCY + Math.sin(time * tempo[i] + phase[i]) * SWAY;
      const ay = -g.y * BUOYANCY + Math.cos(time * tempo[i] * 0.7 + phase[i]) * SWAY * 0.4;
      q[2 * i] = x;
      q[2 * i + 1] = y;
      p[2 * i] = x + vx + ax * dt * dt;
      p[2 * i + 1] = y + vy + ay * dt * dt;
    }

    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < n; i++) {
        const ri = radii[i];
        for (let j = i + 1; j < n; j++) {
          let dx = p[2 * j] - p[2 * i];
          let dy = p[2 * j + 1] - p[2 * i + 1];
          const minD = ri + radii[j];
          let d2 = dx * dx + dy * dy;
          if (d2 >= minD * minD) continue;
          if (d2 < 1e-6) {
            dx = 0.01 * (j - i);
            dy = 0.01;
            d2 = dx * dx + dy * dy;
          }
          const d = Math.sqrt(d2);
          const push = ((minD - d) / d) * 0.5 * SOFTNESS;
          p[2 * i] -= dx * push;
          p[2 * i + 1] -= dy * push;
          p[2 * j] += dx * push;
          p[2 * j + 1] += dy * push;
        }
        // The jar: sides, lid and floor. Newcomers arrive from below the
        // floor, so the floor only holds what's already inside.
        if (p[2 * i] < ri) p[2 * i] = ri;
        else if (p[2 * i] > width - ri) p[2 * i] = width - ri;
        if (p[2 * i + 1] < ri) p[2 * i + 1] = ri;
        else if (p[2 * i + 1] > JAR_HEIGHT - ri && q[2 * i + 1] <= JAR_HEIGHT - ri) p[2 * i + 1] = JAR_HEIGHT - ri;
      }
    }

    pos.set(p);
    prev.set(q);
  }, false);

  const frameRef = useRef<{ setActive: (active: boolean) => void } | null>(null);
  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  // Only the focused Profile animates; a tab in the background costs nothing.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    frameRef.current?.setActive(focused && width > 0 && balls.length > 0);
  }, [focused, width, balls.length]);

  // Seed, and float newcomers in from below; bubbles already in the jar
  // keep their places.
  useEffect(() => {
    if (width === 0) return;
    const n = radii.length;
    const p = pos.get().slice(0, 2 * n);
    const seeded = p.length / 2;
    for (let i = seeded; i < n; i++) {
      const x = radii[i] + Math.random() * (width - 2 * radii[i]);
      const y = seeded === 0 ? Math.random() * JAR_HEIGHT : JAR_HEIGHT + radii[i] + 20 + Math.random() * 60;
      p.push(x, y);
    }
    pos.set(p);
    prev.set(p.slice());
    count.set(n);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seed only when the set of bubbles or the jar's width changes
  }, [radii, width]);

  // Tilt: the phone's gravity vector in screen terms, which the bubbles
  // float against. Flat on a table there's nothing to rise towards, so a
  // gentle "down" takes over and they drift to the top.
  useEffect(() => {
    let subscription: { remove: () => void } | null = null;
    let cancelled = false;
    void (async () => {
      if (!(await DeviceMotion.isAvailableAsync()) || cancelled) return;
      DeviceMotion.setUpdateInterval(80);
      subscription = DeviceMotion.addListener((m) => {
        const a = m.accelerationIncludingGravity;
        if (a == null) return;
        const gx = a.x / 9.81;
        const gy = -a.y / 9.81;
        gravity.set(Math.hypot(gx, gy) < 0.15 ? { x: 0, y: 1 } : { x: gx, y: gy });
      });
    })();
    return () => {
      cancelled = true;
      subscription?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once
  }, []);

  const sim = { pos, count, radii };
  const liftFill = useCircles(sim, isLift);
  const otherFill = useCircles(sim, isLift.map((lift) => !lift));
  const rims = useCircles(sim, null);
  const shine = useCircles(sim, null, 0.3, 0.38);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>EVERY SESSION</Text>
        <Text style={styles.count}>{balls.length}</Text>
      </View>
      <View style={styles.jar} onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))}>
        {width > 0 && (
          <Canvas style={{ width, height: JAR_HEIGHT }}>
            <Path path={otherFill} color="rgba(142, 142, 147, 0.30)" />
            <Path path={liftFill} color="rgba(61, 139, 247, 0.34)" />
            <Path path={rims} style="stroke" strokeWidth={1.25} color="rgba(255, 255, 255, 0.5)" />
            <Path path={shine} color="rgba(255, 255, 255, 0.55)" />
          </Canvas>
        )}
        {balls.length === 0 && <Text style={styles.empty}>Your first session floats in here.</Text>}
      </View>
      {balls.length > 0 && <Text style={styles.hint}>Tilt your phone.</Text>}
    </Card>
  );
}

/** A Skia path of circles following the simulation, for the bubbles
 * `include` flags (all of them when null), scaled and nudged up-left by
 * a share of each radius for the highlight. Rebuilt on the UI thread as
 * positions change. */
function useCircles(
  sim: { pos: SharedValue<number[]>; count: SharedValue<number>; radii: number[] },
  include: boolean[] | null,
  scale = 1,
  offset = 0,
) {
  const { pos, count, radii } = sim;
  return useDerivedValue(() => {
    const path = Skia.Path.Make();
    const p = pos.get();
    for (let i = 0; i < count.get(); i++) {
      if (include != null && !include[i]) continue;
      const r = radii[i];
      path.addCircle(p[2 * i] - r * offset, p[2 * i + 1] - r * offset, r * scale);
    }
    return path;
  }, [pos, count, radii, include, scale, offset]);
}

/** Bubble size from session length: a quick 20 minutes is small, an hour
 * and a half is the biggest it gets. */
export function ballRadius(durationSeconds: number): number {
  const minutes = durationSeconds / 60;
  return Math.max(12, Math.min(26, 12 + minutes / 6));
}

const createStyles = (theme: Theme) => StyleSheet.create({
  card: { gap: theme.spacing.sm, paddingBottom: theme.spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { ...theme.type.label, color: theme.colors.inkMuted },
  count: { ...theme.type.heading, color: theme.colors.ink, fontVariant: ['tabular-nums'] },
  // The jar runs edge to edge inside the card.
  jar: { marginHorizontal: -theme.spacing.lg, height: JAR_HEIGHT, overflow: 'hidden', justifyContent: 'center' },
  empty: { ...theme.type.body, color: theme.colors.inkMuted, textAlign: 'center', position: 'absolute', alignSelf: 'center' },
  hint: { ...theme.type.caption, color: theme.colors.inkMuted, textAlign: 'center' },
});
