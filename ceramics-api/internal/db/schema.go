package db

// Schema is the SQL DDL to initialize the ceramics-api schema.
const Schema = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS products (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT        NOT NULL,
    description   TEXT        NOT NULL DEFAULT '',
    category      TEXT        NOT NULL,
    price         NUMERIC(12,2) NOT NULL,
    image_urls    TEXT[]      NOT NULL DEFAULT '{}',
    stock_quantity INTEGER    NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('english', name || ' ' || description));

CREATE TABLE IF NOT EXISTS carts (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id   TEXT        NOT NULL UNIQUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart_items (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id    UUID        NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    product_id UUID        NOT NULL REFERENCES products(id),
    quantity   INTEGER     NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL,
    UNIQUE (cart_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id          TEXT        NOT NULL,
    status            TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (status IN ('pending','confirmed','failed')),
    subtotal          NUMERIC(12,2) NOT NULL,
    shipping_cost     NUMERIC(12,2) NOT NULL,
    tax               NUMERIC(12,2) NOT NULL,
    total             NUMERIC(12,2) NOT NULL,
    payment_reference TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_owner_id ON orders(owner_id);

CREATE TABLE IF NOT EXISTS order_items (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id     UUID          NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id   UUID          NOT NULL,
    product_name TEXT          NOT NULL,
    quantity     INTEGER       NOT NULL,
    unit_price   NUMERIC(12,2) NOT NULL,
    line_total   NUMERIC(12,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS shipping_addresses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    line1       TEXT NOT NULL,
    line2       TEXT NOT NULL DEFAULT '',
    city        TEXT NOT NULL,
    region      TEXT NOT NULL DEFAULT '',
    postal_code TEXT NOT NULL,
    country     TEXT NOT NULL,
    phone       TEXT NOT NULL DEFAULT ''
);
`
