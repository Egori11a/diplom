import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { IsEmail, IsString, MinLength } from "class-validator";

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(4)
  password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() body: LoginDto): Promise<{ accessToken: string }> {
    const accessToken = await this.authService.login(body.email, body.password);
    if (!accessToken) {
      throw new UnauthorizedException("Invalid credentials");
    }
    return { accessToken };
  }
}
