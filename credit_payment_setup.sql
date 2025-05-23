CREATE TABLE IF NOT EXISTS credit_payments (id UUID PRIMARY KEY DEFAULT uuid_generate_v4(), sale_id UUID REFERENCES sales(id) ON DELETE CASCADE, shop_id UUID REFERENCES shops(id) ON DELETE CASCADE, amount DECIMAL(10,2) NOT NULL, payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, payment_method VARCHAR(50) NOT NULL, notes TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);
ALTER TABLE credit_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Shop can view their own credit payments" ON credit_payments FOR SELECT USING (shop_id = auth.uid());
CREATE POLICY "Shop can insert their own credit payments" ON credit_payments FOR INSERT WITH CHECK (shop_id = auth.uid());
CREATE POLICY "Shop can update their own credit payments" ON credit_payments FOR UPDATE USING (shop_id = auth.uid());
CREATE OR REPLACE FUNCTION update_credit_paid_status() RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM sales s 
    LEFT JOIN credit_payments cp ON s.id = cp.sale_id 
    WHERE s.id = NEW.sale_id 
    GROUP BY s.id, s.total_price 
    HAVING COALESCE(SUM(cp.amount), 0) = s.total_price
  ) THEN 
    UPDATE sales SET credit_paid = TRUE WHERE id = NEW.sale_id;
  ELSE
    UPDATE sales SET credit_paid = FALSE WHERE id = NEW.sale_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER update_credit_paid_trigger AFTER INSERT OR UPDATE ON credit_payments FOR EACH ROW EXECUTE FUNCTION update_credit_paid_status();
CREATE OR REPLACE VIEW credit_sales_with_payments AS 
SELECT 
  s.id as sale_id,
  s.shop_id,
  s.customer_id,
  s.total_price as sale_amount,
  s.sale_date,
  s.credit_paid,
  COALESCE(SUM(cp.amount), 0) as total_paid,
  GREATEST(s.total_price - COALESCE(SUM(cp.amount), 0), 0) as remaining_balance,
  c.name as customer_name,
  c.phone as customer_phone,
  p.name as product_name
FROM sales s
LEFT JOIN credit_payments cp ON s.id = cp.sale_id
LEFT JOIN customers c ON s.customer_id = c.id
LEFT JOIN products p ON s.product_id = p.id
WHERE s.payment_method = 'credit'
GROUP BY s.id, s.shop_id, s.customer_id, s.total_price, s.sale_date, s.credit_paid, c.name, c.phone, p.name;
