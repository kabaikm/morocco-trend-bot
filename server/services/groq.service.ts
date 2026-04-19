import axios from 'axios';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

if (!GROQ_API_KEY) {
  console.warn('Warning: GROQ_API_KEY environment variable not set. Content generation will use fallback templates.');
}
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface ContentGenerationRequest {
  topic: string;
  style?: 'professional' | 'creative' | 'casual' | 'thought-leadership';
  language?: string;
  includeHashtags?: boolean;
}

export interface GeneratedContent {
  title: string;
  content: string;
  hashtags: string[];
  callToAction?: string;
  style: string;
}

export class GroqService {
  /**
   * Generate professional LinkedIn post content using Groq (fast and free)
   */
  static async generateLinkedInContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    try {
      const { topic, style = 'professional', language = 'English', includeHashtags = true } = request;

      console.log(`Generating content with Groq for topic: ${topic}`);

      const prompt = this.createPrompt(topic, style, language, includeHashtags);

      const response = await axios.post(
        GROQ_API_URL,
        {
          model: 'llama-3.3-70b-versatile', // Latest Groq model - fast and free
          messages: [
            {
              role: 'system',
              content: `You are a professional LinkedIn content creator specializing in creating engaging, professional posts about business, technology, and industry trends. Your posts are concise, impactful, and designed to drive engagement on LinkedIn. Always maintain a professional yet approachable tone.`,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
          top_p: 0.95,
        },
        {
          headers: {
            Authorization: `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      // Parse the response
      const content = response.data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No content in Groq response');
      }

      // Parse the structured response
      const parsed = this.parseContent(content, topic);

      console.log('✅ Content generated successfully with Groq');

      return parsed;
    } catch (error: any) {
      console.error('Error generating content with Groq:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });

      // Fallback to template-based content if Groq fails
      return this.generateFallbackContent(request);
    }
  }

  /**
   * Create optimized prompt for LinkedIn content
   */
  private static createPrompt(
    topic: string,
    style: string,
    language: string,
    includeHashtags: boolean
  ): string {
    const styleGuides = {
      professional:
        'Formal, business-focused, data-driven insights. Include statistics or industry trends when relevant.',
      creative: 'Engaging, storytelling-focused, with personal insights and unique perspectives.',
      casual: 'Conversational, friendly, relatable. Share personal experiences and lessons learned.',
      'thought-leadership':
        'Visionary, strategic insights. Position as an industry expert sharing forward-thinking perspectives.',
    };

    const styleGuide = styleGuides[style as keyof typeof styleGuides] || styleGuides.professional;

    return `Create a professional LinkedIn post about: "${topic}"

Style: ${styleGuide}
Language: ${language}

Requirements:
1. Write 10-15 lines of engaging content
2. Start with a hook that captures attention
3. Include 2-3 key insights or takeaways
4. End with a call-to-action or thought-provoking question
5. Use line breaks for readability
6. Keep it professional but personable
7. ${includeHashtags ? 'Include 5-7 relevant hashtags at the end' : 'Do not include hashtags'}

Format your response as follows:
TITLE: [Short, catchy title]
CONTENT: [The main post content]
${includeHashtags ? 'HASHTAGS: [#hashtag1 #hashtag2 etc]' : ''}
CTA: [Optional call-to-action or closing statement]`;
  }

  /**
   * Parse structured content from Groq response
   */
  private static parseContent(content: string, topic: string): GeneratedContent {
    try {
      // Extract title
      const titleMatch = content.match(/TITLE:\s*(.+?)(?:\n|$)/i);
      const title = titleMatch ? titleMatch[1].trim() : topic;

      // Extract main content
      const contentMatch = content.match(/CONTENT:\s*([\s\S]+?)(?=HASHTAGS:|CTA:|$)/i);
      const mainContent = contentMatch ? contentMatch[1].trim() : content;

      // Extract hashtags
      const hashtagMatch = content.match(/HASHTAGS:\s*(.+?)(?:\nCTA:|$)/i);
      const hashtagsStr = hashtagMatch ? hashtagMatch[1].trim() : '';
      const hashtags = hashtagsStr
        .split(/\s+/)
        .filter((tag) => tag.startsWith('#'))
        .slice(0, 7);

      // Extract CTA
      const ctaMatch = content.match(/CTA:\s*(.+?)$/i);
      const cta = ctaMatch ? ctaMatch[1].trim() : undefined;

      return {
        title,
        content: mainContent,
        hashtags,
        callToAction: cta,
        style: 'professional',
      };
    } catch (error) {
      console.error('Error parsing content:', error);
      // Return raw content if parsing fails
      return {
        title: topic,
        content: content,
        hashtags: [],
        style: 'professional',
      };
    }
  }

  /**
   * Generate fallback content if Groq fails
   */
  private static generateFallbackContent(request: ContentGenerationRequest): GeneratedContent {
    const { topic, style = 'professional' } = request;

    const templates = {
      professional: `Exploring the latest trends in ${topic}. 

Key insights:
• Industry evolution and market dynamics
• Best practices and proven strategies
• Opportunities for growth and innovation

What are your thoughts on ${topic}? Share your insights in the comments below! 

#${topic.replace(/\s+/g, '')} #LinkedIn #Industry`,

      creative: `Just had an interesting realization about ${topic}...

The landscape is changing faster than ever. Here's what I've learned:
• Innovation is key to staying competitive
• Collaboration drives better outcomes
• Continuous learning is essential

How are you adapting to these changes? Let's discuss!

#${topic.replace(/\s+/g, '')} #Insights #Growth`,

      casual: `Quick thoughts on ${topic}:

I've noticed that success in this space comes down to a few key factors. It's not just about doing the work—it's about doing it with intention and purpose.

What's your take? Have you experienced this too?

#${topic.replace(/\s+/g, '')} #RealTalk #Community`,

      'thought-leadership': `The future of ${topic} is being shaped right now.

As we look ahead, three things are becoming clear:
1. Digital transformation is non-negotiable
2. Human-centric approaches drive real value
3. Adaptability is the ultimate competitive advantage

The organizations that thrive will be those that embrace change while staying true to their core values.

What's your vision for the future?

#${topic.replace(/\s+/g, '')} #FutureOfWork #Leadership`,
    };

    const content = templates[style as keyof typeof templates] || templates.professional;

    return {
      title: topic,
      content: content,
      hashtags: [`#${topic.replace(/\s+/g, '')}`, '#LinkedIn', '#Industry'],
      style: style,
    };
  }

  /**
   * Generate multiple content variations
   */
  static async generateContentVariations(request: ContentGenerationRequest, count: number = 3): Promise<GeneratedContent[]> {
    const results: GeneratedContent[] = [];

    const styles: Array<'professional' | 'creative' | 'casual' | 'thought-leadership'> = [
      'professional',
      'creative',
      'casual',
    ];

    for (let i = 0; i < Math.min(count, styles.length); i++) {
      try {
        const result = await this.generateLinkedInContent({
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
   * Validate content quality
   */
  static validateContent(content: GeneratedContent): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check content length
    const wordCount = content.content.split(/\s+/).length;
    if (wordCount < 50) {
      issues.push('Content is too short (less than 50 words)');
    }
    if (wordCount > 300) {
      issues.push('Content is too long (more than 300 words)');
    }

    // Check for title
    if (!content.title || content.title.length === 0) {
      issues.push('Missing title');
    }

    // Check for hashtags
    if (content.hashtags.length === 0) {
      issues.push('No hashtags provided');
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }
}
