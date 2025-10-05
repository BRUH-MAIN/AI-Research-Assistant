/**
 * Development authentication utilities
 * Used for bypassing authentication in development mode
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export interface MockUser {
  id: string;
  email: string;
  user_metadata: {
    full_name: string;
    name: string;
  };
}

export class DevAuthService {
  private static mockUser: MockUser = {
    id: '1',
    email: 'dev@test.com',
    user_metadata: {
      full_name: 'Development User',
      name: 'Dev User'
    }
  };

  // Create a mock JWT token for development
  static createMockToken(): string {
    // This is a simple base64 encoded mock token for development only
    const mockPayload = {
      sub: DevAuthService.mockUser.id,
      email: DevAuthService.mockUser.email,
      aud: 'authenticated',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 hours
      iat: Math.floor(Date.now() / 1000)
    };
    
    return 'dev_mock_token_' + btoa(JSON.stringify(mockPayload));
  }

  // Get mock user for development
  static getMockUser(): MockUser {
    return DevAuthService.mockUser;
  }

  // Check if we should use development mode
  static shouldUseMockAuth(): boolean {
    return isDevelopment && typeof window !== 'undefined';
  }

  // Set up mock authentication for development
  static setupMockAuth(): void {
    if (!this.shouldUseMockAuth()) return;

    const mockToken = this.createMockToken();
    localStorage.setItem('access_token', mockToken);
    localStorage.setItem('dev_mode', 'true');
    
    console.log('Development mode: Mock authentication set up');
    console.log('Mock user:', this.mockUser);
    console.log('Mock token:', mockToken.substring(0, 20) + '...');
  }

  // Clear mock authentication
  static clearMockAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('dev_mode');
    }
  }

  // Check if currently using mock auth
  static isUsingMockAuth(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dev_mode') === 'true';
  }
}

export { DevAuthService as devAuth };