import { db } from './db';
import { blogPosts } from '../shared/blog-schema';
import { getAwsS3Service } from './aws-s3-service';
import { eq } from 'drizzle-orm';
import https from 'https';
import http from 'http';

const PLACEHOLDER_IMAGES = [
  { id: 1, url: 'https://picsum.photos/seed/blog1/800/450', name: 'chemical-research.jpg' },
  { id: 2, url: 'https://picsum.photos/seed/blog2/800/450', name: 'lab-testing.jpg' },
  { id: 3, url: 'https://picsum.photos/seed/blog3/800/450', name: 'lab-equipment.jpg' },
  { id: 4, url: 'https://picsum.photos/seed/blog4/800/450', name: 'lab-safety.jpg' },
  { id: 5, url: 'https://picsum.photos/seed/blog5/800/450', name: 'chemical-analysis.jpg' },
];

async function downloadImage(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, { 
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl).then(resolve).catch(reject);
          return;
        }
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

export async function migrateBlogImagesToS3(): Promise<{ success: boolean; message: string; results: any[] }> {
  const results: any[] = [];
  
  try {
    const s3Service = getAwsS3Service();
    if (!s3Service) {
      return { success: false, message: 'S3 service not initialized', results };
    }

    for (const img of PLACEHOLDER_IMAGES) {
      try {
        console.log(`Downloading image for blog post ${img.id}...`);
        const imageBuffer = await downloadImage(img.url);
        
        console.log(`Uploading ${img.name} to S3...`);
        const uploadResult = await s3Service.uploadPublicFile(
          imageBuffer,
          img.name,
          'image/jpeg',
          'blog-images'
        );

        if (uploadResult.success && uploadResult.url) {
          await db.update(blogPosts)
            .set({ featuredImage: uploadResult.url })
            .where(eq(blogPosts.id, img.id));
          results.push({ id: img.id, success: true, url: uploadResult.url });
          console.log(`✅ Blog post ${img.id} updated with S3 URL: ${uploadResult.url}`);
        } else {
          results.push({ id: img.id, success: false, error: uploadResult.message });
          console.error(`❌ Failed to upload image for blog post ${img.id}: ${uploadResult.message}`);
        }
      } catch (error: any) {
        results.push({ id: img.id, success: false, error: error.message });
        console.error(`❌ Error processing blog post ${img.id}: ${error.message}`);
      }
    }

    const successCount = results.filter(r => r.success).length;
    return { 
      success: successCount > 0, 
      message: `Migrated ${successCount}/${PLACEHOLDER_IMAGES.length} blog images to S3`,
      results 
    };
  } catch (error: any) {
    return { success: false, message: error.message, results };
  }
}
