export interface Link {
  id: string;
  url: string;
  slug: string;
  clicks: number;
  description?: string | null;
  expiresAt?: Date | null;
  isArchived?: boolean;
  isPublic: boolean;
  isAnalyticsShared?: boolean;
  creator: { name: string | null; image: string | null } | null;
  qrCode: {
    id: string;
    customization?: string;
  };
  bioLinks?: Array<{
    id: string;
    linkManagedByBio: boolean;
  }>;
}

export interface ApiResponse {
  links: Link[];
  totalLinks: number;
  totalPages: number;
}

export interface SearchConfig {
  search: string;
  showArchived: string;
  inBio: string;
  sortBy: string;
  offset: number;
  tagIds: string[];
}

export interface PaginationData {
  total_pages: number;
  limit: number;
  total_links: number;
}

export interface BulkOperationResult {
  message?: string;
}
