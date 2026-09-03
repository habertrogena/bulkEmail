import { Injectable } from '@nestjs/common';
import {
  SESv2Client,
  CreateConfigurationSetCommand,
  CreateConfigurationSetEventDestinationCommand,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  GetAccountCommand,
  SendEmailCommand,
} from '@aws-sdk/client-sesv2';

const TRACKED_EVENT_TYPES = [
  'SEND',
  'DELIVERY',
  'BOUNCE',
  'COMPLAINT',
  'REJECT',
] as const;

@Injectable()
export class SesService {
  readonly client: SESv2Client;

  constructor() {
    this.client = new SESv2Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      },
    });
  }

  async createConfigurationSet(name: string): Promise<void> {
    await this.client.send(
      new CreateConfigurationSetCommand({ ConfigurationSetName: name }),
    );

    const topicArn = process.env.SES_SNS_TOPIC_ARN;
    if (!topicArn) return;

    await this.client.send(
      new CreateConfigurationSetEventDestinationCommand({
        ConfigurationSetName: name,
        EventDestinationName: `${name}-sns`,
        EventDestination: {
          Enabled: true,
          MatchingEventTypes: [...TRACKED_EVENT_TYPES],
          SnsDestination: { TopicArn: topicArn },
        },
      }),
    );
  }

  async createEmailIdentity(domain: string) {
    return this.client.send(
      new CreateEmailIdentityCommand({ EmailIdentity: domain }),
    );
  }

  async getEmailIdentity(domain: string) {
    return this.client.send(
      new GetEmailIdentityCommand({ EmailIdentity: domain }),
    );
  }

  async getMaxSendRate(): Promise<number | null> {
    try {
      const result = await this.client.send(new GetAccountCommand({}));
      return result.SendQuota?.MaxSendRate ?? null;
    } catch {
      return null;
    }
  }

  async getAccountHealth() {
    const result = await this.client.send(new GetAccountCommand({}));
    return {
      productionAccessEnabled: result.ProductionAccessEnabled ?? false,
      sendingEnabled: result.SendingEnabled ?? false,
      max24HourSend: result.SendQuota?.Max24HourSend ?? null,
      maxSendRate: result.SendQuota?.MaxSendRate ?? null,
      sentLast24Hours: result.SendQuota?.SentLast24Hours ?? null,
    };
  }

  async sendEmail(params: {
    fromAddress: string;
    toAddress: string;
    replyTo?: string;
    configurationSetName?: string;
    subject: string;
    htmlBody: string;
  }) {
    const command = new SendEmailCommand({
      FromEmailAddress: params.fromAddress,
      Destination: { ToAddresses: [params.toAddress] },
      ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
      ConfigurationSetName: params.configurationSetName,
      Content: {
        Simple: {
          Subject: { Data: params.subject, Charset: 'UTF-8' },
          Body: { Html: { Data: params.htmlBody, Charset: 'UTF-8' } },
        },
      },
    });
    return this.client.send(command);
  }
}
