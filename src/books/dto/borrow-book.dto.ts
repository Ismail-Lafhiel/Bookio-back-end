import { IsDateString, IsNotEmpty } from 'class-validator';

export class BorrowBookDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  returnDate: string;
}
