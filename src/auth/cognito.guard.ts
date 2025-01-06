import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1]; // Remove "Bearer " prefix
    const payload = await this.authService.validateToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    // Add user info to request object with groups
    request.user = {
      ...payload,
      groups: payload['cognito:groups'] || ['USER'], // Get the groups from token
    };
    
    console.log('User payload:', {
      sub: payload.sub,
      groups: payload['cognito:groups'],
      fullPayload: payload
    });

    return true;
  }
}
