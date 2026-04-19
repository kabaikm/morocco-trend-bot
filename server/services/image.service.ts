import axios from 'axios';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBJX2cdf5UkmyiffNKfeESTrZNqamWLN5Y';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface ImageGenerationRequest {
  topic: string;
  title?: string;
  style?: 'professional' | 'creative' | 'minimal' | 'vibrant';
  width?: number;
  height?: number;
}

export interface ImageGenerationResponse {
  imageUrl: string;
  prompt: string;
  generatedAt: Date;
}

export class ImageService {
  /**
   * Generate LinkedIn-optimized image using Gemini API
   * LinkedIn recommends 1200x627 pixels for optimal display
   */
  static async generateLinkedInImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const { topic, title, style = 'professional' } = request;

      // Create optimized prompt for LinkedIn professional images
      const prompt = this.createLinkedInPrompt(topic, title, style);

      console.log('Generating image with Gemini API for topic:', topic);
      console.log('Prompt:', prompt);

      // Call Gemini API to generate image
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // Extract image URL from response
      const imageUrl = this.extractImageUrl(response.data);

      if (!imageUrl) {
        throw new Error('No image URL in Gemini response');
      }

      return {
        imageUrl,
        prompt,
        generatedAt: new Date(),
      };
    } catch (error: any) {
      console.error('Error generating image with Gemini:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Fallback to placeholder if Gemini fails
      return this.generatePlaceholderImage(request);
    }
  }

  /**
   * Create optimized prompt for LinkedIn professional images
   */
  private static createLinkedInPrompt(topic: string, title?: string, style: string = 'professional'): string {
    const styleGuides = {
      professional: 'Clean, modern, corporate aesthetic with professional colors (blues, grays, whites)',
      creative: 'Vibrant, artistic, eye-catching design with creative elements',
      minimal: 'Minimalist design with lots of white space, simple geometric shapes',
      vibrant: 'Bold colors, energetic, dynamic composition with strong visual impact',
    };

    const styleGuide = styleGuides[style as keyof typeof styleGuides] || styleGuides.professional;

    return `Create a professional LinkedIn post image for the topic: "${topic}".
Title: ${title || topic}

Requirements:
- Dimensions: 1200x627 pixels (LinkedIn standard)
- Style: ${styleGuide}
- Include relevant icons or graphics related to the topic
- Add subtle background with the main content in the center
- Professional typography with clear hierarchy
- Color scheme: Modern and professional
- No text overlay required, just visual design
- High quality, suitable for LinkedIn social media
- Modern design trends, 2024 style

Generate a visually appealing image that represents this topic professionally.`;
  }

  /**
   * Extract image URL from Gemini API response
   */
  private static extractImageUrl(response: any): string | null {
    try {
      // Gemini returns content in different formats
      if (response.candidates && response.candidates[0]) {
        const candidate = response.candidates[0];

        // Check for inline data (base64 image)
        if (candidate.content?.parts?.[0]?.inlineData?.data) {
          const base64Data = candidate.content.parts[0].inlineData.data;
          const mimeType = candidate.content.parts[0].inlineData.mimeType || 'image/jpeg';
          return `data:${mimeType};base64,${base64Data}`;
        }

        // Check for text response with image URL
        if (candidate.content?.parts?.[0]?.text) {
          const text = candidate.content.parts[0].text;
          // Try to extract URL from text
          const urlMatch = text.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            return urlMatch[0];
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting image URL:', error);
      return null;
    }
  }

  /**
   * Generate placeholder image as fallback
   */
  private static generatePlaceholderImage(request: ImageGenerationRequest): ImageGenerationResponse {
    const { topic, title } = request;
    const encodedTopic = encodeURIComponent(title || topic);

    // Use a better placeholder service with more styling options
    const placeholderUrl = `https://via.placeholder.com/1200x627/1f2937/ffffff?text=${encodedTopic}`;

    return {
      imageUrl: placeholderUrl,
      prompt: `Placeholder image for: ${topic}`,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate multiple image variations
   */
  static async generateImageVariations(
    request: ImageGenerationRequest,
    count: number = 3
  ): Promise<ImageGenerationResponse[]> {
    const results: ImageGenerationResponse[] = [];

    const styles: Array<'professional' | 'creative' | 'minimal' | 'vibrant'> = [
      'professional',
      'creative',
      'minimal',
    ];

    for (let i = 0; i < Math.min(count, styles.length); i++) {
      try {
        const result = await this.generateLinkedInImage({
          ...request,
          style: styles[i],
        });
        results.push(result);
      } catch (error) {
        console.error(`Error generating variation ${i + 1}:`, error);
      }
    }

    return results;
  }

  /**
   * Validate image URL is accessible
   */
  static async validateImageUrl(imageUrl: string): Promise<boolean> {
    try {
      if (imageUrl.startsWith('data:')) {
        return true; // Base64 images are always valid
      }

      const response = await axios.head(imageUrl, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('Image URL validation failed:', error);
      return false;
    }
  }
}
