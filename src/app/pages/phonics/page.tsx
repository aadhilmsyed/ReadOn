'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Box, Button, VStack, HStack, Text, Heading, Flex, Spinner, IconButton, Container, Fade } from '@chakra-ui/react'
import { FaVolumeUp, FaArrowLeft, FaArrowRight, FaHome } from 'react-icons/fa'
import Link from 'next/link'
import { useText } from '../../providers'
import { motion, AnimatePresence } from 'framer-motion'
import { getCachedPhonetics, phoneticsCache } from '../../../utils/caches'
import type { WordData } from '../../types'

const Phonics = () => {
  const { inputText } = useText()
  const [words, setWords] = useState<WordData[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [direction, setDirection] = useState(0);
  const [dataSource, setDataSource] = useState<'cache' | 'api' | null>(null);

  const processText = async () => {
    if (!inputText) return;
    setLoading(true);

    try {
      // Check cache first
      const cachedData = getCachedPhonetics(inputText);
      if (cachedData) {
        console.log('Using cached phonetics data');
        setDataSource('cache');
        setWords(cachedData);
        setLoading(false);
        return;
      }

      // If not in cache, fetch from API
      const response = await fetch('/api/phonetics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch word data');
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        console.log('Fetched from API');
        setDataSource('api');
        phoneticsCache.put(inputText, data);
        setWords(data);
      }
    } catch (error) {
      console.error('Error processing text:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    processText();
  }, [inputText]);

  const playAudio = async () => {
    const currentWord = words[currentIndex]
    if (currentWord.audio_url && audioRef.current) {
      audioRef.current.src = currentWord.audio_url
      try {
        await audioRef.current.play()
      } catch (error) {
        console.error('Error playing audio:', error)
      }
    }
  }

  const nextWord = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % words.length);
  };

  const prevWord = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + words.length) % words.length);
  };

  useEffect(() => {
    console.log('Current cache size:', phoneticsCache.getSize());
    phoneticsCache.debug();
  }, [words]);

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
            <Box 
              as={Link} 
              href="/"
              _hover={{ textDecoration: 'none' }}
            >
              <Heading 
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
            </Box>
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
            <Text fontSize="lg" color="gray.600">Loading phonetics data...</Text>
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
              <Box 
                as={Link}
                href="/"
                _hover={{ textDecoration: 'none' }}
              >
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
              </Box>
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

  if (words.length === 0) {
    return (
      <Box 
        minHeight="100vh" 
        py={16} 
        px={8}
        backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
        backgroundSize="40px 40px"
      >
        <Container maxW="container.lg">
          <VStack spacing={8} align="stretch">
            <Heading 
              as="h1" 
              size="2xl" 
              textAlign="center"
              bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
              bgClip="text"
              fontWeight="extrabold"
              letterSpacing="tight"
            >
              Word Phonetics
            </Heading>
            <Text 
              textAlign="center" 
              fontSize="xl"
              color="gray.600"
            >
              No words available. Please enter some text with less common words on the home page.
            </Text>
            <Link href="/" passHref>
              <Button 
                as="a" 
                colorScheme="blue"
                size="lg"
                width="200px"
                mx="auto"
                display="block"
                _hover={{
                  transform: "translateY(-2px)",
                  boxShadow: "lg",
                }}
                transition="all 0.2s"
              >
                Back to Home
              </Button>
            </Link>
          </VStack>
        </Container>
      </Box>
    )
  }

  return (
    <Box 
      minHeight="100vh" 
      backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
      backgroundSize="40px 40px"
      position="relative"
      display="flex"
      flexDirection="column"
      pb={20}
    >
      <Container 
        maxW="container.lg" 
        flex="1"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        pt={8}
      >
        <VStack 
          spacing={8}
          align="stretch"
          flex="1"
        >
          <Fade in={true}>
            <VStack spacing={8}>
              <Box 
                as={Link} 
                href="/"
                _hover={{ textDecoration: 'none' }}
              >
                <Heading 
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
              </Box>
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
                Word Phonetics
              </Heading>
              <Text 
                fontSize="lg" 
                textAlign="center" 
                color="gray.600"
                maxW="800px"
                mx="auto"
                lineHeight="tall"
                mb={4}
              >
                Practice pronunciation with our interactive flashcards. Each card shows the word and its 
                phonetic spelling, with an audio button to hear the correct pronunciation. Use the arrows 
                to navigate through your word list.
              </Text>
            </VStack>
          </Fade>

          <Flex 
            align="center" 
            justify="center" 
            position="relative" 
            minH="400px"
            flex="1"
            mb={12}
          >
            <IconButton
              aria-label="Previous word"
              icon={<FaArrowLeft />}
              onClick={prevWord}
              position="absolute"
              left="-20px"
              top="50%"
              transform="translateY(-50%)"
              colorScheme="purple"
              size="lg"
              isRound
              zIndex={2}
              _hover={{
                transform: "translateY(-50%) scale(1.1)",
              }}
              transition="all 0.2s"
            />

            <Box position="relative" width="80%" height="400px">
              <AnimatePresence initial={false} mode="wait" custom={direction}>
                <motion.div
                  key={currentIndex}
                  custom={direction}
                  variants={{
                    enter: (direction) => ({
                      x: direction > 0 ? 1000 : -1000,
                      opacity: 0
                    }),
                    center: {
                      zIndex: 1,
                      x: 0,
                      opacity: 1
                    },
                    exit: (direction) => ({
                      zIndex: 0,
                      x: direction < 0 ? 1000 : -1000,
                      opacity: 0
                    })
                  }}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 500, damping: 35 },
                    opacity: { duration: 0.05 }
                  }}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%'
                  }}
                >
                  <Box 
                    bg="white" 
                    p={8}
                    borderRadius="xl" 
                    boxShadow="xl" 
                    height="100%"
                    position="relative"
                    _before={{
                      content: '""',
                      position: "absolute",
                      top: 0,
                      right: 0,
                      bottom: 0,
                      left: 0,
                      zIndex: -1,
                      background: "linear-gradient(45deg, #4299E1, #805AD5)",
                      borderRadius: "xl",
                      margin: "-2px",
                    }}
                  >
                    <VStack spacing={6} align="center" height="100%" justify="center">
                      <Text 
                        fontSize="5xl"
                        fontWeight="bold" 
                        textAlign="center"
                        bgGradient="linear(to-r, blue.500, purple.500)"
                        bgClip="text"
                      >
                        {words[currentIndex].word}
                      </Text>
                      <Text fontSize="2xl" textAlign="center" color="gray.600">
                        {words[currentIndex].phonetic}
                      </Text>
                      <Text 
                        fontSize="md" 
                        textAlign="center" 
                        color="gray.500"
                        maxW="80%"
                        fontStyle="italic"
                      >
                        {words[currentIndex].definition}
                      </Text>
                      {words[currentIndex].audio_url && (
                        <IconButton
                          aria-label="Play pronunciation"
                          icon={<FaVolumeUp />}
                          onClick={playAudio}
                          colorScheme="blue"
                          size="lg"
                          isRound
                          _hover={{
                            transform: "scale(1.1)",
                          }}
                          transition="all 0.2s"
                        />
                      )}
                      <Text fontSize="sm" color="gray.500" position="absolute" bottom="4">
                        Word {currentIndex + 1} of {words.length}
                      </Text>
                    </VStack>
                    <audio ref={audioRef} />
                  </Box>
                </motion.div>
              </AnimatePresence>
            </Box>

            <IconButton
              aria-label="Next word"
              icon={<FaArrowRight />}
              onClick={nextWord}
              position="absolute"
              right="-20px"
              top="50%"
              transform="translateY(-50%)"
              colorScheme="purple"
              size="lg"
              isRound
              zIndex={2}
              _hover={{
                transform: "translateY(-50%) scale(1.1)",
              }}
              transition="all 0.2s"
            />
          </Flex>
        </VStack>
      </Container>

      <Box
        position="fixed"
        bottom={0}
        left={0}
        right={0}
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
            <Box 
              as={Link}
              href="/"
              _hover={{ textDecoration: 'none' }}
            >
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
            </Box>
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

export default Phonics
