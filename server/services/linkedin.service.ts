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

      // Create post content with correct LinkedIn API format
      const postData: any = {
        author: LINKEDIN_PERSON_URN,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: text,
            },
            shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      };

      // Add media if image is provided
      if (imageUrl) {
        try {
          // Try to upload image first
          const uploadedAssetId = await this.uploadImage(imageUrl);
          if (uploadedAssetId) {
            postData.specificContent['com.linkedin.ugc.ShareContent'].media = [
              {
                status: 'READY',
                media: uploadedAssetId,
              },
            ];
          }
        } catch (imageError) {
          console.warn('Image upload failed, publishing without image:', imageError);
          // Continue without image
          postData.specificContent['com.linkedin.ugc.ShareContent'].shareMediaCategory = 'NONE';
        }
      }

      const response = await axios.post(
        'https://api.linkedin.com/v2/ugcPosts',
        postData,
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
      console.error('Error publishing to LinkedIn:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
      });
      throw new Error(`LinkedIn API Error (${error.response?.status}): ${error.response?.data?.message || error.message}`);
    }
  }

  static async uploadImage(imageUrl: string): Promise<string | null> {
    try {
      // Step 1: Get upload URL
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

      // Step 2: Download image
      const imageResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 10000,
      });

      // Step 3: Upload to LinkedIn
      await axios.put(uploadUrl, imageResponse.data, {
        headers: {
          'Content-Type': 'image/jpeg',
        },
        timeout: 10000,
      });

      return assetId;
    } catch (error: any) {
      console.error('Error uploading image to LinkedIn:', error.message);
      return null;
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
