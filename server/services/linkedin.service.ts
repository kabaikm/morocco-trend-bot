import axios from 'axios';

const LINKEDIN_ACCESS_TOKEN = process.env.LINKEDIN_ACCESS_TOKEN || 'AQVYeW-jb8JAG0Wu7jUcoeRQC-lyYVORSO2Iab3lC5ZatLVfZiwW9ksd4SO_6brKQBULREgC_Wlscjcbyr1Bg89TMCaLsLyiCZeac1aMcx6s309-9vsWpJ70t9rvD9wxWG6ML_MQugyTb60EaT3VkrQjYd1L-NBCez2dowKFM3nGJGctp1s2pggQ8fSM3wz0eZQJmWS45AL7iZz1WhvV_YQAVs7_7RqeRRQJb8PC7uDGwICB3cziIJEzSqGxEBB098E_A3ofo7h12XzMgMFa8Pc-x72YH461KLcubzH3L8xEzb_u_Pw_xiTh6aE7gOqJAF5MHBiZSagrNRJnBgHjEhK4qWT2mg';
const LINKEDIN_PERSON_URN = process.env.LINKEDIN_PERSON_URN || 'urn:li:person:V9QnL6nngG';

export interface LinkedInPostRequest {
  text: string;
  imageUrl?: string;
  title?: string;
}

export class LinkedInService {
  static async publishPost(request: LinkedInPostRequest): Promise<any> {
    try {
      const { text, imageUrl, title } = request;

      // Create post content
      const postContent: any = {
        commentary: text,
        visibility: 'PUBLIC',
      };

      // Add image if provided
      if (imageUrl) {
        postContent.content = {
          media: {
            title: title || 'Morocco Trend Post',
            id: imageUrl, // In real scenario, would need to upload image first
          },
        };
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: LINKEDIN_PERSON_URN,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': postContent,
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error publishing to LinkedIn:', error.response?.data || error.message);
      throw error;
    }
  }

  static async publishPostWithImage(request: LinkedInPostRequest): Promise<any> {
    try {
      const { text, imageUrl, title } = request;

      // Step 1: Register upload
      const uploadResponse = await axios.get(
        'https://api.linkedin.com/v2/assets?action=getUploadUrl',
        {
          headers: {
            Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const uploadUrl = uploadResponse.data.value.uploadUrl;
      const assetId = uploadResponse.data.value.asset;

      // Step 2: Upload image (if provided)
      if (imageUrl) {
        const imageResponse = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
        });

        await axios.put(uploadUrl, imageResponse.data, {
          headers: {
            'Content-Type': 'image/jpeg',
          },
        });
      }

      // Step 3: Create post with image
      const postContent: any = {
        commentary: text,
        visibility: 'PUBLIC',
      };

      if (imageUrl && assetId) {
        postContent.media = [
          {
            status: 'READY',
            media: assetId,
            title: {
              text: title || 'Morocco Trend Post',
            },
          },
        ];
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        {
          author: LINKEDIN_PERSON_URN,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': postContent,
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error publishing to LinkedIn with image:', error.response?.data || error.message);
      throw error;
    }
  }

  static async getPostMetrics(postId: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://api.linkedin.com/v2/socialMetadata?ids[0]=${postId}`,
        {
          headers: {
            Authorization: `Bearer ${LINKEDIN_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Error getting post metrics:', error.response?.data || error.message);
      throw error;
    }
  }
}
