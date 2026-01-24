// API client configuration
let apiConfig: {
  baseUrl: string;
  getToken: (() => Promise<string | null>) | null;
} = {
  baseUrl: "",
  getToken: null,
};

/**
 * Configure the API client with baseUrl and token getter.
 * Call this once at app startup before using any generated hooks.
 *
 * @param config.baseUrl - The base URL of the API (e.g., "https://myapp.vercel.app")
 * @param config.getToken - Async function that returns the auth token (e.g., Clerk's getToken())
 */
export function configureApiClient(config: {
  baseUrl: string;
  getToken: () => Promise<string | null>;
}) {
  apiConfig = {
    baseUrl: config.baseUrl.replace(/\/$/, ""), // Remove trailing slash
    getToken: config.getToken,
  };
}

/**
 * Get the current API client configuration (for debugging/testing)
 */
export function getApiClientConfig() {
  return { ...apiConfig };
}

/**
 * Custom fetch function compatible with Orval mutator signature.
 * Automatically attaches Authorization header if a token is available.
 *
 * @param url - The URL path to fetch (will be appended to baseUrl)
 * @param options - Standard RequestInit options
 * @returns Response with data, status, and headers
 */
export async function customFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  // Build full URL with base
  const fullUrl = apiConfig.baseUrl
    ? new URL(url, apiConfig.baseUrl).toString()
    : url;

  // Build headers
  const headers = new Headers(options?.headers);

  // Add Authorization header if we have a token getter
  if (apiConfig.getToken) {
    try {
      const token = await apiConfig.getToken();
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
    } catch (error) {
      console.warn("Failed to get auth token:", error);
    }
  }

  // Set Content-Type for JSON body if not already set
  if (options?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // Make the request
  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  const responseHeaders = response.headers;
  const status = response.status;

  // Handle non-2xx responses
  if (!response.ok) {
    let errorData: { error?: string } = {};
    try {
      errorData = await response.json();
    } catch {
      // If we can't parse the error body, use empty object
    }

    // Return error response matching Orval's expected type
    return {
      data: errorData,
      status,
      headers: responseHeaders,
    } as T;
  }

  // Parse successful response
  let data: unknown;

  // Handle 204 No Content
  if (status === 204) {
    data = undefined;
  } else {
    const contentType = response.headers.get("Content-Type");
    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }
  }

  // Return response matching Orval's expected type
  return {
    data,
    status,
    headers: responseHeaders,
  } as T;
}

export default customFetch;
