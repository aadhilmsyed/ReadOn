'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Progress,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Radio,
  RadioGroup,
  Select,
  Spinner,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';

import { AppShell } from '@views/components/AppShell';
import { useSession } from '@views/providers/SessionProvider';
import { useText } from '@views/providers/TextProvider';

type ChoiceId = 'A' | 'B' | 'C' | 'D';
type Difficulty = 'easy' | 'medium' | 'hard';

interface Choice {
  id: ChoiceId;
  text: string;
}

interface Question {
  id: string;
  prompt: string;
  choices: Choice[];
  correctChoiceId: ChoiceId;
  explanation: string;
}

interface ComprehensionResult {
  resultId: string;
  questions: Question[];
  generation: {
    fallbackUsed: boolean;
    fallbackReason: string | null;
    fallbackMessage: string | null;
    cached: boolean;
  };
  circuitBreaker: {
    state: 'closed' | 'open' | 'half_open';
  };
}

interface ScoredAnswer {
  questionId: string;
  prompt?: string;
  choices?: Choice[];
  selectedChoiceId: ChoiceId;
  correctChoiceId: ChoiceId;
  isCorrect: boolean;
  explanation: string;
}

interface AnswerSubmission {
  status: 'scored';
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  answers: ScoredAnswer[];
}

interface HistoryAttempt {
  submissionId: string;
  resultId: string;
  title: string | null;
  submittedAt: string;
  score: {
    correct: number;
    total: number;
    percentage: number;
  };
  answers: ScoredAnswer[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function buildStoryTitle(text: string) {
  const words = text.trim().replace(/\s+/g, ' ').split(' ').slice(0, 8).join(' ');
  return words || 'Reading practice';
}

function choiceLabel(id: ChoiceId) {
  return id.toLowerCase();
}

export function ComprehensionPage() {
  const { inputText } = useText();
  const { isReady, session } = useSession();
  const [result, setResult] = useState<ComprehensionResult | null>(null);
  const [submission, setSubmission] = useState<AnswerSubmission | null>(null);
  const [history, setHistory] = useState<HistoryAttempt[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, ChoiceId>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [generationSeconds, setGenerationSeconds] = useState(0);
  const [selectedHistoryAttempt, setSelectedHistoryAttempt] = useState<HistoryAttempt | null>(null);

  const sourceText = inputText.trim();
  const userId = session?.user.email || '';
  const allQuestionsAnswered = result ? result.questions.every((question) => selectedAnswers[question.id]) : false;
  const progressTotal = result?.questions.length || questionCount;
  const instantFeedbackByQuestionId = useMemo(() => {
    return new Map((result?.questions || []).flatMap((question) => {
      const selectedChoiceId = selectedAnswers[question.id];

      if (!selectedChoiceId) {
        return [];
      }

      return [[question.id, {
        questionId: question.id,
        selectedChoiceId,
        correctChoiceId: question.correctChoiceId,
        isCorrect: selectedChoiceId === question.correctChoiceId,
        explanation: question.explanation,
      } satisfies ScoredAnswer]];
    }));
  }, [result, selectedAnswers]);
  const progressCorrect = Array.from(instantFeedbackByQuestionId.values()).filter((answer) => answer.isCorrect).length;
  const progressPercentage = progressTotal > 0 ? Math.round((progressCorrect / progressTotal) * 100) : 0;

  const contextHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};

    if (userId) {
      headers['x-readon-user-id'] = userId;
    }

    if (sourceText) {
      headers['x-readon-story-title'] = buildStoryTitle(sourceText);
    }

    return headers;
  }, [sourceText, userId]);

  const loadHistory = useCallback(async () => {
    if (!userId) {
      setHistory([]);
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError('');

    try {
      const response = await fetch('/api/comprehension/history', {
        credentials: 'include',
        headers: contextHeaders(),
      });
      const body = await response.json();

      if (!response.ok) {
        setHistoryError(body.error?.message || 'Unable to load comprehension history.');
        return;
      }

      setHistory(body.attempts || []);
    } catch {
      setHistoryError('Unable to load comprehension history.');
    } finally {
      setIsLoadingHistory(false);
    }
  }, [contextHeaders, userId]);

  useEffect(() => {
    if (isReady) {
      void loadHistory();
    }
  }, [isReady, loadHistory]);

  useEffect(() => {
    if (!isGenerating) {
      setGenerationSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    const timerId = window.setInterval(() => {
      setGenerationSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [isGenerating]);

  async function generateQuestions() {
    setIsGenerating(true);
    setErrorMessage('');
    setSubmission(null);

    try {
      const response = await fetch('/api/comprehension/questions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', ...contextHeaders() },
        body: JSON.stringify({
          sourceText,
          questionCount,
          difficulty,
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body.error?.message || 'Unable to generate comprehension questions.');
        return;
      }

      setResult(body);
      setSelectedAnswers({});
    } catch {
      setErrorMessage('Unable to reach the comprehension API.');
    } finally {
      setIsGenerating(false);
    }
  }

  async function submitAnswers() {
    if (!result) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const response = await fetch(`/api/comprehension/questions/${encodeURIComponent(result.resultId)}/answers`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json', ...contextHeaders() },
        body: JSON.stringify({
          answers: Object.entries(selectedAnswers).map(([questionId, selectedChoiceId]) => ({
            questionId,
            selectedChoiceId,
          })),
        }),
      });

      const body = await response.json();

      if (!response.ok) {
        setErrorMessage(body.error?.message || 'Unable to save comprehension answers.');
        return;
      }

      setSubmission(body);
      await loadHistory();
    } catch {
      setErrorMessage('Unable to save comprehension answers.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (selectedHistoryAttempt) {
    return (
      <AppShell>
        <VStack spacing={6} align="stretch" maxW="980px" mx="auto">
          <HStack justify="space-between" align="start" flexWrap="wrap" gap={4}>
            <Box>
              <Heading as="h1" size="lg" color="blue.700">
                Comprehension History
              </Heading>
              <Text color="gray.500">
                {selectedHistoryAttempt.title || 'Reading practice'} - {formatDate(selectedHistoryAttempt.submittedAt)}
              </Text>
            </Box>
            <Button variant="outline" colorScheme="blue" onClick={() => setSelectedHistoryAttempt(null)}>
              Back
            </Button>
          </HStack>

          <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" p={6} shadow="sm">
            <VStack spacing={3}>
              <Text color="gray.700" fontWeight="semibold">
                Score: {selectedHistoryAttempt.score.correct}/{selectedHistoryAttempt.score.total} ({selectedHistoryAttempt.score.percentage}%)
              </Text>
              <Progress
                value={selectedHistoryAttempt.score.percentage}
                w="100%"
                h="10px"
                borderRadius="md"
                bg="gray.100"
                colorScheme="green"
              />
            </VStack>
          </Box>

          <VStack spacing={5} align="stretch">
            {selectedHistoryAttempt.answers.map((answer, index) => (
              <Box key={answer.questionId} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm">
                <VStack align="stretch" spacing={4}>
                  <Text fontWeight="semibold" color="gray.800">
                    Question {index + 1}: {answer.prompt || 'Question'}
                  </Text>

                  <Stack spacing={3}>
                    {(answer.choices || []).map((choice) => {
                      const isSelected = answer.selectedChoiceId === choice.id;
                      const isCorrect = answer.correctChoiceId === choice.id;
                      const isWrongSelection = isSelected && !answer.isCorrect;
                      const rowBg = isCorrect ? 'green.50' : isWrongSelection ? 'red.500' : 'white';
                      const rowBorder = isCorrect ? 'green.300' : isWrongSelection ? 'red.500' : 'gray.200';
                      const rowColor = isWrongSelection ? 'white' : 'gray.700';

                      return (
                        <Box
                          key={choice.id}
                          borderWidth="1px"
                          borderColor={rowBorder}
                          borderRadius="md"
                          bg={rowBg}
                          color={rowColor}
                          px={4}
                          py={3}
                        >
                          <Text as="span" fontWeight="semibold" mr={2}>
                            {choiceLabel(choice.id)}.
                          </Text>
                          <Text as="span" fontWeight="semibold">
                            {choice.text}
                          </Text>
                        </Box>
                      );
                    })}
                  </Stack>

                  <Alert status={answer.isCorrect ? 'success' : 'warning'} borderRadius="md">
                    <AlertIcon />
                    <AlertDescription>
                      {answer.isCorrect ? 'Correct.' : `Correct answer: ${answer.correctChoiceId}.`} {answer.explanation}
                    </AlertDescription>
                  </Alert>
                </VStack>
              </Box>
            ))}
          </VStack>
        </VStack>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <VStack spacing={7} align="stretch" maxW="980px" mx="auto">
        <VStack spacing={3} align="center" textAlign="center">
          <Heading as="h1" size="xl" color="blue.700" letterSpacing="0">
            Reading Comprehension
          </Heading>
          <Text color="gray.600" maxW="760px" lineHeight="tall">
            Test your understanding with custom questions based on your text and get instant feedback on your answers.
          </Text>
        </VStack>

        <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.100" p={6} shadow="sm">
          <VStack spacing={3}>
            <Text color="gray.700" fontWeight="semibold">
              Score: {progressCorrect}/{progressTotal} ({progressPercentage}%)
            </Text>
            <Progress
              value={progressPercentage}
              w="100%"
              h="10px"
              borderRadius="md"
              bg="gray.100"
              colorScheme={submission ? 'green' : 'blue'}
            />
          </VStack>
        </Box>

        <Box bg="white" borderRadius="lg" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm">
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
              <Box>
                <Heading as="h2" size="md" color="blue.600">
                  Current Text
                </Heading>
                <Text color="gray.500" fontSize="sm">
                  Use the text saved from the home page.
                </Text>
              </Box>
            </HStack>

            {sourceText ? (
              <Text color="gray.600" noOfLines={5} lineHeight="tall">
                {sourceText}
              </Text>
            ) : (
              <Alert status="info" borderRadius="lg">
                <AlertIcon />
                <Box>
                  <AlertTitle>Add reading text first</AlertTitle>
                  <AlertDescription>
                    Go to the home page, paste a story or passage, then come back to generate questions.
                  </AlertDescription>
                </Box>
              </Alert>
            )}

            <Stack direction={{ base: 'column', md: 'row' }} spacing={4} align={{ base: 'stretch', md: 'end' }}>
              <FormControl maxW={{ base: '100%', md: '220px' }}>
                <FormLabel color="gray.700">Difficulty</FormLabel>
                <Select
                  value={difficulty}
                  onChange={(event) => setDifficulty(event.target.value as Difficulty)}
                  isDisabled={isGenerating}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </Select>
              </FormControl>

              <FormControl maxW={{ base: '100%', md: '220px' }}>
                <FormLabel color="gray.700">Number of questions</FormLabel>
                <NumberInput
                  min={1}
                  max={10}
                  value={questionCount}
                  onChange={(_, value) => setQuestionCount(Number.isFinite(value) ? value : 1)}
                  isDisabled={isGenerating}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>

              <Button
                colorScheme="blue"
                onClick={generateQuestions}
                isLoading={isGenerating}
                loadingText={generationSeconds >= 8 ? 'Still generating' : 'Generating'}
                isDisabled={!sourceText}
              >
                Generate Questions
              </Button>
            </Stack>
          </VStack>
        </Box>

        {errorMessage ? (
          <Alert status="error" borderRadius="md">
            <AlertIcon />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        {isGenerating ? (
          <VStack py={result ? 4 : 8} spacing={3}>
            <Spinner size="lg" color="blue.500" />
            <Text color="gray.700" fontWeight="medium">
              {generationSeconds >= 8 ? 'Still generating questions...' : 'Generating questions...'}
            </Text>
            <Text color="gray.500" fontSize="sm" textAlign="center">
              Larger or harder question sets can take up to 30 seconds.
            </Text>
          </VStack>
        ) : null}

        {result?.generation.fallbackUsed ? (
          <Alert status="info" variant="subtle" borderRadius="md">
            <AlertIcon />
            <AlertDescription>
              Showing backup questions
              {result.generation.cached ? ' from a saved result' : ''}. Circuit breaker: {result.circuitBreaker.state}.
            </AlertDescription>
          </Alert>
        ) : null}

        {result ? (
          <VStack spacing={5} align="stretch">
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <Heading as="h2" size="md" color="blue.600">
                Questions
              </Heading>
              <Badge colorScheme={submission ? 'green' : 'blue'} borderRadius="md" px={3} py={1}>
                {submission ? 'Saved' : `${Object.keys(selectedAnswers).length}/${result.questions.length} answered`}
              </Badge>
            </HStack>

            {submission ? (
              <Alert status="success" borderRadius="md">
                <AlertIcon />
                <Box>
                  <AlertTitle>
                    Attempt saved
                  </AlertTitle>
                  <AlertDescription>
                    Score: {submission.score.correct}/{submission.score.total}. Your feedback is shown below.
                  </AlertDescription>
                </Box>
              </Alert>
            ) : null}

            {result.questions.map((question, index) => {
              const selectedChoiceId = selectedAnswers[question.id];
              const scoredAnswer = instantFeedbackByQuestionId.get(question.id);

              return (
                <Box key={question.id} bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={6} shadow="sm">
                  <VStack align="stretch" spacing={4}>
                    <Text fontWeight="semibold" color="gray.800">
                      Question {index + 1}: {question.prompt}
                    </Text>

                    <RadioGroup
                      value={selectedChoiceId || ''}
                      onChange={(value) =>
                        setSelectedAnswers((current) => ({
                          ...current,
                          [question.id]: current[question.id] || (value as ChoiceId),
                        }))
                      }
                      isDisabled={Boolean(submission)}
                    >
                      <Stack spacing={3}>
                        {question.choices.map((choice) => {
                          const isSelected = selectedChoiceId === choice.id;
                          const isCorrect = scoredAnswer?.correctChoiceId === choice.id;
                          const isWrongSelection = Boolean(scoredAnswer && isSelected && !scoredAnswer.isCorrect);
                          const rowBg = isCorrect && scoredAnswer
                            ? 'green.50'
                            : isWrongSelection
                              ? 'red.500'
                              : isSelected
                                ? 'blue.50'
                                : 'white';
                          const rowBorder = isCorrect && scoredAnswer
                            ? 'green.300'
                            : isWrongSelection
                              ? 'red.500'
                              : isSelected
                                ? 'blue.200'
                                : 'gray.200';
                          const rowColor = isWrongSelection ? 'white' : 'gray.700';
                          const isAnswered = Boolean(selectedChoiceId);

                          return (
                            <Box
                              key={choice.id}
                              as="label"
                              display="block"
                              borderWidth="1px"
                              borderColor={rowBorder}
                              borderRadius="md"
                              bg={rowBg}
                              color={rowColor}
                              px={4}
                              py={3}
                              cursor={submission || isAnswered ? 'default' : 'pointer'}
                              transition="background 0.15s ease, border-color 0.15s ease"
                              _hover={submission || isAnswered ? undefined : { bg: 'gray.50' }}
                            >
                              <Radio value={choice.id} colorScheme={isWrongSelection ? 'whiteAlpha' : 'blue'}>
                                <Text as="span" fontWeight="semibold" mr={2}>
                                  {choiceLabel(choice.id)}.
                                </Text>
                                <Text as="span" fontWeight="semibold">
                                  {choice.text}
                                </Text>
                              </Radio>
                            </Box>
                          );
                        })}
                      </Stack>
                    </RadioGroup>

                    {scoredAnswer ? (
                      <Alert status={scoredAnswer.isCorrect ? 'success' : 'warning'} borderRadius="md">
                        <AlertIcon />
                        <AlertDescription>
                          {scoredAnswer.isCorrect ? 'Correct.' : `Correct answer: ${scoredAnswer.correctChoiceId}.`}{' '}
                          {scoredAnswer.explanation} Answer locked.
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </VStack>
                </Box>
              );
            })}

            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <Button
                colorScheme="purple"
                onClick={submitAnswers}
                isLoading={isSubmitting}
                isDisabled={!allQuestionsAnswered || Boolean(submission)}
              >
                Submit Answers
              </Button>
              <Text color="gray.500" fontSize="sm">
                {userId ? 'Your attempt will be saved to history.' : 'Sign in to save attempt history.'}
              </Text>
            </HStack>
          </VStack>
        ) : null}

        <Box bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.200" p={6}>
          <VStack align="stretch" spacing={4}>
            <HStack justify="space-between" flexWrap="wrap" gap={3}>
              <Heading as="h2" size="md" color="blue.600">
                Recent History
              </Heading>
              {isLoadingHistory ? <Spinner size="sm" color="blue.500" /> : null}
            </HStack>

            {!userId ? (
              <Text color="gray.600">Sign in to see saved comprehension attempts.</Text>
            ) : historyError ? (
              <Alert status="warning" borderRadius="md">
                <AlertIcon />
                <AlertDescription>{historyError}</AlertDescription>
              </Alert>
            ) : history.length > 0 ? (
              <VStack align="stretch" spacing={3}>
                {history.slice(0, 5).map((attempt) => (
                  <Box
                    key={attempt.submissionId}
                    as="button"
                    type="button"
                    textAlign="left"
                    w="100%"
                    onClick={() => setSelectedHistoryAttempt(attempt)}
                  >
                    <HStack justify="space-between" align="start" gap={4}>
                      <Box>
                        <Text fontWeight="semibold">{attempt.title || 'Reading practice'}</Text>
                        <Text color="gray.500" fontSize="sm">
                          {formatDate(attempt.submittedAt)}
                        </Text>
                      </Box>
                      <Badge colorScheme="green" borderRadius="md" px={3} py={1}>
                        {attempt.score.correct}/{attempt.score.total}
                      </Badge>
                    </HStack>
                    <Divider mt={3} />
                  </Box>
                ))}
              </VStack>
            ) : (
              <Text color="gray.600">No comprehension attempts yet.</Text>
            )}
          </VStack>
        </Box>
      </VStack>
    </AppShell>
  );
}
