const LINKEDIN_API = 'https://api.linkedin.com/v2';

interface LinkedInPostResult {
  success: boolean;
  postUrl?: string;
  error?: string;
}

/**
 * Get the current user's LinkedIn ID
 */
async function getMyId(): Promise<string> {
  try {
    const res = await fetch(`${LINKEDIN_API}/userinfo`, {
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_TOKEN}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to get user ID: ${res.statusText}`);
    }

    const data = (await res.json()) as { sub: string };
    return data.sub; // OpenID Connect user URN (e.g., "V9QnL6nngG")
  } catch (error) {
    console.error('Error getting LinkedIn user ID:', error);
    throw error;
  }
}

/**
 * Post content to LinkedIn
 */
export async function postToLinkedIn(
  text: string,
  imageUrl?: string
): Promise<LinkedInPostResult> {
  try {
    const authorId = await getMyId();

    const payload: Record<string, unknown> = {
      author: `urn:li:person:${authorId}`,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: imageUrl ? 'IMAGE' : 'NONE',
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    // Add image if provided
    if (imageUrl) {
      const mediaPayload = {
        'com.linkedin.ugc.ShareContent': {
          media: [
            {
              status: 'READY',
              description: {
                text: 'LinkedIn post image',
              },
              media: imageUrl,
              title: {
                text: 'Post Image',
              },
            },
          ],
        },
      };
      payload.specificContent = mediaPayload;
    }

    const res = await fetch(`${LINKEDIN_API}/ugcPosts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.LINKEDIN_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('LinkedIn API error:', errorText);
      throw new Error(`LinkedIn API error: ${res.status} ${errorText}`);
    }

    const postId = res.headers.get('x-restli-id');
    if (!postId) {
      throw new Error('No post ID returned from LinkedIn');
    }

    return {
      success: true,
      postUrl: `https://www.linkedin.com/feed/update/${postId}`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error posting to LinkedIn:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Check LinkedIn token expiry status
 */
export async function checkTokenStatus(): Promise<{
  isValid: boolean;
  daysRemaining?: number;
  expiryDate?: string;
}> {
  try {
    const expiryDate = process.env.LINKEDIN_TOKEN_EXPIRY;
    if (!expiryDate) {
      return { isValid: true }; // No expiry date set, assume valid
    }

    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysRemaining = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    return {
      isValid: daysRemaining > 0,
      daysRemaining,
      expiryDate: expiry.toISOString().split('T')[0],
    };
  } catch (error) {
    console.error('Error checking token status:', error);
    return { isValid: false };
  }
}
