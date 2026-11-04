import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const search = searchParams.get("search");

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
        ) AS image,
        (SELECT SUM(stock_quantity) FROM product_variants WHERE product_id = p.product_id) AS total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.category_id
      WHERE p.is_active = 1
    `;

    const params: any[] = [];

    if (category) {
      query += ` AND (c.slug = ? OR LOWER(c.name) = LOWER(?))`;
      params.push(category, category);
    }

    if (search) {
      query += ` AND (LOWER(p.name) LIKE ? OR LOWER(p.description) LIKE ?)`;
      params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
    }

    query += ` ORDER BY p.product_id DESC`;

    const [rows]: any = await db.query(query, params);

    const formatted = rows.map((p: any) => {
      // Hilangkan "products/" atau "uploads/" jika sudah ada di dalam image_path database
      let cleanImage = p.image ? p.image.trim().replace(/^\/+/, "") : null;
      if (cleanImage) {
        if (cleanImage.startsWith("uploads/"))
          cleanImage = cleanImage.replace(/^uploads\//, "");
        if (cleanImage.startsWith("products/"))
          cleanImage = cleanImage.replace(/^products\//, "");
      }

      return {
        product_id: p.product_id,
        id: p.product_id,
        name: p.name,
        slug: p.slug,
        sku_base: p.sku_base,
        description: p.description,
        base_price: Number(p.base_price),
        discount_percent: Number(p.discount_percent || 0),
        discount_price: p.discount_price ? Number(p.discount_price) : null,
        category_name: p.category_name || "Unisex",
        category_slug: p.category_slug || "unisex",
        image_url: cleanImage ? `/uploads/products/${cleanImage}` : null,
        total_stock: Number(p.total_stock || 0),
        is_featured: Boolean(p.is_featured),
      };
    });

    return NextResponse.json({
      success: true,
      data: formatted,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 },
    );
  }
}
