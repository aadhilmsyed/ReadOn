'use client'

import { Box, Heading, Text, VStack, Image, Spinner, Button, Container, Progress, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure, IconButton, HStack } from '@chakra-ui/react'
import { useEffect, useState, useRef } from 'react'
import { useText } from '../../providers'
import Link from 'next/link'
import { FaHome, FaVolumeUp } from 'react-icons/fa'
import { 
  getCachedVisualization, 
  getCachedQuestions, 
  visualizationCache, 
  comprehensionCache, 
  getCachedPhonetics, 
  phoneticsCache 
} from '../../../utils/caches';
import type { VisualizationResult, Choice, Question, WordData } from '../../types';

const WordVisualization = () => {
  const { inputText } = useText()
  const [results, setResults] = useState<VisualizationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: number }>({});
  const [answeredCorrectly, setAnsweredCorrectly] = useState<{ [key: number]: boolean }>({});
  const [score, setScore] = useState(0);
  const [hoveredWord, setHoveredWord] = useState<string | null>(null);
  const [wordData, setWordData] = useState<WordData | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (inputText) {
      generateImages(inputText);
      fetchQuestions(inputText);
    }
  }, [inputText]);

  const generateImages = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const cachedResult = getCachedVisualization(text);
      if (cachedResult) {
        console.log('Using cached visualization results');
        setResults(cachedResult.results);
        setLoading(false);
        return;
      }

      const response = await fetch('/api/visualization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (response.ok) {
        visualizationCache.put(text, data);
        setResults(data.results);
      } else {
        throw new Error(data.error || 'An error occurred');
      }
    } catch (error) {
      console.error('Error generating images:', error);
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
    }
    setLoading(false);
  };

  const fetchQuestions = async (text: string) => {
    try {
      const cachedQuestions = getCachedQuestions(text);
      if (cachedQuestions) {
        console.log('Using cached questions');
        setQuestions(cachedQuestions.questions);
        return;
      }

      const response = await fetch("/api/generateQuestions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      if (data.questions) {
        comprehensionCache.put(text, data);
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
    }
  };

  const handleWordHover = async (word: string) => {
    try {
      const cachedData = getCachedPhonetics(word);
      if (cachedData && cachedData[0]) {
        console.log('Using cached phonetics data');
        setHoveredWord(word);
        setWordData(cachedData[0]);
        return;
      }

      const response = await fetch("/api/phonetics", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: word }),
      });
      const data = await response.json();
      if (data && data[0]) {
        phoneticsCache.put(word, data);
        setHoveredWord(word);
        setWordData(data[0]);
      } else {
        setHoveredWord(null);
        setWordData(null);
      }
    } catch (error) {
      console.error("Error fetching word data:", error);
      setHoveredWord(null);
      setWordData(null);
    }
  };

  const handleWordClick = (word: string) => {
    if (wordData && word === hoveredWord && wordData.audio_url) {
      playAudio(wordData.audio_url);
    }
  };

  const handleAnswerSubmit = (questionIndex: number, choiceIndex: number, isCorrect: boolean) => {
    const previouslyCorrect = answeredCorrectly[questionIndex];
    
    setSelectedAnswers(prev => ({ ...prev, [questionIndex]: choiceIndex }));
    setAnsweredCorrectly(prev => ({ ...prev, [questionIndex]: isCorrect }));
    
    setScore(prevScore => {
      let newScore = prevScore;
      if (previouslyCorrect && !isCorrect) {
        newScore = prevScore - 1;
      }
      else if (!previouslyCorrect && isCorrect) {
        newScore = prevScore + 1;
      }
      return newScore;
    });
  };

  const getButtonColor = (questionIndex: number, choiceIndex: number, isCorrect: boolean) => {
    if (selectedAnswers[questionIndex] === choiceIndex) {
      if (answeredCorrectly[questionIndex]) {
        return "green";
      } else {
        return "red";
      }
    }
    return "blue";
  };

  const calculatePercentage = () => {
    return questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
  };

  const playAudio = async (audioUrl: string | null) => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl;
      try {
        await audioRef.current.play();
      } catch (error) {
        console.error('Error playing audio:', error);
      }
    }
  };

  useEffect(() => {
    const allCorrect = questions.length > 0 && 
      questions.every((_, index) => answeredCorrectly[index]);
    
    if (allCorrect) {
      onOpen();
    }
  }, [answeredCorrectly, questions, onOpen]);

  const getRandomCongratsMessage = () => {
    const messages = [
      "🎉 Outstanding Achievement! You've mastered all the questions!",
      "🌟 Brilliant Work! Perfect score achieved!",
      "🏆 Exceptional Performance! You've aced the quiz!",
      "⭐ Remarkable Job! You've conquered all questions!",
      "🎯 Perfect Score! Your comprehension is excellent!"
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  };

  if (loading) {
    return (
      <Box 
        minHeight="100vh" 
        display="flex"
        flexDirection="column"
        backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
        backgroundSize="40px 40px"
        position="relative"
      >
        <Container maxW="container.lg" mt={8}>
          <VStack spacing={8}>
            <Link href="/" passHref>
              <Heading 
                as="h1" 
                size="2xl" 
                textAlign="center"
                bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
                bgClip="text"
                fontWeight="extrabold"
                letterSpacing="tight"
                _hover={{
                  bgGradient: "linear(to-r, blue.500, purple.600, pink.600)",
                  cursor: "pointer",
                  transform: "translateY(-2px)"
                }}
                transition="all 0.3s ease"
                mb={4}
              >
                Read On
              </Heading>
            </Link>
            <Text 
              fontSize="xl" 
              textAlign="center" 
              maxWidth="800px" 
              mx="auto"
              color="gray.600"
              lineHeight="tall"
            >
              Your AI-Powered Reading Companion
            </Text>
          </VStack>
        </Container>

        <Box flex="1" display="flex" alignItems="center" justifyContent="center">
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text fontSize="lg" color="gray.600">Generating Interactive Content...</Text>
            <Text fontSize="md" color="gray.500">This may take a few minutes.</Text>
          </VStack>
        </Box>

        <Box
          py={4}
          bgGradient="linear(to-r, blue.500, purple.600)"
          borderTop="1px"
          borderColor="blue.300"
          backdropFilter="blur(8px)"
          boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
          zIndex={10}
        >
          <Container maxW="container.xl">
            <VStack spacing={2}>
              <Link href="/" passHref>
                <Button
                  leftIcon={<FaHome />}
                  variant="ghost"
                  color="white"
                  size="lg"
                  _hover={{
                    bg: "whiteAlpha.200",
                    transform: "translateY(-2px)"
                  }}
                  transition="all 0.2s"
                >
                  Back to Home
                </Button>
              </Link>
              <Text 
                textAlign="center" 
                fontSize="sm" 
                color="white"
                fontWeight="medium"
              >
                © {new Date().getFullYear()} Read On. Created by Aadhil Mubarak Syed. All rights reserved.
              </Text>
            </VStack>
          </Container>
        </Box>
      </Box>
    )
  }

  return (
    <Box 
      minHeight="100vh" 
      backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
      backgroundSize="40px 40px"
      display="flex"
      flexDirection="column"
    >
      <Container maxW="container.lg" flex="1" pt={8}>
        <VStack spacing={8} mt={8}>
          <Link href="/" passHref>
            <Heading 
              as="h1" 
              size="2xl" 
              textAlign="center"
              bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
              bgClip="text"
              fontWeight="extrabold"
              letterSpacing="tight"
              _hover={{
                bgGradient: "linear(to-r, blue.500, purple.600, pink.600)",
                cursor: "pointer",
                transform: "translateY(-2px)"
              }}
              transition="all 0.3s ease"
              mb={4}
            >
              Read On
            </Heading>
          </Link>
          <Text 
            fontSize="xl" 
            textAlign="center" 
            maxWidth="800px" 
            mx="auto"
            color="gray.600"
            lineHeight="tall"
          >
            Your AI-Powered Reading Companion
          </Text>
          <Heading 
            as="h2" 
            size="xl" 
            textAlign="center"
            color="blue.600"
          >
            Interactive Learning
          </Heading>
          <Text 
            fontSize="lg" 
            textAlign="center" 
            maxWidth="800px" 
            mx="auto"
            color="gray.600"
            lineHeight="tall"
            mb={4}
          >
            Enhance your learning experience with our interactive page. This page combines the features of 
            the other learning modalities to provide a comprehensive learning experience. This includes 
            text visualization, reading comprehension, and pronunciation practice, as well as a read along audio.
          </Text>
        </VStack>

        {error ? (
          <Text color="red.500" textAlign="center" fontSize="xl">{error}</Text>
        ) : results.length > 0 ? (
          <VStack spacing={12} mt={8} align="stretch" mb={20}>
            {results.map((result, index) => (
              <VStack key={index} spacing={0} align="stretch">
                <Text 
                  fontSize="xl"
                  color="gray.700"
                  bg="white"
                  p={8}
                  borderTopRadius="lg"
                  boxShadow="sm"
                  lineHeight="tall"
                  mb={0}
                >
                  {result.segment.split(/\s+/).map((word, wordIndex) => (
                    <Text
                      key={wordIndex}
                      as="span"
                      display="inline-block"
                      mx={1}
                      cursor="pointer"
                      position="relative"
                      onMouseEnter={() => handleWordHover(word)}
                      onMouseLeave={() => {
                        setHoveredWord(null);
                        setWordData(null);
                      }}
                      onClick={() => handleWordClick(word)}
                      color={hoveredWord === word ? "blue.500" : "inherit"}
                      _hover={{ color: "blue.500" }}
                    >
                      {word}
                      {hoveredWord === word && wordData && (
                        <Box
                          position="absolute"
                          top="100%"
                          left="50%"
                          transform="translateX(-50%)"
                          zIndex={10}
                          bg="white"
                          p={4}
                          borderRadius="xl"
                          boxShadow="xl"
                          width="300px"
                          border="1px"
                          borderColor="blue.200"
                        >
                          <VStack spacing={3} align="center">
                            <Text fontSize="2xl" fontWeight="bold">{wordData.word}</Text>
                            <HStack spacing={2} align="center">
                              <Text fontSize="lg" color="gray.600">{wordData.phonetic}</Text>
                              {wordData.audio_url && (
                                <IconButton
                                  aria-label="Play pronunciation"
                                  icon={<FaVolumeUp />}
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    playAudio(wordData.audio_url);
                                  }}
                                />
                              )}
                            </HStack>
                            <Text fontSize="md" textAlign="center" color="gray.500">
                              {wordData.definition}
                            </Text>
                          </VStack>
                        </Box>
                      )}
                    </Text>
                  ))}
                </Text>
                <Image 
                  src={result.image_data} 
                  alt={result.segment}
                  borderBottomRadius="lg"
                  width="100%"
                  height="auto"
                  boxShadow="lg"
                  style={{ 
                    maxWidth: '600px',
                    maxHeight: '600px',
                    objectFit: 'contain',
                    margin: '0 auto'
                  }}
                />
              </VStack>
            ))}
          </VStack>
        ) : (
          <Text textAlign="center" fontSize="xl">No results generated. Please try again.</Text>
        )}

        {results.length > 0 && questions.length > 0 && (
          <>
            <Box 
              borderWidth={1} 
              borderRadius="lg"
              p={8}
              bg="white"
              mb={8}
              mx="auto"
              maxW="800px"
              width="100%"
              mt={16}
            >
              <VStack spacing={3}>
                <Heading 
                  as="h2" 
                  size="xl" 
                  textAlign="center"
                  color="blue.600"
                  mb={4}
                >
                  Reading Comprehension
                </Heading>
                <Text fontSize="xl" fontWeight="bold">
                  Score: {score}/{questions.length} ({calculatePercentage()}%)
                </Text>
                <Progress
                  value={calculatePercentage()}
                  width="100%"
                  colorScheme="green"
                  borderRadius="full"
                  hasStripe
                  isAnimated
                  height="12px"
                />
              </VStack>
            </Box>

            <VStack spacing={8} align="stretch" maxW="800px" mx="auto" mb={16}>
              {questions.map((question, questionIndex) => (
                <Box 
                  key={questionIndex} 
                  p={8}
                  borderWidth={1} 
                  borderRadius="lg"
                  bg="white"
                  boxShadow="sm"
                  _hover={{ boxShadow: "md" }}
                  transition="all 0.2s"
                >
                  <Text fontSize="lg" fontWeight="bold" mb={4}>
                    Question {questionIndex + 1}: {question.question}
                  </Text>
                  <VStack spacing={3} align="stretch">
                    {question.choices.map((choice, choiceIndex) => (
                      <Button
                        key={choiceIndex}
                        onClick={() => handleAnswerSubmit(questionIndex, choiceIndex, choice.isCorrect)}
                        colorScheme={getButtonColor(questionIndex, choiceIndex, choice.isCorrect)}
                        variant={selectedAnswers[questionIndex] === choiceIndex ? "solid" : "outline"}
                        justifyContent="flex-start"
                        height="auto"
                        whiteSpace="normal"
                        textAlign="left"
                        py={3}
                        px={4}
                      >
                        {String.fromCharCode(97 + choiceIndex)}. {choice.text}
                      </Button>
                    ))}
                  </VStack>
                </Box>
              ))}
            </VStack>
          </>
        )}
      </Container>

      <Box
        py={4}
        bgGradient="linear(to-r, blue.500, purple.600)"
        borderTop="1px"
        borderColor="blue.300"
        backdropFilter="blur(8px)"
        boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
      >
        <Container maxW="container.xl">
          <VStack spacing={2}>
            <Link href="/" passHref>
              <Button
                leftIcon={<FaHome />}
                variant="ghost"
                color="white"
                size="lg"
                _hover={{
                  bg: "whiteAlpha.200",
                  transform: "translateY(-2px)"
                }}
                transition="all 0.2s"
              >
                Back to Home
              </Button>
            </Link>
            <Text 
              textAlign="center" 
              fontSize="sm" 
              color="white"
              fontWeight="medium"
            >
              © {new Date().getFullYear()} Read On. Created by Aadhil Mubarak Syed. All rights reserved.
            </Text>
          </VStack>
        </Container>
      </Box>

      <>
        <audio ref={audioRef} />

        <Modal isOpen={isOpen} onClose={onClose} isCentered motionPreset="scale" size="lg">
          <ModalOverlay
            bg="blackAlpha.300"
            backdropFilter="blur(10px)"
          />
          <ModalContent
            mx={4}
            bg="white"
            p={8}
            borderRadius="xl"
            boxShadow="xl"
          >
            <ModalHeader
              textAlign="center"
              fontSize="3xl"
              bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
              bgClip="text"
              fontWeight="bold"
              pb={4}
            >
              Congratulations! 🎉
            </ModalHeader>
            <ModalBody>
              <VStack spacing={6}>
                <Text
                  fontSize="xl"
                  textAlign="center"
                  color="gray.700"
                  fontWeight="medium"
                >
                  {getRandomCongratsMessage()}
                </Text>
                <Text
                  fontSize="lg"
                  textAlign="center"
                  color="gray.600"
                >
                  Score: {score}/{questions.length} ({calculatePercentage()}%)
                </Text>
              </VStack>
            </ModalBody>
            <ModalFooter justifyContent="center" pt={6}>
              <Button
                colorScheme="blue"
                onClick={onClose}
                size="lg"
                px={8}
                py={6}
                fontSize="lg"
                _hover={{
                  transform: "translateY(-2px)",
                  boxShadow: "lg",
                }}
                transition="all 0.2s"
              >
                Read On!
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </>
    </Box>
  )
}

export default WordVisualization
