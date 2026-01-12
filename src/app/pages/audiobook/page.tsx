"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Box, Heading, Text, VStack, Button, Spinner, useToast, Container, Flex } from "@chakra-ui/react";
import { useText } from "../../providers";
import Link from "next/link";
import { FaHome, FaBackward, FaForward, FaPlay, FaPause } from 'react-icons/fa';
import { Slider, SliderTrack, SliderFilledTrack, SliderThumb, HStack } from "@chakra-ui/react";
import { getCachedAudio, audiobookCache } from '../../../utils/caches';

const Audiobook = () => {
  const { inputText } = useText();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [audioReady, setAudioReady] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const words = inputText.split(/\s+/);
  const toast = useToast();
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [audioData, setAudioData] = useState<ArrayBuffer | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const generateAudio = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check cache first
      const cachedAudioData = getCachedAudio(inputText);
      if (cachedAudioData) {
        console.log('Using cached audio');
        setAudioData(cachedAudioData);
        const url = URL.createObjectURL(new Blob([cachedAudioData], { type: 'audio/mpeg' }));
        setAudioUrl(url);
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.onloadeddata = () => {
            setAudioReady(true);
          };
        }
        setIsLoading(false);
        return;
      }

      const response = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate audio");
      }

      const audioBuffer = await response.arrayBuffer();
      audiobookCache.put(inputText, audioBuffer);
      setAudioData(audioBuffer);
      
      const url = URL.createObjectURL(new Blob([audioBuffer], { type: 'audio/mpeg' }));
      setAudioUrl(url);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.onloadeddata = () => {
          setAudioReady(true);
        };
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [inputText, toast]);

  useEffect(() => {
    if (inputText) {
      generateAudio();
      setAudioReady(false);
      setAudioUrl(null);
    }
  }, [inputText, generateAudio]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        await audioRef.current.pause();
      } else {
        if (audioRef.current.ended) {
          audioRef.current.currentTime = 0;
        }
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error("Playback error:", error);
      toast({
        title: "Playback Error",
        description: "Failed to play audio. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const currentTime = audioRef.current.currentTime;
      const duration = audioRef.current.duration;
      const wordIndex = Math.floor((currentTime / duration) * words.length);
      if (wordIndex >= 0 && wordIndex < words.length) {
        setCurrentWordIndex(wordIndex);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const handleSliderChange = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  const skipBackward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(audioRef.current.currentTime - 10, 0);
    }
  };

  const skipForward = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(audioRef.current.currentTime + 10, duration);
    }
  };

  if (isLoading) {
    return (
      <Box 
        minHeight="100vh" 
        display="flex"
        flexDirection="column"
        backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
        backgroundSize="40px 40px"
        position="relative"
        pb={20}
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

        <Flex 
          flex="1" 
          alignItems="center" 
          justifyContent="center"
        >
          <VStack spacing={4}>
            <Spinner size="xl" color="blue.500" thickness="4px" />
            <Text fontSize="lg" color="gray.600">Generating audio...</Text>
            <Text fontSize="md" color="gray.500">This may take a few minutes.</Text>
          </VStack>
        </Flex>

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
    );
  }

  if (!mounted) {
    return null;
  }

  return (
    <Box 
      minHeight="100vh" 
      backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
      backgroundSize="40px 40px"
      position="relative"
      pb={32}
    >
      <Container maxW="container.lg" pt={8}>
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
            Read Aloud
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
            Listen to your text being read aloud while following along with highlighted words. 
            Use the audio controls to play, pause, or skip through the content at your own pace.
          </Text>

          <Box 
            borderWidth={1} 
            borderRadius="lg" 
            p={4} 
            maxHeight="60vh" 
            overflowY="auto"
            bg="white"
            boxShadow="xl"
          >
            <Text fontSize="lg" lineHeight="tall">
              {words.map((word, index) => (
                <Text
                  key={index}
                  as="span"
                  bg={index === currentWordIndex ? "yellow.200" : "transparent"}
                  display="inline-block"
                  mx={1}
                >
                  {word}
                </Text>
              ))}
            </Text>
          </Box>

          <audio
            ref={audioRef}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                handleTimeUpdate();
              }
            }}
            onLoadedMetadata={() => {
              if (audioRef.current) {
                setDuration(audioRef.current.duration);
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              setCurrentWordIndex(-1);
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          <Box
            p={6}
            borderRadius="full"
            bg="white"
            boxShadow="xl"
            width="100%"
            height="160px"
            textAlign="center"
            border="1px solid"
            borderColor="gray.200"
            transition="all 0.3s ease"
            _hover={{
              transform: "translateY(-2px)",
              boxShadow: "2xl"
            }}
            position="relative"
            mx="auto"
          >
            <VStack spacing={6} height="100%" justify="center">
              <Box position="relative" width="90%">
                <Slider
                  aria-label="audio-progress"
                  value={currentTime}
                  min={0}
                  max={duration}
                  onChange={handleSliderChange}
                  width="100%"
                >
                  <SliderTrack bg="gray.200" height="4px">
                    <SliderFilledTrack bg="blue.500" />
                  </SliderTrack>
                  <SliderThumb boxSize={4} />
                </Slider>
                
                <Text 
                  fontSize="md" 
                  color="gray.600" 
                  fontWeight="medium"
                  position="absolute"
                  bottom="-6"
                  left="0"
                >
                  {formatTime(currentTime)}
                </Text>
                
                <Text 
                  fontSize="md" 
                  color="gray.600" 
                  fontWeight="medium"
                  position="absolute"
                  bottom="-6"
                  right="0"
                >
                  {formatTime(duration)}
                </Text>
              </Box>

              <HStack spacing={12} justify="center" mt={-4}>
                <Button
                  onClick={skipBackward}
                  colorScheme="blue"
                  variant="ghost"
                  size="lg"
                  isDisabled={!audioReady}
                  _hover={{ transform: "translateY(-2px)" }}
                  transition="all 0.2s"
                >
                  <FaBackward />
                </Button>

                <Button
                  onClick={togglePlayPause}
                  colorScheme="blue"
                  size="lg"
                  isDisabled={!audioReady}
                  width="60px"
                  height="60px"
                  borderRadius="full"
                  _hover={{
                    transform: "translateY(-2px)",
                    boxShadow: "xl",
                  }}
                  _active={{
                    transform: "translateY(1px)"
                  }}
                  transition="all 0.2s"
                  bgGradient="linear(to-r, blue.400, purple.500)"
                  _disabled={{
                    opacity: 0.6,
                    cursor: "not-allowed",
                    transform: "none"
                  }}
                >
                  {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
                </Button>

                <Button
                  onClick={skipForward}
                  colorScheme="blue"
                  variant="ghost"
                  size="lg"
                  isDisabled={!audioReady}
                  _hover={{ transform: "translateY(-2px)" }}
                  transition="all 0.2s"
                >
                  <FaForward />
                </Button>
              </HStack>
            </VStack>
          </Box>
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
  );
};

export default Audiobook;
