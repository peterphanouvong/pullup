import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSelector } from '@legendapp/state/react';
import { haptics } from '@/lib/haptics';
import { useThemedStyles } from '@/styles/use-theme';
import type { Theme } from '@/styles/theme';
import { OptionCard } from '@/features/onboarding/components/option-card';
import { StepFrame } from '@/features/onboarding/components/step-frame';
import { isAnswered, visibleQuestions } from '@/features/onboarding/questions';
import { draft$ } from '@/features/onboarding/state';

/**
 * Question `step` (1-based) of the interview. Which questions exist
 * depends on earlier answers, so the list is recomputed from the draft
 * each render; answering changes the draft, Continue pushes the next step.
 */
export default function QuestionScreen() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const index = Math.max(1, Number.parseInt(step ?? '1', 10) || 1) - 1;
  const draft = useSelector(draft$);
  const styles = useThemedStyles(createStyles);

  const questions = visibleQuestions(draft);
  const question = questions[index];
  if (!question) {
    // A stale deep link past the end: there's nothing to ask.
    router.replace('/onboarding/building');
    return null;
  }

  const answered = isAnswered(question, draft);
  const value = draft[question.key];
  const chosen = new Set<string | number>(Array.isArray(value) ? value : value != null ? [value] : []);

  function choose(option: string | number) {
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
    draft$.assign({ [question.key]: [] });
  }

  function next() {
    haptics.tap();
    if (index + 1 < questions.length) router.push(`/onboarding/${index + 2}`);
    else router.push('/onboarding/building');
  }

  return (
    <StepFrame
      progress={(index + 1) / questions.length}
      title={question.title}
      subtitle={question.subtitle}
      cta="Continue"
      onCta={next}
      ctaDisabled={!answered}
      onBack={() => router.back()}
    >
      <View style={styles.options}>
        {question.options.map((option) => (
          <OptionCard
            key={String(option.value)}
            label={option.label}
            caption={option.caption}
            selected={chosen.has(option.value)}
            multi={question.kind === 'multi'}
            onPress={() => choose(option.value)}
          />
        ))}
        {question.noneLabel != null && (
          <OptionCard label={question.noneLabel} selected={Array.isArray(value) && value.length === 0} onPress={chooseNone} />
        )}
      </View>
    </StepFrame>
  );
}

const createStyles = (theme: Theme) => StyleSheet.create({
  options: { gap: theme.spacing.sm },
});
