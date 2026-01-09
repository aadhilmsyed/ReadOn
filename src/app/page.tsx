"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  Textarea,
  useColorModeValue,
  Container,
  Fade,
  SimpleGrid,
  HStack,
  Icon,
  useBreakpointValue,
  useToast,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import Link from "next/link";
import { useText } from "./providers";
import { FaBook, FaHeadphones, FaImages, FaMicrophone, FaLinkedin, FaGithub, FaGraduationCap } from "react-icons/fa";
import Image from 'next/image'
import ParticlesBackground from '../components/ParticlesBackground';
import { CHARACTER_LIMIT, ROUTES } from './constants';

interface FeatureButtonProps {
  href: string;
  title: string;
  description: string;
  icon: React.ElementType;
  isDisabled: boolean;
  onDisabledClick: () => void;
}

const FeatureButton: React.FC<FeatureButtonProps> = ({
  href,
  title,
  description,
  icon,
  isDisabled,
  onDisabledClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (isDisabled) {
      e.preventDefault();
      onDisabledClick();
    }
  };

  return (
    <Link href={href} passHref onClick={handleClick}>
      <Button
        as="div"
        height="auto"
        p={8}
        colorScheme="blue"
        variant="outline"
        width="100%"
        minH="200px"
        cursor={isDisabled ? "not-allowed" : "pointer"}
        transition="all 0.4s ease"
        _hover={{
          transform: isDisabled ? "none" : "translateY(-5px)",
          shadow: isDisabled ? "none" : "2xl",
          borderColor: isDisabled ? "red.400" : "blue.400",
          bg: isDisabled ? "transparent" : "blue.50",
          _after: isDisabled ? {
            content: '"Under Maintenance"',
            position: "absolute",
            bottom: "-25px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "gray.700",
            color: "white",
            padding: "4px 8px",
            borderRadius: "md",
            fontSize: "sm",
            whiteSpace: "nowrap"
          } : {}
        }}
        backdropFilter="blur(8px)"
        display="flex"
        flexDirection="column"
        gap={4}
        opacity={isDisabled ? 0.7 : 1}
        position="relative"
      >
        <Icon as={icon} boxSize={8} color={isDisabled ? "red.500" : "blue.500"} />
        <VStack align="center" spacing={3}>
          <Text 
            fontSize="2xl" 
            fontWeight="bold" 
            textAlign="center"
            color={isDisabled ? "red.500" : "inherit"}
          >
            {title}
          </Text>
          <Text fontSize="md" textAlign="center" color="gray.600">
            {description}
          </Text>
        </VStack>
      </Button>
    </Link>
  );
};

export default function Home() {
  const { inputText, setInputText } = useText();
  const [mounted, setMounted] = useState(false);
  const bgColor = useColorModeValue("gray.50", "gray.900");
  const textColor = useColorModeValue("gray.800", "gray.100");
  const textareaBg = useColorModeValue("white", "gray.700");
  const errorColor = useColorModeValue("red.500", "red.300");
  const cardBg = useColorModeValue("white", "gray.800");
  const toast = useToast();

  const isOverLimit = inputText.length > CHARACTER_LIMIT;
  const isMobile = useBreakpointValue({ base: true, md: false });

  const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  const handleDisabledClick = () => {
    toast({
      title: "Text Too Long",
      description: `Please shorten your text to ${CHARACTER_LIMIT} characters or less before proceeding.`,
      status: "error",
      duration: 5000,
      isClosable: true,
      position: "top",
    });
  };

  return (
    <Box 
      minHeight="100vh" 
      bg={bgColor} 
      color={textColor} 
      position="relative"
      backgroundImage="radial-gradient(circle at 1px 1px, rgba(0, 0, 0, 0.05) 1px, transparent 0)"
      backgroundSize="40px 40px"
    >
      <Alert
        status="warning"
        variant="solid"
        bgGradient="linear(to-r, blue.400, purple.500, pink.500)"
        color="white"
        py={4}
        width="100%"
        borderRadius={0}
        margin={0}
      >
        <Container maxW="container.xl">
          <HStack spacing={3} alignItems="center">
            <AlertIcon />
            <Text fontWeight="bold">
              The Audiobook module is currently under maintenance. We apologize for any inconvenience.
            </Text>
          </HStack>
        </Container>
      </Alert>
      
      <Box py={16} px={8}>
        <Container maxW="container.xl">
          <VStack spacing={16} align="stretch" pb={20}>
            <Fade in={true}>
              <VStack spacing={6}>
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
                  }}
                  transition="all 0.3s ease"
                  mb={4}
                >
                  Read On
                </Heading>
                <VStack spacing={2}>
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
                  <Text
                    fontSize="lg"
                    textAlign="center"
                    color="gray.500"
                    fontStyle="italic"
                  >
                    A CalHacks 11.0 Submission
                  </Text>
                </VStack>
                <Text 
                  fontSize="lg" 
                  textAlign="center" 
                  lineHeight="tall" 
                  maxWidth="1000px"
                  mt={4}
                  mb={2}
                >
                  Read On is an AI-powered reading companion designed to enhance your learning experience
                  through multiple interactive tools. Start by inputting your text in the box below,
                  then select one of the four distinct learning modes:
                </Text>
              </VStack>
            </Fade>

            {/* Text Input Section */}
            <Box
              bg={cardBg}
              p={8}
              borderRadius="xl"
              shadow="lg"
              border="1px"
              borderColor="gray.200"
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
              <VStack spacing={4} width="100%">
                <VStack spacing={1}>
                  <Text fontSize="xl" fontWeight="medium" color="gray.700">
                    Enter Your Text Here
                  </Text>
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Max 3500 Characters
                  </Text>
                  <Text fontSize="sm" color="gray.500" fontStyle="italic">
                    Note: Longer texts may result in longer loading times
                  </Text>
                </VStack>
                <Box width="100%" position="relative">
                  <Textarea
                    placeholder="Type or paste your text here..."
                    size="lg"
                    value={inputText}
                    onChange={handleInputChange}
                    bg={textareaBg}
                    minHeight="300px"
                    resize="vertical"
                    width="100%"
                    borderColor={isOverLimit ? "red.500" : "transparent"}
                    _hover={{
                      borderColor: isOverLimit ? "red.600" : "blue.400",
                    }}
                    _focus={{
                      borderColor: isOverLimit ? "red.700" : "blue.500",
                      boxShadow: "none",
                    }}
                    sx={{
                      '&::-webkit-scrollbar': {
                        width: '8px',
                        borderRadius: '8px',
                        backgroundColor: `rgba(0, 0, 0, 0.05)`,
                      },
                      '&::-webkit-scrollbar-thumb': {
                        backgroundColor: `rgba(0, 0, 0, 0.1)`,
                        borderRadius: '8px',
                      },
                    }}
                    mb={2}
                  />
                </Box>
                
                {mounted && (
                  <HStack 
                    spacing={2} 
                    justify="flex-end"
                    width="100%"
                    px={2}
                  >
                    <Text
                      fontSize="sm"
                      color={isOverLimit ? "red.500" : "gray.500"}
                      fontWeight="medium"
                    >
                      {inputText.length}/{CHARACTER_LIMIT} characters
                    </Text>
                    {isOverLimit && (
                      <Text fontSize="sm" color="red.500" fontWeight="medium">
                        Limit exceeded
                      </Text>
                    )}
                  </HStack>
                )}
              </VStack>
            </Box>

            {/* Features Section */}
            <VStack spacing={8} width="100%" mb={16}>
              <Text 
                fontSize="2xl" 
                fontWeight="bold"
                color="gray.700"
                textAlign="center"
              >
                Choose Your Learning Tool
              </Text>
              <SimpleGrid 
                columns={{ base: 1, md: 2 }} 
                spacing={8} 
                width="100%"
              >
                <FeatureButton
                  href={ROUTES.PHONICS}
                  title="Phonics Practice"
                  description="Enhance phonetic awareness and word-building skills"
                  icon={FaMicrophone}
                  isDisabled={isOverLimit}
                  onDisabledClick={handleDisabledClick}
                />
                <FeatureButton
                  href={ROUTES.COMPREHENSION}
                  title="Reading Comprehension"
                  description="Analyze texts and improve understanding of written content"
                  icon={FaBook}
                  isDisabled={isOverLimit}
                  onDisabledClick={handleDisabledClick}
                />
                <FeatureButton
                  href={ROUTES.VISUALIZATION}
                  title="Word Visualization"
                  description="Explore visual representations of words and their relationships"
                  icon={FaImages}
                  isDisabled={isOverLimit}
                  onDisabledClick={handleDisabledClick}
                />
                <FeatureButton
                  href={ROUTES.AUDIOBOOK}
                  title="Read Aloud"
                  description="Listen to your text being read aloud"
                  icon={FaHeadphones}
                  isDisabled={true}
                  onDisabledClick={() => toast({
                    title: "Under Maintenance",
                    description: "This feature is currently undergoing maintenance. Please check back later.",
                    status: "warning",
                    duration: 3000,
                    isClosable: true,
                    position: "top",
                  })}
                />
              </SimpleGrid>

              <Box width="100%" mt={8}>
                <FeatureButton
                  href={ROUTES.INTERACTIVE}
                  title="Interactive Learning"
                  description="Experience comprehensive learning with all features combined - phonics, comprehension, visualization, and audio in one seamless experience"
                  icon={FaGraduationCap}
                  isDisabled={isOverLimit}
                  onDisabledClick={handleDisabledClick}
                />
              </Box>
            </VStack>

            {/* About Our Application Section */}
            <Box maxWidth="1200px" mx="auto">
              <VStack align="stretch" spacing={8}>
                <Heading as="h2" size="lg" textAlign="center" color="blue.600">
                  More About Read On
                </Heading>
                
                <Text fontSize="lg" textAlign="center" lineHeight="tall">
                  Read On offers four powerful learning tools, each designed to address different aspects 
                  of reading comprehension and learning:
                </Text>

                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8}>
                  <Box 
                    p={6} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor="gray.200"
                    bg="white"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bgGradient: "linear(to-br, white, blue.50)"
                    }}
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={4} color="blue.600">
                      1. Phonics Practice
                    </Text>
                    <Text fontSize="lg" lineHeight="tall">
                      Having trouble with tricky words? Our Phonics Practice tool is like having a 
                      personal reading coach! It helps you break down difficult words into smaller, 
                      easier-to-understand parts. You can listen to how each word should sound, see 
                      how it's pronounced, and practice at your own pace. Perfect for building confidence 
                      with challenging vocabulary and improving your reading skills.
                    </Text>
                  </Box>

                  <Box 
                    p={6} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor="gray.200"
                    bg="white"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bgGradient: "linear(to-br, white, blue.50)"
                    }}
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={4} color="blue.600">
                      2. Reading Comprehension
                    </Text>
                    <Text fontSize="lg" lineHeight="tall">
                      Understanding what you read is just as important as reading itself. This tool 
                      turns your reading into an interactive quiz game! After you read a text, it creates 
                      personalized questions to check your understanding. You'll get instant feedback on 
                      your answers, track your progress, and even celebrate your successes with fun 
                      animations. It's like having a friendly teacher who helps you understand the story 
                      better!
                    </Text>
                  </Box>

                  <Box 
                    p={6} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor="gray.200"
                    bg="white"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bgGradient: "linear(to-br, white, blue.50)"
                    }}
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={4} color="blue.600">
                      3. Word Visualization
                    </Text>
                    <Text fontSize="lg" lineHeight="tall">
                      Sometimes words can paint pictures in our minds - and this tool makes those pictures 
                      real! It creates beautiful, custom images that match what you're reading about. 
                      Whether it's a story about space exploration or a description of a peaceful garden, 
                      our tool brings these words to life through pictures. This helps you remember and 
                      understand what you're reading in a fun, visual way.
                    </Text>
                  </Box>

                  <Box 
                    p={6} 
                    borderWidth="1px" 
                    borderRadius="lg" 
                    borderColor="gray.200"
                    bg="white"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bgGradient: "linear(to-br, white, blue.50)"
                    }}
                  >
                    <Text fontSize="lg" fontWeight="bold" mb={4} color="blue.600">
                      4. Read Aloud
                    </Text>
                    <Text fontSize="lg" lineHeight="tall">
                      Want to hear your text come to life? Our Read Aloud feature is like having a 
                      friendly storyteller right beside you! It reads your text out loud while highlighting 
                      each word as it goes, making it easy to follow along. This is great for learning 
                      how words should sound, improving your pronunciation, or just giving your eyes a 
                      rest while you listen. You can pause, replay, and learn at your own speed.
                    </Text>
                  </Box>
                </SimpleGrid>

                <Text fontSize="lg" textAlign="center" lineHeight="tall">
                  These four tools work together to make reading more fun and accessible for everyone. 
                  Whether you learn better by seeing, hearing, or doing, Read On adapts to your unique 
                  way of learning. It's like having a whole team of friendly teachers ready to help you 
                  succeed in your reading journey!
                </Text>
              </VStack>
            </Box>

            {/* Meet the Developers Section */}
            <Box maxWidth="1000px" mx="auto">
              <VStack align="stretch" spacing={8} mt={12}>
                <Heading as="h2" size="lg" textAlign="center" color="blue.600">
                  Meet the Developers
                </Heading>
                
                <SimpleGrid 
                  columns={{ base: 1, md: 3 }} 
                  spacing={40}
                  maxWidth="1600px"
                  mx="auto"
                >
                  {/* Aadhil */}
                  <VStack 
                    spacing={4}
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-8px)"
                    }}
                  >
                    <Box
                      position="relative"
                      width="250px"
                      height="250px"
                      borderRadius="full"
                      overflow="hidden"
                      boxShadow="xl"
                      transition="all 0.3s ease"
                      _hover={{
                        boxShadow: "2xl",
                        transform: "scale(1.05)"
                      }}
                    >
                      <Image
                        src="/authors/aadhil.png"
                        alt="Aadhil"
                        width={250}
                        height={250}
                        style={{ objectFit: 'cover' }}
                        priority
                      />
                    </Box>
                    <VStack spacing={1} width="350px">
                      <Text fontSize="xl" fontWeight="bold">
                        Aadhil Mubarak Syed
                      </Text>
                      <Text fontSize="md" color="gray.600" textAlign="center" whiteSpace="pre-line">
                        Computer Science & Statistical Data Science{'\n'}
                        UC Davis '25
                      </Text>
                      <HStack spacing={4}>
                        <Link href="https://www.linkedin.com/in/aadhilmsyed/" target="_blank" rel="noopener noreferrer">
                          <Icon 
                            as={FaLinkedin} 
                            boxSize={6} 
                            color="blue.500" 
                            _hover={{ color: "blue.600" }}
                          />
                        </Link>
                        <Link href="https://github.com/aadhilmsyed" target="_blank" rel="noopener noreferrer">
                          <Icon 
                            as={FaGithub} 
                            boxSize={6} 
                            color="gray.700" 
                            _hover={{ color: "gray.800" }}
                          />
                        </Link>
                      </HStack>
                    </VStack>
                  </VStack>

                  {/* Asad */}
                  <VStack 
                    spacing={4}
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-8px)"
                    }}
                  >
                    <Box
                      position="relative"
                      width="250px"
                      height="250px"
                      borderRadius="full"
                      overflow="hidden"
                      boxShadow="xl"
                      transition="all 0.3s ease"
                      _hover={{
                        boxShadow: "2xl",
                        transform: "scale(1.05)"
                      }}
                    >
                      <Image
                        src="/authors/asad.png"
                        alt="Asad"
                        width={250}
                        height={250}
                        style={{ objectFit: 'cover' }}
                        priority
                      />
                    </Box>
                    <VStack spacing={1} width="350px">
                      <Text fontSize="xl" fontWeight="bold">
                        Asad Shahid
                      </Text>
                      <Text fontSize="md" color="gray.600" textAlign="center" whiteSpace="pre-line">
                        Statistics & Data Science{'\n'}
                        UC Berkeley '26
                      </Text>
                      <HStack spacing={4}>
                        <Link href="https://www.linkedin.com/in/asadshahid04/" target="_blank" rel="noopener noreferrer">
                          <Icon 
                            as={FaLinkedin} 
                            boxSize={6} 
                            color="blue.500" 
                            _hover={{ color: "blue.600" }}
                          />
                        </Link>
                        <Link href="https://github.com/AsadShahid04" target="_blank" rel="noopener noreferrer">
                          <Icon 
                            as={FaGithub} 
                            boxSize={6} 
                            color="gray.700" 
                            _hover={{ color: "gray.800" }}
                          />
                        </Link>
                      </HStack>
                    </VStack>
                  </VStack>

                  {/* Yousef */}
                  <VStack 
                    spacing={4}
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-8px)"
                    }}
                  >
                    <Box
                      position="relative"
                      width="250px"
                      height="250px"
                      borderRadius="full"
                      overflow="hidden"
                      boxShadow="xl"
                      transition="all 0.3s ease"
                      _hover={{
                        boxShadow: "2xl",
                        transform: "scale(1.05)"
                      }}
                    >
                      <Image
                        src="/authors/yousef.png"
                        alt="Yousef"
                        width={250}
                        height={250}
                        style={{ objectFit: 'cover' }}
                        priority
                      />
                    </Box>
                    <VStack spacing={1} width="350px">
                      <Text fontSize="xl" fontWeight="bold">
                        Yousef Saad Al-Din
                      </Text>
                      <Text fontSize="md" color="gray.600" textAlign="center" whiteSpace="pre-line">
                        Computer Science{'\n'}
                        UC Berkeley '27
                      </Text>
                      <HStack spacing={4}>
                        <Link href="https://www.linkedin.com/in/ywsf/" target="_blank" rel="noopener noreferrer">
                          <Icon 
                            as={FaLinkedin} 
                            boxSize={6} 
                            color="blue.500" 
                            _hover={{ color: "blue.600" }}
                          />
                        </Link>
                        <Link href="https://github.com/YOUSEFSAADELDIN" target="_blank" rel="noopener noreferrer">
                          <Icon 
                            as={FaGithub} 
                            boxSize={6} 
                            color="gray.700" 
                            _hover={{ color: "gray.800" }}
                          />
                        </Link>
                      </HStack>
                    </VStack>
                  </VStack>
                </SimpleGrid>
              </VStack>
            </Box>

            {/* Why We Built Read On Section */}
            <Box maxWidth="800px" mx="auto">
              <VStack align="stretch" spacing={8} mt={6}>
                <Heading as="h2" size="lg" textAlign="center" color="blue.600">
                  Why We Built Read On
                </Heading>
                
                <Text fontSize="lg" textAlign="left" lineHeight="tall">
                  Having worked with children with learning disabilities , we have witnessed firsthand the 
                  unique challenges these remarkable young minds face in their educational journey. 
                  Traditional learning methods often fall short in addressing their diverse needs, leaving 
                  many bright and capable students struggling to reach their full potential. This personal 
                  experience has been the driving force behind Read On, born from a deep-seated desire to 
                  create a tool that adapts to each child's unique learning style and pace.
                </Text>

                <Text fontSize="lg" textAlign="left" lineHeight="tall">
                  Read On harnesses the power of artificial intelligence to transform the learning experience 
                  for special needs children. By combining visual, auditory, and interactive elements, we've 
                  created a comprehensive platform that breaks down traditional barriers to learning. Whether 
                  it's using AI-generated images to help visual learners grasp complex concepts, providing 
                  phonetic breakdowns for those struggling with reading, or offering text-to-speech capabilities 
                  for auditory learners, every feature has been thoughtfully designed to support and empower 
                  these extraordinary children. Our goal is not just to assist in their learning journey, but 
                  to help build their confidence and independence, proving that with the right tools, every 
                  child can thrive.
                </Text>
                <Text fontSize="lg" textAlign="left" lineHeight="tall">
                  We hope that through our application, we can help people of all skill levels overcome 
                  their learning barriers and <Text as="span" fontStyle="italic">Read On</Text>.
                </Text>
              </VStack>
            </Box>

            {/* Decorative Image */}
            <Box maxWidth="600px" mx="auto" mt={4} mb={8}>
              <VStack spacing={2}>
                <Image
                  src="/ReadaBook.png"
                  alt="Reading illustration"
                  width={600}
                  height={400}
                  style={{ objectFit: 'contain' }}
                  priority
                />
                <Text 
                  fontSize="md" 
                  color="gray.600" 
                  fontStyle="italic"
                  textAlign="center"
                >
                  A mother and a child read a book together
                </Text>
              </VStack>
            </Box>

            {/* Tech Stack Section */}
            <Box maxWidth="1200px" mx="auto" mb={16} textAlign="center">
              <VStack spacing={6}>
                <Heading as="h2" size="md" color="gray.600">
                  Built With
                </Heading>
                <SimpleGrid 
                  columns={{ base: 2, md: 4 }} 
                  spacing={12}
                  width="100%"
                  px={4}
                >
                  <VStack 
                    spacing={3}
                    p={6}
                    borderRadius="xl"
                    bg="white"
                    shadow="sm"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bg: "blue.50"
                    }}
                  >
                    <Text fontWeight="bold" color="gray.700">Frontend</Text>
                    <VStack spacing={2} color="gray.500">
                      <Text>Next.js 14</Text>
                      <Text>React</Text>
                      <Text>TypeScript</Text>
                      <Text>Chakra UI</Text>
                    </VStack>
                  </VStack>

                  <VStack 
                    spacing={3}
                    p={6}
                    borderRadius="xl"
                    bg="white"
                    shadow="sm"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bg: "blue.50"
                    }}
                  >
                    <Text fontWeight="bold" color="gray.700">Backend</Text>
                    <VStack spacing={2} color="gray.500">
                      <Text>Python</Text>
                      <Text>FastAPI</Text>
                      <Text>Node.js</Text>
                    </VStack>
                  </VStack>

                  <VStack 
                    spacing={3}
                    p={6}
                    borderRadius="xl"
                    bg="white"
                    shadow="sm"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bg: "blue.50"
                    }}
                  >
                    <Text fontWeight="bold" color="gray.700">AI Services</Text>
                    <VStack spacing={2} color="gray.500">
                      <Text>GPT-4</Text>
                      <Text>DALL-E 3</Text>
                      <Text>Google Gemini</Text>
                      <Text>Whisper</Text>
                      <Text>TTS</Text>
                    </VStack>
                  </VStack>

                  <VStack 
                    spacing={3}
                    p={6}
                    borderRadius="xl"
                    bg="white"
                    shadow="sm"
                    transition="all 0.3s ease"
                    _hover={{
                      transform: "translateY(-2px)",
                      shadow: "md",
                      bg: "blue.50"
                    }}
                  >
                    <Text fontWeight="bold" color="gray.700">APIs</Text>
                    <VStack spacing={2} color="gray.500">
                      <Text>OpenAI</Text>
                      <Text>Merriam-Webster</Text>
                      <Text>Vercel</Text>
                    </VStack>
                  </VStack>
                </SimpleGrid>
              </VStack>
            </Box>

            {/* Footer */}
            <Box
              position="absolute"
              bottom={0}
              left={0}
              right={0}
              py={4}
              bgGradient="linear(to-r, blue.500, purple.600)"
              borderTop="1px"
              borderColor="blue.300"
              backdropFilter="blur(8px)"
              boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
            >
              <Container maxW="container.xl">
                <VStack spacing={2}>
                  <HStack spacing={4}>
                    <Link 
                      href="https://github.com/AsadShahid04/ReadOn" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Button
                        leftIcon={<FaGithub />}
                        variant="ghost"
                        color="white"
                        _hover={{
                          bg: "whiteAlpha.200",
                          transform: "translateY(-2px)"
                        }}
                        transition="all 0.2s"
                      >
                        View GitHub Repository
                      </Button>
                    </Link>
                  </HStack>
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
          </VStack>
        </Container>
      </Box>
    </Box>
  );
}
