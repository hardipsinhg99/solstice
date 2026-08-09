import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @MaxLength(200)
  email!: string;

  // Min length is a sanity bound on input size, not a password policy - the
  // seeded password is set by the operator via ADMIN_SEED_PASSWORD.
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}
