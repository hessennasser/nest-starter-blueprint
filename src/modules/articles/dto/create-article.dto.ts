import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches, MaxLength } from 'class-validator';
import {
  IsLocalizedString,
  type LocalizedStringInput,
} from 'src/shared/helpers/language.helper';
import { TrimString } from 'src/shared/helpers/transform.helper';

export class CreateArticleDto {
  @ApiProperty({
    example: { en: 'Hello world', ar: 'مرحبا بالعالم' },
    description: 'Plain string or a { en, ar } object.',
  })
  @IsLocalizedString({ required: true })
  title: LocalizedStringInput;

  @ApiProperty({ example: { en: 'Body text…', ar: 'نص المقالة…' } })
  @IsLocalizedString({ required: true })
  body: LocalizedStringInput;

  @ApiPropertyOptional({
    example: 'hello-world',
    description: 'Lowercase, hyphenated. Auto-derived from the title if omitted.',
  })
  @IsOptional()
  @TrimString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug may contain lowercase letters, numbers and hyphens only',
  })
  @MaxLength(160)
  slug?: string;
}
