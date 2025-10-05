const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    console.log('API Client: Making request to:', url);
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = this.getAuthToken();
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
      console.log('API Client: Added auth header');
    } else {
      console.log('API Client: No auth token available');
    }

    try {
      console.log('API Client: Fetch config:', {
        url,
        method: config.method || 'GET',
        headers: config.headers
      });
      
      const response = await fetch(url, config);
      
      console.log('API Client: Response status:', response.status);
      
      if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        let errorData = null;
        
        try {
          errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
          console.log('API Client: Error data:', errorData);
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
          console.log('API Client: Non-JSON error response');
        }
        
        throw new ApiError(errorMessage, response.status, errorData);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          const data = await response.json();
          console.log('API Client: Success response data:', data);
          return data;
        } catch (jsonError) {
          console.error('API Client: Failed to parse JSON response:', jsonError);
          throw new ApiError('Invalid JSON response from server', response.status, {
            parseError: jsonError,
            contentType: contentType
          });
        }
      } else {
        console.log('API Client: Non-JSON response, content-type:', contentType);
        // For non-JSON responses, try to get text content for debugging
        try {
          const text = await response.text();
          console.log('API Client: Response text:', text.substring(0, 200));
          return {} as T;
        } catch (textError) {
          console.log('API Client: Could not read response text:', textError);
          return {} as T;
        }
      }
    } catch (error) {
      console.error('API Client: Request failed:', error);
      if (error instanceof ApiError) {
        throw error;
      }
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError('Unable to connect to server. Please check your connection.', 0, error);
      }
      
      throw new ApiError('Network error or server unavailable', 0, error);
    }
  }

  private getAuthToken(): string | null {
    // Try to get token from localStorage (existing system uses 'access_token')
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('access_token');
      console.log('API Client: Getting auth token:', token ? 'Token present' : 'No token');
      return token;
    }
    return null;
  }

  public setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  public clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = params ? `${endpoint}?${new URLSearchParams(params)}` : endpoint;
    return this.request<T>(url, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async deleteWithBody<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// Create singleton instance
export const apiClient = new ApiClient();