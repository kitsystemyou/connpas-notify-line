import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { Logger } from '../utils/logger';

export class SecretManagerService {
  private client: SecretManagerServiceClient;
  private readonly logger = new Logger('SecretManagerService');
  private secretCache = new Map<string, { value: string; expiry: number }>();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.client = new SecretManagerServiceClient();
  }

  async getSecret(secretId: string): Promise<string> {
    try {
      const cacheKey = secretId;
      const cached = this.secretCache.get(cacheKey);
      
      if (cached && cached.expiry > Date.now()) {
        this.logger.debug('Using cached secret', { secretId });
        return cached.value;
      }

      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
      }

      const secretName = `projects/${projectId}/secrets/${secretId}/versions/latest`;
      
      const [version] = await this.client.accessSecretVersion({
        name: secretName,
      });

      const secretValue = version.payload?.data?.toString();
      if (!secretValue) {
        throw new Error(`Secret ${secretId} is empty or not found`);
      }

      this.secretCache.set(cacheKey, {
        value: secretValue,
        expiry: Date.now() + this.cacheTimeout,
      });

      this.logger.info('Secret retrieved successfully', { secretId });
      return secretValue;
    } catch (error) {
      this.logger.error('Failed to retrieve secret', { secretId, error });
      throw error;
    }
  }

  async createSecret(secretId: string, secretValue: string): Promise<void> {
    try {
      const projectId = process.env.GOOGLE_CLOUD_PROJECT;
      if (!projectId) {
        throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
      }

      const parent = `projects/${projectId}`;
      
      await this.client.createSecret({
        parent,
        secretId,
        secret: {
          replication: {
            automatic: {},
          },
        },
      });

      await this.client.addSecretVersion({
        parent: `${parent}/secrets/${secretId}`,
        payload: {
          data: Buffer.from(secretValue, 'utf8'),
        },
      });

      this.logger.info('Secret created successfully', { secretId });
    } catch (error) {
      this.logger.error('Failed to create secret', { secretId, error });
      throw error;
    }
  }

  clearCache(): void {
    this.secretCache.clear();
    this.logger.info('Secret cache cleared');
  }
}