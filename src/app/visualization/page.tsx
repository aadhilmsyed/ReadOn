'use client'

import { Box, Heading, Text, VStack, Image, Spinner, Button, Container } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { useText } from '../providers'
import Link from 'next/link'
import { FaHome } from 'react-icons/fa'
import { getCachedVisualization, visualizationCache } from '../../utils/caches'
import type { VisualizationResult } from '../../utils/caches'

const WordVisualization = () => {
  const { inputText } = useText()
  const [results, setResults] = useState<VisualizationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (inputText) {
      generateImages(inputText)
    }
  }, [inputText])

  const generateImages = async (text: string) => {
    setLoading(true)
    setError(null)
    try {
      const cachedResult = getCachedVisualization(text)
      if (cachedResult) {
        console.log('Using cached visualization results')
        setResults(cachedResult.results)
        setLoading(false)
        return
      }

      const response = await fetch('/api/visualization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      if (!data.results || data.results.length === 0) {
        throw new Error('No images were generated')
      }

      visualizationCache.put(text, data)
      setResults(data.results)
    } catch (error) {
      console.error('Error generating images:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
    }
    setLoading(false)
  }

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
            <Text fontSize="lg" color="gray.600">Generating visualizations...</Text>
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
            Text Visualization
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
            Transform your text into vivid images. Our AI analyzes your content and creates custom 
            visualizations for each segment, helping you better understand and remember what you read 
            through visual associations.
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
                  {result.segment}
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
    </Box>
  )
}

export default WordVisualization
