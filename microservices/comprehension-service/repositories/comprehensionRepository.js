const { query, transaction } = require('../db/client');

function toIso(value) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapQuestion(row) {
  return {
    id: row.id,
    type: row.question_type,
    prompt: row.question_text,
    choices: row.options_json,
    correctChoiceId: row.correct_answer,
    explanation: row.explanation || '',
  };
}

function mapResult(resultRow, questionRows) {
  return {
    resultId: resultRow.id,
    status: resultRow.status,
    sourceTextHash: resultRow.text_hash,
    questions: questionRows.map(mapQuestion),
    generation: {
      source: resultRow.fallback_used ? 'default_fallback' : 'llm',
      fallbackUsed: resultRow.fallback_used,
      fallbackReason: resultRow.fallback_used ? 'default_questions' : null,
      fallbackMessage: resultRow.fallback_used
        ? 'Generated questions were returned from fallback.'
        : null,
      cached: false,
      persisted: true,
      generatedAt: toIso(resultRow.created_at),
    },
    circuitBreaker: {
      state: resultRow.circuit_state,
      failureCount: 0,
      openedAt: null,
      retryAfterSeconds: null,
    },
  };
}

async function loadQuestions(client, resultId) {
  const result = await client.query(
    `
      SELECT id, question_text, question_type, options_json, correct_answer, explanation, sort_order
      FROM comprehension_questions
      WHERE result_id = $1
      ORDER BY sort_order ASC
    `,
    [resultId],
  );

  return result.rows;
}

async function saveResult(result, context) {
  return transaction(async (client) => {
    await client.query(
      `
        INSERT INTO comprehension_results (
          id,
          user_id,
          story_id,
          title,
          text_hash,
          source_text,
          provider,
          status,
          fallback_used,
          circuit_state,
          score,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, now(), now())
      `,
      [
        result.resultId,
        context.userId || null,
        context.storyId || null,
        context.title || null,
        result.sourceTextHash,
        context.sourceText,
        context.provider || null,
        result.status,
        result.generation.fallbackUsed,
        result.circuitBreaker.state,
      ],
    );

    for (const [index, question] of result.questions.entries()) {
      await client.query(
        `
          INSERT INTO comprehension_questions (
            id,
            result_id,
            question_text,
            question_type,
            options_json,
            correct_answer,
            explanation,
            sort_order,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
        `,
        [
          question.id,
          result.resultId,
          question.prompt,
          question.type,
          JSON.stringify(question.choices),
          question.correctChoiceId,
          question.explanation || null,
          index + 1,
        ],
      );
    }

    return {
      ...result,
      generation: {
        ...result.generation,
        persisted: true,
      },
    };
  });
}

async function findResultById(resultId) {
  return transaction(async (client) => {
    const result = await client.query(
      `
        SELECT id, status, text_hash, provider, fallback_used, circuit_state, created_at
        FROM comprehension_results
        WHERE id = $1
      `,
      [resultId],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const questions = await loadQuestions(client, resultId);
    return mapResult(result.rows[0], questions);
  });
}

async function findResultBySourceTextHash(textHash) {
  return transaction(async (client) => {
    const result = await client.query(
      `
        SELECT id, status, text_hash, provider, fallback_used, circuit_state, created_at
        FROM comprehension_results
        WHERE text_hash = $1
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [textHash],
    );

    if (result.rowCount === 0) {
      return null;
    }

    const questions = await loadQuestions(client, result.rows[0].id);
    return mapResult(result.rows[0], questions);
  });
}

async function saveSubmission(submission, userId) {
  return transaction(async (client) => {
    for (const answer of submission.answers) {
      await client.query(
        `
          INSERT INTO comprehension_answer_history (
            id,
            result_id,
            question_id,
            user_id,
            selected_answer,
            is_correct,
            submitted_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          `${submission.submissionId}_${answer.questionId}`,
          submission.resultId,
          answer.questionId,
          userId || null,
          answer.selectedChoiceId,
          answer.isCorrect,
          submission.scoredAt,
        ],
      );
    }

    await client.query(
      `
        UPDATE comprehension_results
        SET score = $2, updated_at = now()
        WHERE id = $1
      `,
      [submission.resultId, submission.score.percentage],
    );

    return {
      ...submission,
      persisted: true,
    };
  });
}

async function findAttemptsByUserId(userId) {
  const result = await query(
    `
      SELECT
        h.result_id,
        h.question_id,
        h.selected_answer,
        h.is_correct,
        h.submitted_at,
        r.story_id,
        r.title,
        q.correct_answer,
        q.explanation,
        q.question_text,
        q.options_json
      FROM comprehension_answer_history h
      JOIN comprehension_results r ON r.id = h.result_id
      JOIN comprehension_questions q ON q.id = h.question_id
      WHERE h.user_id = $1
      ORDER BY h.submitted_at DESC, q.sort_order ASC
      LIMIT 100
    `,
    [userId],
  );

  const byAttempt = new Map();

  for (const row of result.rows) {
    const submittedAt = toIso(row.submitted_at);
    const key = `${row.result_id}:${submittedAt}`;

    if (!byAttempt.has(key)) {
      byAttempt.set(key, {
        submissionId: `sub_${row.result_id}_${Date.parse(submittedAt)}`,
        resultId: row.result_id,
        storyId: row.story_id,
        title: row.title,
        submittedAt,
        answers: [],
      });
    }

    byAttempt.get(key).answers.push({
      questionId: row.question_id,
      prompt: row.question_text,
      choices: row.options_json,
      selectedChoiceId: row.selected_answer,
      correctChoiceId: row.correct_answer,
      isCorrect: row.is_correct,
      explanation: row.explanation || '',
    });
  }

  return Array.from(byAttempt.values()).map((attempt) => {
    const total = attempt.answers.length;
    const correct = attempt.answers.filter((answer) => answer.isCorrect).length;

    return {
      ...attempt,
      score: {
        correct,
        total,
        percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      },
    };
  });
}

module.exports = {
  findAttemptsByUserId,
  findResultById,
  findResultBySourceTextHash,
  saveResult,
  saveSubmission,
};
