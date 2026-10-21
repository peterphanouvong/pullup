import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useSelector } from '@legendapp/state/react';
import { haptics } from '@/lib/haptics';
import { useThemedStyles, useTheme } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { BRIEF_NOTE_MAX } from '@/features/onboarding/brief';
import { OptionCard } from '@/features/onboarding/components/option-card';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { isAnswered, noteFor, visibleQuestions } from '@/features/onboarding/questions';
import { draft$ } from '@/features/onboarding/state';

/**
 * Question `step` (1-based) of the interview. Which questions exist
 * depends on earlier answers, so the list is recomputed from the draft
 * each render; answering changes the draft, Continue pushes the next step.
 *
 * Every question ends with "Something else": a card that opens a line for
 * the answer in your own words, for when none of ours fit. Writing clears
 * the card choice and the coach reads the words instead.
 */
export default function QuestionScreen() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const index = Math.max(1, Number.parseInt(step ?? '1', 10) || 1) - 1;
  // A fresh object on every change, not the observable's own: the store
  // mutates in place, and the React Compiler memoises everything derived
  // from `draft` by identity, so the same reference would never re-derive
  // which card is selected.
  const draft = useSelector(() => ({ ...draft$.get(), notes: { ...draft$.notes.get() } }));
  const theme = useTheme();
  const styles = useThemedStyles(createStyles);

  const questions = visibleQuestions(draft);
  const question = questions[index];
  const note = question ? noteFor(draft, question.key) : null;
  // The write-in opens on its card, and stays open while it holds text.
  const [writing, setWriting] = useState(note != null);

  if (!question) {
    // A stale deep link past the end: there's nothing to ask.
    router.replace('/onboarding/building');
    return null;
  }

  const answered = isAnswered(question, draft);
  const pills = question.kind === 'multi';
  const value = draft[question.key];
  const chosen = new Set<string | number>(note != null ? [] : Array.isArray(value) ? value : value != null ? [value] : []);

  function clearNote() {
    const notes = { ...draft$.notes.peek() };
    delete notes[question.key];
    draft$.notes.set(notes);
  }

  function choose(option: string | number) {
    clearNote();
    setWriting(false);
    if (question.kind === 'single') {
      draft$.assign({ [question.key]: option });
      return;
    }
    const next = new Set(chosen);
    if (next.has(option)) next.delete(option);
    else next.add(option);
    draft$.assign({ [question.key]: [...next] });
  }

  function chooseNone() {
    clearNote();
    setWriting(false);
    draft$.assign({ [question.key]: [] });
  }

  function openWriting() {
    setWriting(true);
  }

  function write(text: string) {
    const notes = { ...draft$.notes.peek() };
    if (text.trim().length > 0) notes[question.key] = text;
    else delete notes[question.key];
    draft$.notes.set(notes);
    // Words replace the card choice: one answer per question.
    draft$.assign({ [question.key]: undefined });
  }

  function next() {
    haptics.tap();
    if (index + 1 < questions.length) router.push(`/onboarding/${index + 2}`);
    else router.push('/onboarding/building');
  }

  return (
    <>
      {/* Opened from Plan there's no welcome screen behind step 1, so the
          bar carries a close as well as the system back. */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="xmark"
          accessibilityLabel="Close"
          hidesSharedBackground
          tintColor={theme.colors.ink}
          onPress={() => {
            haptics.tap();
            router.dismissAll();
          }}
        />
      </Stack.Toolbar>
      <StepFrame
        step={{ index: index + 1, total: questions.length }}
        title={question.title}
        subtitle={question.subtitle}
        cta="Continue"
        onCta={next}
        ctaDisabled={!answered}
      >
        {/* Pick-several questions wrap as chips, pick-one as cards with
            their captions. */}
        <View style={pills ? styles.pills : styles.options}>
          {question.options.map((option) => (
            <OptionCard
              key={String(option.value)}
              label={option.label}
              caption={option.caption}
              selected={chosen.has(option.value)}
              multi={pills}
              pill={pills}
              onPress={() => choose(option.value)}
            />
          ))}
          {question.noneLabel != null && (
            <OptionCard
              label={question.noneLabel}
              selected={note == null && Array.isArray(value) && value.length === 0}
              pill={pills}
              onPress={chooseNone}
            />
          )}
          <OptionCard
            label="Something else"
            caption={writing || pills ? undefined : 'Answer in your own words'}
            selected={writing || note != null}
            pill={pills}
            onPress={openWriting}
          />
        </View>
        {writing && (
            <TextInput
              style={styles.input}
              value={draft.notes?.[question.key] ?? ''}
              onChangeText={write}
              placeholder="Type your answer"
              placeholderTextColor={theme.colors.inkMuted}
              maxLength={BRIEF_NOTE_MAX}
              autoFocus
              multiline
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              accessibilityLabel="Your own answer"
            />
        )}
      </StepFrame>
    </>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  options: { gap: theme.spacing.sm },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  input: {
    ...theme.type.body,
    color: theme.colors.ink,
    minHeight: 64,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.xl,
    backgroundColor: theme.colors.glass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.ink,
    textAlignVertical: 'top',
  },
});
