export interface Link {
  id: string;
  url: string;
  slug: string;
  clicks: number;
  description?: string | null;
  expiresAt?: Date | null;
  isArchived?: boolean;
  isPublic: boolean;
  creator: { name: string | null; image: string | null } | null;
  qrCode: {
    id: string;
    customization?: string;
  };
}

export interface ApiResponse {
  links: Link[];
  totalLinks: number;
  totalPages: number;
}

export interface SearchConfig {
  search: string;
  showArchived: string;
  sortBy: string;
  offset: number;
}

export interface PaginationData {
  total_pages: number;
  limit: number;
  total_links: number;
}

export interface BulkOperationResult {
  message?: string;
}
