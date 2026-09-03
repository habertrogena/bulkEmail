export interface AwsHealth {
  productionAccessEnabled: boolean;
  sendingEnabled: boolean;
  max24HourSend: number | null;
  maxSendRate: number | null;
  sentLast24Hours: number | null;
}
