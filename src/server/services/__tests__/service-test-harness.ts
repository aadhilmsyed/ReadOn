/**
 * Service Test Harness
 * 
 * This file provides a simple way to manually test services.
 * Run with: npx ts-node src/server/services/__tests__/service-test-harness.ts
 * 
 * Note: Requires environment variables to be set
 */

// Example test for visualization service
async function testVisualizationService() {
  const { generateVisualizations } = await import('../visualization.service');
  
  const result = await generateVisualizations({
    text: 'The sun rises in the east. It brings light to the world.',
  });
  
  console.log('Visualization test result:', {
    resultCount: result.results.length,
    firstResult: result.results[0] ? {
      segment: result.results[0].segment.substring(0, 50) + '...',
      hasImage: !!result.results[0].image_data,
    } : null,
  });
}

// Example test for questions service
async function testQuestionsService() {
  const { generateQuestions } = await import('../questions.service');
  
  const result = await generateQuestions({
    text: 'The sun rises in the east. It brings light to the world. Plants need sunlight to grow.',
  });
  
  console.log('Questions test result:', {
    questionCount: result.questions.length,
    firstQuestion: result.questions[0] ? {
      question: result.questions[0].question,
      choiceCount: result.questions[0].choices.length,
    } : null,
  });
}

// Example test for phonetics service
async function testPhoneticsService() {
  const { getPhoneticsData } = await import('../phonetics.service');
  
  const result = await getPhoneticsData({
    text: 'The beautiful sunset painted the sky with vibrant colors.',
  });
  
  console.log('Phonetics test result:', {
    wordCount: result.length,
    firstWord: result[0] ? {
      word: result[0].word,
      phonetic: result[0].phonetic,
      hasAudio: !!result[0].audio_url,
    } : null,
  });
}

// Example test for text-to-speech service
async function testTextToSpeechService() {
  const { generateSpeech } = await import('../text-to-speech.service');
  
  const result = await generateSpeech({
    text: 'Hello, this is a test.',
  });
  
  console.log('Text-to-speech test result:', {
    audioSize: result.byteLength,
    hasData: result.byteLength > 0,
  });
}

// Main test runner
async function runTests() {
  console.log('Starting service tests...\n');
  
  try {
    console.log('Testing Visualization Service...');
    await testVisualizationService();
    console.log('✓ Visualization service test passed\n');
  } catch (error) {
    console.error('✗ Visualization service test failed:', error);
  }
  
  try {
    console.log('Testing Questions Service...');
    await testQuestionsService();
    console.log('✓ Questions service test passed\n');
  } catch (error) {
    console.error('✗ Questions service test failed:', error);
  }
  
  try {
    console.log('Testing Phonetics Service...');
    await testPhoneticsService();
    console.log('✓ Phonetics service test passed\n');
  } catch (error) {
    console.error('✗ Phonetics service test failed:', error);
  }
  
  try {
    console.log('Testing Text-to-Speech Service...');
    await testTextToSpeechService();
    console.log('✓ Text-to-speech service test passed\n');
  } catch (error) {
    console.error('✗ Text-to-speech service test failed:', error);
  }
  
  console.log('All tests completed!');
}

// Uncomment to run tests
// runTests().catch(console.error);

export { testVisualizationService, testQuestionsService, testPhoneticsService, testTextToSpeechService };

