export interface SnsEnvelope {
  Type: 'SubscriptionConfirmation' | 'Notification' | 'UnsubscribeConfirmation';
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  SubscribeURL?: string;
  Token?: string;
  UnsubscribeURL?: string;
}

export interface SesEventMail {
  messageId: string;
  tags?: Record<string, string[]>;
}

export interface SesBounceNotification {
  eventType: 'Bounce';
  mail: SesEventMail;
  bounce: { bounceType: 'Permanent' | 'Transient' | 'Undetermined' };
}

export interface SesComplaintNotification {
  eventType: 'Complaint';
  mail: SesEventMail;
}

export interface SesDeliveryNotification {
  eventType: 'Delivery';
  mail: SesEventMail;
}

export type SesNotification =
  | SesBounceNotification
  | SesComplaintNotification
  | SesDeliveryNotification
  | { eventType: string; mail: SesEventMail };
