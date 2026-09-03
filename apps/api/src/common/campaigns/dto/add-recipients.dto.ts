import { IsNotEmpty } from 'class-validator';

export class AddRecipientsDto {
  /** Raw CSV text; must have an `email` column, any other columns become mergeData. */
  @IsNotEmpty()
  csv: string;
}
