import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SynthesizeDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  text!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  voiceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiProperty({ required: false, description: 'Idempotency key' })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
