import type { Metadata } from "next";
import localFont from "next/font/local";
import './globals.css';
import ChakraProviderWrapper from './ChakraProviderWrapper';
import { TextProvider } from './TextContext';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Read On - Your AI Reading Companion",
  description: "Enhance your reading skills with our interactive tools.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TextProvider>
          <ChakraProviderWrapper>
            {children}
          </ChakraProviderWrapper>
        </TextProvider>
      </body>
    </html>
  );
}
