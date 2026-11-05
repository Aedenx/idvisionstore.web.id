import { db } from "@/lib/db";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const gender = searchParams.get("gender");
    const search = searchParams.get("search");
    const sort = searchParams.get("sort");

    let query = `
      SELECT 
        p.product_id,
        p.name,
        p.slug,
        p.sku_base,
        p.description,
        p.base_price,
        p.discount_percent,
        p.discount_price,
        p.is_featured,
        c.name AS category_name,
        c.slug AS category_slug,
        COALESCE(
          (SELECT image_path FROM product_images WHERE product_id = p.product_id AND is_primary = 1 LIMIT 1),
          (SELECT image_path FROM product_images WHERE product_id = p.product_id ORDER BY image_id ASC LIMIT 1)
        ) AS image_path,
        COALESCE(
          (SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.product_id), 
          0
        ) AS total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = 1
    `;

    const params: any[] = [];

    if (category) {
      query += ` AND (c.slug = ? OR LOWER(c.name) = LOWER(?))`;
      params.push(category, category);
    }

    if (gender) {
      query += ` AND (c.slug = ? OR LOWER(c.name) LIKE ?)`;
      params.push(gender, `%${gender.toLowerCase()}%`);
    }

    if (search) {
      query += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(p.sku_base) LIKE ?)`;
      const searchKeyword = `%${search.toLowerCase()}%`;
      params.push(searchKeyword, searchKeyword, searchKeyword);
    }

    if (sort === "price_asc") {
      query += ` ORDER BY COALESCE(p.discount_price, p.base_price) ASC`;
    } else if (sort === "price_desc") {
      query += ` ORDER BY COALESCE(p.discount_price, p.base_price) DESC`;
    } else if (sort === "newest") {
      query += ` ORDER BY p.product_id DESC`;
    } else {
      query += ` ORDER BY p.is_featured DESC, p.product_id DESC`;
    }

    const [rows]: any = await db.query(query, params);

    const formattedProducts = rows.map((p: any) => {
      let finalImageUrl = "/images/placeholder.jpg";

      if (p.image_path) {
        // Jika sudah berupa URL lengkap (Vercel Blob / Cloudinary), gunakan langsung
        if (
          p.image_path.startsWith("http://") ||
          p.image_path.startsWith("https://")
        ) {
          finalImageUrl = p.image_path;
        } else {
          // Fallback untuk file lokal lama
          finalImageUrl = `/uploads/products/${p.image_path}`;
        }
      }

      return {
        id: p.product_id,
        product_id: p.product_id,
        name: p.name,
        slug: p.slug,
        sku_base: p.sku_base,
        description: p.description,
        base_price: Number(p.base_price),
        discount_percent: Number(p.discount_percent || 0),
        discount_price: p.discount_price ? Number(p.discount_price) : null,
        category_name: p.category_name || "Unisex",
        category_slug: p.category_slug || "unisex",
        image_url: finalImageUrl,
        total_stock: Number(p.total_stock || 0),
        is_featured: Boolean(p.is_featured),
      };
    });

    return NextResponse.json({
      success: true,
      data: formattedProducts,
    });
  } catch (error: any) {
    console.error("[GET /api/products Error]:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Gagal memuat produk: " + error.message,
        data: [],
      },
      { status: 500 },
    );
  }
}
