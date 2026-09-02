import { ApiProperty } from '@nestjs/swagger';

/** Swagger shape for a success envelope with no meaningful payload. */
export class SuccessResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiProperty({ example: null, nullable: true })
  data: unknown;
}

/** Swagger shape for the failure envelope produced by AllExceptionsFilter. */
export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'Not Found', oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }] })
  message: string | string[];

  @ApiProperty({ example: 'Not Found' })
  error: string | string[];

  @ApiProperty({ example: 404 })
  statusCode: number;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 42 }) total: number;
  @ApiProperty({ example: 1 }) page: number;
  @ApiProperty({ example: 10 }) limit: number;
  @ApiProperty({ example: 5 }) totalPages: number;
  @ApiProperty({ example: true }) hasNext: boolean;
  @ApiProperty({ example: false }) hasPrev: boolean;
}
