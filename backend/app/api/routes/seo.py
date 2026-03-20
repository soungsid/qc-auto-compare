"""
Generate dynamic sitemap.xml for SEO
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.db.models import Dealer, Vehicle

router = APIRouter(tags=["SEO"])


@router.get("/sitemap.xml", response_class=Response)
async def get_sitemap(db: AsyncSession = Depends(get_db)) -> Response:
    """
    Generate dynamic sitemap.xml with all pages, vehicles, and dealers
    """
    base_url = "https://qcautocompare.ca"
    now = datetime.now().strftime("%Y-%m-%d")
    
    # Static pages
    static_pages = [
        {"loc": f"{base_url}/", "changefreq": "daily", "priority": "1.0"},
        {"loc": f"{base_url}/dealers", "changefreq": "weekly", "priority": "0.8"},
        {"loc": f"{base_url}/about", "changefreq": "monthly", "priority": "0.7"},
        {"loc": f"{base_url}/contact", "changefreq": "monthly", "priority": "0.6"},
        {"loc": f"{base_url}/blog", "changefreq": "weekly", "priority": "0.7"},
        {"loc": f"{base_url}/legal", "changefreq": "yearly", "priority": "0.3"},
    ]
    
    # Get all dealers
    dealers_result = await db.execute(
        select(Dealer.slug, Dealer.city, Dealer.brand)
        .where(Dealer.is_active == True)
    )
    dealers = dealers_result.all()
    
    # Get active vehicles (sample for major brands/models)
    vehicles_result = await db.execute(
        select(Vehicle.make, Vehicle.model, Vehicle.year)
        .where(Vehicle.is_active == True)
        .distinct()
        .limit(500)  # Limit to avoid huge sitemap
    )
    vehicles = vehicles_result.all()
    
    # Build XML
    xml_lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    
    # Add static pages
    for page in static_pages:
        xml_lines.append(f"""
  <url>
    <loc>{page['loc']}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>""")
    
    # Add dealer pages
    for dealer in dealers:
        xml_lines.append(f"""
  <url>
    <loc>{base_url}/dealers/{dealer.slug}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>""")
    
    # Add search pages for popular make/model combinations
    for vehicle in vehicles:
        make_slug = vehicle.make.lower().replace(' ', '-')
        model_slug = vehicle.model.lower().replace(' ', '-')
        xml_lines.append(f"""
  <url>
    <loc>{base_url}/?make={make_slug}&amp;model={model_slug}</loc>
    <lastmod>{now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.6</priority>
  </url>""")
    
    xml_lines.append('</urlset>')
    
    xml_content = '\n'.join(xml_lines)
    
    return Response(
        content=xml_content,
        media_type="application/xml",
        headers={
            "Cache-Control": "public, max-age=3600"
        }
    )


@router.get("/robots.txt", response_class=Response)
async def get_robots() -> Response:
    """
    Generate robots.txt for SEO
    """
    base_url = "https://qcautocompare.ca"
    
    robots_content = f"""User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /*.json$

# Sitemap
Sitemap: {base_url}/sitemap.xml

# Crawl-delay (optional, for rate limiting)
Crawl-delay: 1

# Popular search engines
User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

User-agent: Slurp
Allow: /
"""
    
    return Response(
        content=robots_content,
        media_type="text/plain",
        headers={
            "Cache-Control": "public, max-age=86400"
        }
    )
