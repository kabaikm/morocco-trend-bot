import axios from 'axios';

// Using Pollinations.ai - Completely free, no API key needed, unlimited requests
const POLLINATIONS_API_URL = 'https://image.pollinations.ai/prompt';

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
   * Generate LinkedIn-optimized image using Pollinations.ai (completely free)
   * LinkedIn recommends 1200x627 pixels for optimal display
   */
  static async generateLinkedInImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
    try {
      const { topic, title, style = 'professional' } = request;

      // Create optimized prompt for LinkedIn professional images
      const prompt = this.createLinkedInPrompt(topic, title, style);

      console.log('Generating image with Pollinations.ai for topic:', topic);
      console.log('Prompt:', prompt);

      // Generate image using Pollinations.ai
      const imageUrl = this.generatePollinationsUrl(prompt);

      console.log('✅ Image URL generated:', imageUrl);

      return {
        imageUrl,
        prompt,
        generatedAt: new Date(),
      };
    } catch (error: any) {
      console.error('Error generating image:', error.message);

      // Fallback to placeholder if generation fails
      return this.generatePlaceholderImage(request);
    }
  }

  /**
   * Generate Pollinations.ai image URL
   * Pollinations.ai generates images on-demand when the URL is accessed
   */
  private static generatePollinationsUrl(prompt: string): string {
    // Encode the prompt for URL
    const encodedPrompt = encodeURIComponent(prompt);

    // Pollinations.ai format: /prompt/{prompt}?width=1200&height=627&model=flux&seed={random}
    const width = 1200;
    const height = 627;
    const seed = Math.floor(Math.random() * 1000000);

    return `${POLLINATIONS_API_URL}/${encodedPrompt}?width=${width}&height=${height}&model=flux&seed=${seed}`;
  }

  /**
   * Create optimized prompt for LinkedIn professional images
   */
  private static createLinkedInPrompt(topic: string, title?: string, style: string = 'professional'): string {
    const styleGuides = {
      professional:
        'Clean, modern, corporate aesthetic. Professional colors: blues, grays, whites. Minimalist design. High quality, 4K.',
      creative:
        'Vibrant, artistic, eye-catching design. Creative elements and bold colors. Modern art style. High quality, 4K.',
      minimal:
        'Minimalist design with lots of white space. Simple geometric shapes. Clean typography. Elegant and professional.',
      vibrant: 'Bold colors, energetic, dynamic composition. Strong visual impact. Modern design. High quality, 4K.',
    };

    const styleGuide = styleGuides[style as keyof typeof styleGuides] || styleGuides.professional;

    return `Professional LinkedIn post image about: "${topic}".
Title: ${title || topic}

Style: ${styleGuide}
Requirements:
- Include relevant icons or graphics related to "${topic}"
- Subtle professional background
- Main content centered
- Professional typography
- Modern 2024 design trends
- No text overlay needed, just visual design
- Suitable for LinkedIn social media
- 1200x627 pixels aspect ratio
- High quality, professional appearance
- Business-appropriate imagery`;
  }

  /**
   * Generate placeholder image as fallback
   */
  private static generatePlaceholderImage(request: ImageGenerationRequest): ImageGenerationResponse {
    const { topic, title } = request;
    const encodedTopic = encodeURIComponent(title || topic);

    // Use a better placeholder service
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
