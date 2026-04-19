import axios from 'axios';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';

export interface ContentGenerationRequest {
  topic: string;
  style?: 'professional' | 'casual' | 'engaging';
}

export interface GeneratedContent {
  title: string;
  content: string;
  hashtags: string[];
  imagePrompt: string;
}

// Mock trending topics for fallback
const MOCK_TRENDS = [
  {
    topic: 'Morocco Tourism Growth',
    description: 'Morocco sees record tourism numbers in Q1 2026',
  },
  {
    topic: 'Tech Innovation in Casablanca',
    description: 'New tech hub launches in Casablanca with focus on AI',
  },
  {
    topic: 'Morocco-EU Trade Agreement',
    description: 'New trade partnership announced between Morocco and EU',
  },
  {
    topic: 'Renewable Energy Projects',
    description: 'Morocco accelerates renewable energy initiatives',
  },
  {
    topic: 'Digital Transformation',
    description: 'Morocco leads digital transformation in North Africa',
  },
];

export class ContentService {
  static async generateTrendingTopics(): Promise<string[]> {
    try {
      if (!PERPLEXITY_API_KEY) {
        // Use mock trends if API key not available
        return MOCK_TRENDS.map((t) => t.topic);
      }

      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content:
                'What are the top 5 trending topics in Morocco right now? Return only the topic names, one per line.',
            },
          ],
          temperature: 0.7,
          top_p: 0.9,
          return_citations: false,
          search_domain_filter: ['perplexity.com'],
          return_images: false,
          search_recency_filter: 'month',
          top_k: 2,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const topics = response.data.choices[0].message.content
        .split('\n')
        .filter((t: string) => t.trim())
        .slice(0, 5);

      return topics;
    } catch (error) {
      console.error('Error fetching trending topics:', error);
      return MOCK_TRENDS.map((t) => t.topic);
    }
  }

  static async generateContent(request: ContentGenerationRequest): Promise<GeneratedContent> {
    const { topic, style = 'professional' } = request;

    try {
      const prompt = `Generate a professional LinkedIn post about: "${topic}"
      
      Requirements:
      - 10-15 lines of engaging content
      - Professional but conversational tone
      - Include key insights and value proposition
      - End with a call-to-action
      - Format: Use HTML tags for emphasis (<b>, <i>)
      
      Also provide:
      1. A catchy title (one line)
      2. 5 relevant hashtags
      3. A detailed image prompt for creating a visual representation
      
      Format your response as JSON with keys: title, content, hashtags (array), imagePrompt`;

      if (!PERPLEXITY_API_KEY) {
        // Generate mock content
        return this.generateMockContent(topic);
      }

      const response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          top_p: 0.9,
          return_citations: false,
          search_domain_filter: ['perplexity.com'],
          return_images: false,
          search_recency_filter: 'month',
          top_k: 2,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1,
        },
        {
          headers: {
            Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseText = response.data.choices[0].message.content;

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || topic,
          content: parsed.content || '',
          hashtags: parsed.hashtags || [],
          imagePrompt: parsed.imagePrompt || `Professional image about ${topic}`,
        };
      }

      return this.generateMockContent(topic);
    } catch (error) {
      console.error('Error generating content:', error);
      return this.generateMockContent(topic);
    }
  }

  private static generateMockContent(topic: string): GeneratedContent {
    const mockContents: { [key: string]: GeneratedContent } = {
      'Morocco Tourism Growth': {
        title: '🌍 Morocco Breaks Tourism Records in 2026',
        content: `<b>Exciting news from Morocco!</b> 🎉

Our beautiful nation is experiencing unprecedented tourism growth this year. With over 2 million visitors already in Q1, we're setting new records.

<b>Key highlights:</b>
✨ 45% increase in international arrivals
🏨 New luxury resorts opening across the coast
🚀 Enhanced digital infrastructure for travelers
💼 Job creation in hospitality sector

This growth reflects Morocco's commitment to world-class tourism experiences. From the Sahara to the Atlantic coast, we're showcasing our rich culture and natural beauty.

<b>Join us in celebrating Morocco's rise as a premier destination!</b>`,
        hashtags: ['#MoroccoTourism', '#TravelMorocco', '#EconomicGrowth', '#NorthAfrica', '#2026'],
        imagePrompt:
          'Beautiful panoramic view of Morocco with tourists enjoying the beach, desert, and historic medina, vibrant colors, professional photography',
      },
      'Tech Innovation in Casablanca': {
        title: '💻 Casablanca Becomes Africa\'s Tech Hub',
        content: `<b>A milestone for Morocco!</b> 🚀

Casablanca just launched its most ambitious tech hub yet, positioning Morocco as a leader in African innovation.

<b>What's happening:</b>
🔧 500+ tech startups supported
💡 AI and machine learning focus
🌐 Global partnerships established
👨‍💻 5,000+ tech jobs created

This initiative attracts talent from across Africa and beyond. We're building an ecosystem where innovation thrives and ideas become reality.

<b>The future of African tech is being built here!</b>`,
        hashtags: ['#TechMorocco', '#Innovation', '#Casablanca', '#AfricaTech', '#StartupHub'],
        imagePrompt:
          'Modern tech hub office space in Casablanca with diverse professionals working on computers, bright lighting, contemporary design',
      },
    };

    return (
      mockContents[topic] || {
        title: `📰 ${topic}`,
        content: `<b>Latest Update on ${topic}</b>

Morocco continues to lead in innovation and development. This important initiative demonstrates our commitment to progress and excellence.

<b>Why this matters:</b>
✅ Economic growth
✅ Job creation
✅ International recognition
✅ Sustainable development

Join us as we build a brighter future for Morocco!`,
        hashtags: ['#Morocco', '#News', '#Development', '#Progress', '#NorthAfrica'],
        imagePrompt: `Professional infographic about ${topic} with Morocco flag and modern design elements`,
      }
    );
  }
}
