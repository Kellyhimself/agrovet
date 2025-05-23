# Agrovet Management System Development Plan

## MVP Features

### Multi-tenant SaaS Features
- Unique AgrovetID for each shop
- Subscription management (30-day free trial)
- Feature access control based on subscription status
- Shop-specific data isolation

### Inventory Management
- Add, update, and track stock (e.g., fertilizers, seeds, veterinary drugs)
- Alerts for low stock (<10 units) or expiring products (<30 days to expiry)
- Barcode scanning via smartphone camera for quick stock entry
- Shop-specific inventory filtering

### Sales Tracking
- Record sales with inputs for product, quantity, price, and payment method
- Generate daily/weekly sales reports (exportable as CSV)
- Support for cash, M-Pesa, and credit sales (track credit balances)
- Shop-specific sales data

### Offline Mode
- Allow inventory and sales data entry offline, syncing when internet is available
- Shop-specific offline data storage

### User-Friendly Interface
- Simple dashboard with minimal clicks for key tasks
- Support for English and Swahili (language toggle)
- Mobile-optimized layout with specific breakpoints:
  - Small Mobile: width <= 358px
  - Small-Medium Mobile: width > 358px && width <= 409px
  - Medium Mobile: width > 409px && width <= 480px
  - Desktop: width > 480px

### Customer Management
- Basic CRM to store customer details (name, phone, purchase history)
- Track customer preferences (e.g., frequently bought products)
- Shop-specific customer data

### Compliance Tracking
- Log regulated products for reporting to the Pest Control Products Board (PCPB)
- Generate compliance reports (e.g., list of regulated products sold)
- Shop-specific compliance data

## Technology Stack

### Frontend
- Next.js (React) with TypeScript
- Tailwind CSS for responsive design with custom breakpoints
- Responsive design utilities for specific mobile dimensions

### Backend
- Supabase (PostgreSQL) for database and authentication
- Row Level Security (RLS) for multi-tenant data isolation

### Additional Technologies
- next-pwa for Progressive Web App functionality
- quaggaJS or react-qr-barcode-scanner for smartphone barcode scanning
- M-Pesa integration via Safaricom Daraja API
- Vercel for deployment
- Vercel Analytics for basic usage tracking
- next-i18next for English/Swahili support

## Database Schema

```sql
-- Shops (Tenants)
CREATE TABLE shops (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  agrovet_id VARCHAR(50) UNIQUE NOT NULL,
  location VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  business_type VARCHAR(50) NOT NULL,
  opening_hours VARCHAR(255) NOT NULL,
  description TEXT,
  subscription_status VARCHAR(50) DEFAULT 'trial',
  trial_start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  subscription_end_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products (Inventory)
CREATE TABLE products (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  quantity INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  expiry_date DATE,
  is_regulated BOOLEAN DEFAULT FALSE,
  barcode VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sales
CREATE TABLE sales (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  product_id UUID REFERENCES products(id),
  customer_id UUID REFERENCES customers(id),
  quantity INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  payment_method VARCHAR(50),
  sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  credit_paid BOOLEAN DEFAULT FALSE
);

-- Credit Payments
CREATE TABLE credit_payments (
  id UUID PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  shop_id UUID REFERENCES shops(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  payment_method VARCHAR(50) NOT NULL,
  notes TEXT
);

-- Customers
CREATE TABLE customers (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  preferences TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Compliance Logs
CREATE TABLE compliance_logs (
  id UUID PRIMARY KEY,
  shop_id UUID REFERENCES shops(id),
  product_id UUID REFERENCES products(id),
  sale_id UUID REFERENCES sales(id),
  reported BOOLEAN DEFAULT FALSE,
  report_date TIMESTAMP
);

-- Row Level Security Policies
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;

-- Example RLS Policy for Products
CREATE POLICY "Shop can only access their own products"
  ON products
  FOR ALL
  USING (shop_id = auth.uid());
```

## Development Phases

### Phase 1: Planning and Setup (1 Week)
**Duration:** 5-7 days
**Goals:** Define database schema, set up the project, and configure tools

#### Requirements Refinement
- Finalize multi-tenant database schema
- Set up Row Level Security policies
- Configure subscription management

#### Project Setup
1. Initialize Next.js project:
```bash
npx create-next-app@latest agrovet-app --typescript
```

2. Install dependencies:
```bash
npm install @supabase/supabase-js next-pwa tailwindcss postcss autoprefixer @tailwindcss/typography next-i18next quagga
```

3. Configure Tailwind CSS with custom breakpoints:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '359px',
      'sm-md': '410px',
      'md': '481px',
      'lg': '1024px',
      'xl': '1280px',
    },
  },
}
```

4. Set up Supabase:
- Create project at supabase.com
- Configure environment variables
- Set up database schema and RLS policies

5. Vercel Setup:
- Create account and link project
- Configure custom domain
- Set up environment variables

**Deliverables:** Project scaffold, Supabase database with RLS, initial Vercel deployment

### Phase 2: Core Feature Development (3-4 Weeks)
**Duration:** 21-28 days
**Goals:** Build inventory, sales, offline mode, and basic UI

#### Multi-tenant Setup (1 Week)
- Shop registration and management
- Subscription handling
- Data isolation implementation

#### Inventory Management (1 Week)
- Add/edit/delete products with shop context
- Low stock and expiry alerts
- Barcode scanning implementation

#### Sales Tracking (1 Week)
- Sales recording system with shop context
- Report generation
- M-Pesa integration

#### Offline Mode (0.5 Week)
- Offline data storage with shop context
- Sync mechanism
- Conflict resolution

#### User Interface (0.5 Week)
- Dashboard implementation
- Language toggle
- Mobile optimization with specific breakpoints:
  - Small Mobile (≤358px)
  - Small-Medium Mobile (359px-409px)
  - Medium Mobile (410px-480px)
  - Desktop (>480px)

**Deliverables:** Functional inventory and sales modules, offline support, basic dashboard

### Phase 3: Customer Management and Compliance (1-2 Weeks)
**Duration:** 7-14 days
**Goals:** Add customer management and compliance tracking

#### Customer Management (1 Week)
- Customer CRUD operations with shop context
- Purchase history tracking
- Preference management

#### Compliance Tracking (0.5 Week)
- Regulated products logging with shop context
- Report generation
- PCPB compliance features

**Deliverables:** Customer management and compliance modules

### Phase 4: Testing and Deployment (1 Week)
**Duration:** 5-7 days
**Goals:** Test, deploy, and prepare for user onboarding

#### Testing
- Core feature testing
- Offline functionality
- Barcode scanning
- M-Pesa integration
- Multi-tenant data isolation
- Subscription management

#### Deployment
- Production deployment
- Domain configuration
- Environment setup

#### Onboarding
- Video tutorial
- Support system
- User documentation

**Deliverables:** Live app, onboarding materials

## Project Structure

```
agrovet-app/
├── pages/
│   ├── index.tsx           # Dashboard
│   ├── products.tsx        # Inventory management
│   ├── sales.tsx           # Sales tracking
│   ├── customers.tsx       # Customer management
│   ├── compliance.tsx      # Compliance reports
│   ├── shop/
│   │   ├── register.tsx    # Shop registration
│   │   ├── settings.tsx    # Shop settings
│   │   └── subscription.tsx # Subscription management
│   ├── api/
│   │   ├── mpesa.ts        # M-Pesa integration
│   │   ├── mpesa-callback.ts
├── public/
│   ├── locales/            # English/Swahili translations
│   ├── manifest.json       # PWA manifest
├── components/
│   ├── Dashboard.tsx       # Reusable dashboard components
│   ├── ProductForm.tsx     # Add/edit product form
│   ├── BarcodeScanner.tsx  # Barcode scanning component
│   ├── ShopContext.tsx     # Shop context provider
├── lib/
│   ├── supabase.ts        # Supabase client setup
│   ├── offline.ts         # Offline data syncing
│   ├── subscription.ts    # Subscription management
├── styles/
│   ├── globals.css        # Tailwind CSS
├── next.config.js          # PWA and Next.js config
├── i18n.js                # Localization config
```

## Timeline and Effort

**Total Duration:** 6-8 weeks

**Team:** 1-2 developers

**Effort Breakdown:**
- Phase 1: 20-30 hours
- Phase 2: 60-80 hours
- Phase 3: 20-40 hours
- Phase 4: 20-30 hours

## Post-MVP Considerations

### Pilot Testing
- Launch with 5-10 agrovets in regions like Nakuru or Eldoret
- Collect feedback via WhatsApp or forms

### Feature Expansion
- Supplier management
- Advanced analytics
- Enhanced offline capabilities
- Additional subscription tiers

### Monetization
- 30-day free trial for all features
- Premium tier (KSh 500-1000/month) for continued access
- Enterprise tier for multiple locations

## Next Steps

1. Set up the Next.js project and Supabase (1-2 hours)
2. Create the multi-tenant database schema and RLS policies
3. Deploy a skeleton app to Vercel with your custom domain
4. Begin shop registration and subscription management implementation 

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('shops', 'shop_users', 'customers', 'products', 'sales', 'compliance_logs') ORDER BY schemaname, tablename;
