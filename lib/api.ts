/**
 * Konfigurasi Base URL untuk Next.js Route Handlers & Asset Statis Gambar
 */
const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined") {
    return "/api";
  }

  const envUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envUrl && envUrl.startsWith("http")) {
    return envUrl.replace(/\/+$/, "");
  }

  return "http://localhost:3000/api";
};

export const API_BASE_URL = getApiBaseUrl();

// Path relatif lokasi penyimpanan gambar
export const STORAGE_URL = process.env.NEXT_PUBLIC_STORAGE_URL || "/uploads";

/**
 * Helper untuk mendapatkan URL lengkap gambar produk / kategori / banner
 */

export function getImageUrl(
  path?: string,
  folder: "banners" | "products" | "categories" | "uploads" = "products",
) {
  if (!path) return "/images/placeholder.jpg";

  // Jika path berupa URL eksternal atau sudah absolut
  if (path.startsWith("http://") || path.startsWith("https://")) {
    // Jika URL mengandung localhost atau domain lama, ambil nama file terakhirnya saja
    if (path.includes("localhost") || path.includes("backend")) {
      const parts = path.split("/");
      const fileName = parts[parts.length - 1];
      return `/uploads/${folder}/${fileName}`;
    }
    return path;
  }

  // Bersihkan slash awal dan spasi
  let cleanPath = path.trim().replace(/^\/+/, "");

  // Jika path sudah mengandung string "uploads/" di depannya
  if (cleanPath.startsWith("uploads/")) {
    cleanPath = cleanPath.replace(/^uploads\/+/, "");
  }

  // Jika path sudah mengandung folder kategori (misal: "products/file.jpg" atau "banners/file.jpg")
  if (cleanPath.startsWith(`${folder}/`)) {
    return `/uploads/${cleanPath}`;
  }

  // Jika path dari folder lain, cek subfolder umumnya
  if (
    cleanPath.startsWith("banners/") ||
    cleanPath.startsWith("products/") ||
    cleanPath.startsWith("categories/")
  ) {
    return `/uploads/${cleanPath}`;
  }

  // Format standar: gabungkan dengan folder tujuan
  return `/uploads/${folder}/${cleanPath}`;
}

/**
 * Universal Fetcher dengan Handling Error & Default Headers
 */
export async function fetchFromApi<T = any>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const baseUrl = typeof window !== "undefined" ? "/api" : API_BASE_URL;
  const url = `${baseUrl}${cleanEndpoint}`;

  const defaultHeaders: HeadersInit = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP Error! Status: ${response.status} ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(
      `[API Fetch Error] Failed to fetch endpoint: ${cleanEndpoint}`,
      error,
    );
    throw error;
  }
}

/* ==========================================================================
   INTERFACES & TYPES
   ========================================================================== */

export interface ProductQueryParams {
  category?: string;
  gender?: string;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface Product {
  id: number;
  product_id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  base_price: number;
  discount_percent: number;
  discount_price: number | null;
  category: {
    name: string;
    slug: string;
  };
  category_name: string;
  image: string;
  image_url: string;
  stock: number;
  is_featured: boolean;
  variants?: any[];
  images?: any[];
}

/* ==========================================================================
   ENDPOINT API PRODUCTS & CATEGORIES
   ========================================================================== */

export async function getProducts(params?: ProductQueryParams) {
  try {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append("category", params.category);
    if (params?.gender) queryParams.append("gender", params.gender);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.sort) queryParams.append("sort", params.sort);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const queryString = queryParams.toString();
    const endpoint = `/products${queryString ? `?${queryString}` : ""}`;

    const res = await fetchFromApi(endpoint, { cache: "no-store" });

    const rawData = Array.isArray(res) ? res : res.data || [];

    const mappedData: Product[] = rawData.map((item: any) => ({
      id: item.product_id || item.id,
      product_id: item.product_id || item.id,
      name: item.name || "Kacamata IDVISION",
      slug: item.slug || "",
      sku: item.sku_base || item.sku || "",
      description: item.description || "",
      price: Number(item.base_price || item.price || 0),
      base_price: Number(item.base_price || item.price || 0),
      discount_percent: Number(item.discount_percent || 0),
      discount_price: item.discount_price ? Number(item.discount_price) : null,
      category: {
        name: item.category_name || "Unisex",
        slug: item.category_slug || "unisex",
      },
      category_name: item.category_name || "Unisex",
      image: getImageUrl(item.image_url || item.image, "products"),
      image_url: getImageUrl(item.image_url || item.image, "products"),
      stock: Number(item.total_stock || item.stock || 0),
      is_featured: Boolean(item.is_featured),
    }));

    return { success: true, data: mappedData };
  } catch (error) {
    console.error("Error in getProducts:", error);
    return { success: false, message: "Gagal memuat produk", data: [] };
  }
}

export async function getProductBySlug(slug: string) {
  try {
    const res = await fetchFromApi(
      `/products/detail?slug=${encodeURIComponent(slug)}`,
      { cache: "no-store" },
    );

    const item = res.data || res;
    if (!item)
      return { success: false, message: "Produk tidak ditemukan", data: null };

    const formattedProduct: Product = {
      id: item.product_id || item.id,
      product_id: item.product_id || item.id,
      name: item.name || "Kacamata IDVISION",
      slug: item.slug || "",
      sku: item.sku_base || item.sku || "",
      description: item.description || "",
      price: Number(item.base_price || item.price || 0),
      base_price: Number(item.base_price || item.price || 0),
      discount_percent: Number(item.discount_percent || 0),
      discount_price: item.discount_price ? Number(item.discount_price) : null,
      category: {
        name: item.category_name || "Unisex",
        slug: item.category_slug || "unisex",
      },
      category_name: item.category_name || "Unisex",
      image: getImageUrl(item.image_url || item.image, "products"),
      image_url: getImageUrl(item.image_url || item.image, "products"),
      stock: item.variants?.[0]?.stock_quantity ?? item.total_stock ?? 0,
      is_featured: Boolean(item.is_featured),
      variants: item.variants || [],
      images: item.images || [],
    };

    return { success: true, data: formattedProduct };
  } catch (error) {
    return {
      success: false,
      message: "Detail produk tidak ditemukan",
      data: null,
    };
  }
}

export async function getCategories() {
  try {
    const res = await fetchFromApi("/categories", { cache: "no-store" });
    return {
      success: true,
      data: Array.isArray(res) ? res : res.data || [],
    };
  } catch (error) {
    return { success: false, message: "Gagal memuat kategori", data: [] };
  }
}

/* ==========================================================================
   ENDPOINT TRANSAKSI & CHECKOUT
   ========================================================================== */

export async function processCheckout(payload: any) {
  try {
    return await fetchFromApi("/orders/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return {
      success: false,
      message: "Gagal memproses transaksi. Silakan coba beberapa saat lagi.",
    };
  }
}

export async function getOrderStatus(orderId: string) {
  try {
    return await fetchFromApi(
      `/orders/status?order_id=${encodeURIComponent(orderId)}`,
      { cache: "no-store" },
    );
  } catch (error) {
    return {
      success: false,
      message: "Gagal mengambil status pesanan",
      data: null,
    };
  }
}
