# Momtazchem Chemical Solutions Platform

## Overview
The Momtazchem Chemical Solutions Platform is a comprehensive, multilingual system integrating a public showcase website, e-commerce, and administrative tools for a chemical company. Its primary purpose is to optimize CRM, inventory, sales, logistics, and financial management while expanding market reach. Key capabilities include multi-language support (English, Arabic, Kurdish, Turkish), unified site management, advanced e-commerce, GPS tracking, real-time analytics, email automation, barcode and Kardex-synced inventory, and financial management. The project aims to establish Momtazchem as a digital leader in the chemical industry.

## Software releases
The footer displays the software version from `package.json`. For a tracked release, bump the version in `package.json` and the root entries of `package-lock.json`, then prepend an entry with the same version, date, and user-visible changes in `client/src/pages/release-notes.tsx`. Preserve existing entries and only backfill past version numbers supported by release records or tags.

## User Preferences
Preferred communication style: Simple, everyday language.

Database Cost Optimization (CRITICAL):
- Minimize database compute/queries to reduce Neon PostgreSQL costs
- Use batch queries with ANY($1) instead of Promise.all with individual queries
- Avoid N+1 query patterns - fetch related data in single JOIN queries
- Use in-memory caching for frequently accessed data
- Limit result sets with appropriate WHERE clauses and LIMIT
- Prefer COUNT(*) over fetching full rows when only count is needed

Critical Security Requirements:
- Extreme vigilance in wallet transaction processing
- Always verify customer_id matches between orders and wallet transactions
- Never allow cross-customer wallet operations
- Implement quadruple verification for all payment corrections
- Maintain detailed audit trails for all financial operations

Order Management ID Convention:
- ALWAYS use `order_management.id` as the canonical identifier for all department operations (finance, warehouse, logistics)
- NEVER use `customerOrderId` for API endpoints - it causes ID collisions when values coincide
- Frontend must send `selectedOrder.id` (not `selectedOrder.customerOrderId`) to backend
- All status change endpoints use atomic UPDATE with status condition for optimistic locking
- Returns 409 Conflict if order was already processed by another user (concurrency protection)

## Recent Feature Additions (April 2026)

### Product Detail & Review System
- **Product Detail Page** (`/shop/product/:id`): Full product page with image, description, price, stock status, rating summary (average + star distribution histogram), and a preview of the latest 3 customer reviews. Links to the full review page.
- **Product Reviews Page** (`/product-reviews/:id`): Dedicated page for all reviews with rating breakdown, review list, and a submit/edit review form. Only authenticated customers can submit reviews.
- **Review Authentication**: Non-logged-in visitors see a lock icon with a "ورود به حساب کاربری" button. Clicking it opens the same `AuthModal` used in the shop checkout — no page redirect needed. After login, the review form appears instantly.
- **Review Editing**: Logged-in customers can edit their previously submitted review. Null/empty comments are handled safely (no trim-on-null error).
- **Review API** (`POST /api/products/:id/reviews`): Requires `req.session.customerId`. Unauthenticated requests receive 401. Updates existing review if customer already reviewed the product.

### Dynamic Homepage Categories
- **"Our Product Portfolio"** section on the homepage now fetches all active categories from the database via `GET /api/public/categories` instead of showing 4 hardcoded entries.
- Category icons are auto-assigned via `getCategoryMeta()` helper based on category name keywords.

### Category Admin in Content Management
- New **"کتگوری‌های صفحه اصلی"** tab added to the Content Management admin panel.
- Admins can edit category name, description, and image URL for each `shop_categories` record via `PUT /api/admin/categories/:id`.

## System Architecture

### UI/UX Decisions
The platform features a professional, modern, and multilingual UI. It uses responsive design with Tailwind CSS and Shadcn/ui, adapting dynamically for RTL/LTR languages. Visual consistency is achieved through a unified design system, professional iconography (Lucide React), and smooth animations (Framer Motion). Color schemes denote status or categorize information. The administrative interface prioritizes intuitive design with drag-and-drop functionality and clear visual indicators.

### Technical Implementations
The system is built on a robust full-stack architecture with comprehensive security, including multi-level authentication, session management, password hashing (Bcrypt), and role-based access control. It integrates real-time capabilities for GPS tracking, inventory alerts, and order status. The platform supports dynamic multilingual content localization and adaptable UI layouts. Core business logic covers product management, order processing, customer relationship management, and logistics, with a strong focus on automation and data integrity. Key features include systematic auto-approval for payments, standardized geographical data, a vehicle template system for logistics, a hybrid payment system, a two-stage warehouse approval system, FIFO (First-In, First-Out) batch management for inventory, and standardized Gregorian date formats for all print functionality. Product displays are filtered to show only products with active status, stock quantity > 0, valid SKU, barcode, and complete documentation (kardex, catalog, MSDS). A persistent customer cart system stores cart data across sessions and syncs with user authentication. The system implements comprehensive payment method support and gateway routing, ensuring proper routing and order number assignment upon payment confirmation. It also features intelligent contact form email routing based on product category, dynamic vehicle template integration, and a configurable global CC email system. Social media links and footer content are managed via the CMS for dynamic updates. Production reset functionality allows optional customer data preservation. Price range filters are optimized for user experience, and a robust order number assignment ensures consistent sequencing. The grace period for bank transfer orders is dynamically configurable through the `shop_settings` table, defaulting to 3 days. AWS S3 credentials are managed securely with AES-256 encryption. Multi-vendor marketplace enables vendors to manage their own products with full admin interface access while maintaining strict security isolation through vendorId-based filtering. Showcase products (kardex) store vendorId and JOIN with vendors table to display vendor_name throughout the system.

**Platform-Agnostic Real-Time Monitoring System**: Comprehensive health monitoring for all critical infrastructure services (PostgreSQL database, AWS S3 storage, FIB payment gateway, and Node.js server). Features real-time dashboard with auto-refresh (every 30 seconds), response time tracking, service status indicators (healthy/degraded/down), system metrics (uptime, memory usage), and admin-only access control. Designed to work seamlessly across any hosting platform (Replit, AWS EC2, DigitalOcean VPS, etc.) using only environment variables and standard Node.js APIs. Accessible via Admin Panel > Server Config > Monitoring tab. Public quick health check endpoint available at `/api/health` for load balancers and external monitoring tools.

**Logistics Notification Settings**: Configurable customer notification channels (Email, SMS, WhatsApp) for order dispatch. Settings managed in Admin > Logistics > Settings tab. Each channel can be enabled/disabled independently. Email enabled by default. Settings stored in `shop_settings` table with category `logistics_notifications`.

### System Design Choices
The architecture emphasizes modularity and scalability, utilizing a RESTful API for backend-frontend communication and ensuring separation of concerns. Data integrity is maintained through transactional operations and a prevention-first approach. A unified vehicle selection algorithm prioritizes cost-efficiency and safety. Inventory management strictly adheres to FIFO principles. A comprehensive email and SMS automation system leverages templates and intelligent routing. The system is designed for continuous integration and deployment, with performance optimization through database indexing, caching, and asset optimization. Modals render directly in the component tree to avoid `removeChild` errors.

### Technology Stack
**Frontend:** React 18 (TypeScript), Tailwind CSS, Wouter, TanStack Query, React Hook Form (Zod), Shadcn/ui, Lucide React, Framer Motion.
**Backend:** Node.js (Express.js, TypeScript), PostgreSQL (Neon Cloud), Drizzle ORM, Express Sessions, Bcrypt, Multer, Nodemailer.

### Database Schema
Key tables cover Customer Management, Order Processing, Product Catalog, Inventory, Logistics, Content Management, and User Management.

**Product Table Convention (CRITICAL)**:
- Use ONLY `shop_products` table for all product operations (80+ columns, complete with pricing, inventory, weights, MSDS, 3D models, vendor support)
- The `products` table is DEPRECATED and EMPTY - do not use it
- Weight fields: Use `gross_weight` first, fallback to `weight` column if null
- All checkout, inventory, and order operations must reference `shop_products`

## External Dependencies

- **Database**: Neon PostgreSQL cloud service
- **Email Service**: Zoho Mail SMTP
- **SMS Services**: Iraqi operators (Asiacell, Zain Iraq, Korek Telecom) and international providers (Twilio, Plivo, Infobip, MSG91)
- **Payment Processing**: First Iraqi Bank (FIB) Online Payment Gateway, Iraqi banks (Rasheed Bank, Al-Rafidain Bank, Trade Bank of Iraq)
- **AI Services**: OpenAI API (for SKU generation, product recommendations)
- **Live Chat**: Tawk.to
- **Cloud Storage**: AWS S3 (for private files like procedure documents)
- **PDF Generation**: Puppeteer, PDFKit/pdfMake
- **Barcode Generation**: GS1-compliant EAN-13 barcode system
- **Remote Desktop**: RustDesk, TeamViewer, AnyDesk, Chrome Remote Desktop, Microsoft RDP