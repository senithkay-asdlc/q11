# Design: Handmade Ceramics Online Store

## 1. Overview

The system is an online storefront for handmade ceramics. Shoppers browse a
product catalog, manage a shopping cart, and complete checkout (shipping,
payment, and order confirmation). A Store Administrator manages the product
catalog. The system is decomposed into a single-page storefront web
application and a backend API service that owns all persistent data
(products, carts, orders, accounts) in a relational database. Sign-in is
delegated to the platform's Thunder identity provider, and payment is
processed through a third-party payment provider.

## 2. Components

- **ceramics-webapp** (`web-application`) — the customer-facing (and
administrator-facing) single-page storefront: catalog browsing, search,
cart management, checkout, order confirmation/history, and an
admin-only catalog-management area. One SPA serves both roles, gated by
the signed-in user's role.
- **ceramics-api** (`service`) — the backend API owning the product catalog,
cart, order, and account data; enforces stock validation and integrates
with the payment provider to process checkout payments.

## 3. Capabilities

### ceramics-webapp

- Product listing and category browsing (FR-1, FR-3).
- Product detail view (FR-2).
- Product search (FR-4).
- Cart view/add/update/remove with running totals (FR-7–FR-11).
- Checkout flow: shipping form, payment form, order summary, confirmation
and failure handling (FR-12–FR-19).
- Sign-in / account creation and order history view (FR-20, FR-21).
- Admin catalog management screens: create/update/delete products, manage
stock (FR-5), restricted to the Store Administrator role.

### ceramics-api

- Catalog CRUD and query API: list/search/filter products by category and
keyword, fetch product detail, and admin create/update/delete (FR-1–FR-6).
- Cart API: add/update/remove line items, compute subtotal/total, persist
cart per signed-in shopper (FR-7–FR-11).
- Checkout API: validate stock, collect shipping details, calculate order
totals (subtotal, shipping, tax), call the payment provider to charge the
order, create the order record, decrement stock atomically, and return an
order confirmation or a clear failure without losing cart state
(FR-12–FR-19).
- Order history API: list a signed-in shopper's past orders and statuses
(FR-21).
- Account resolution: identifies the signed-in caller and their role
(shopper vs. administrator) from the platform-injected identity.
- Persists all catalog, cart, order, and account-linked data durably in a
relational database (FR-22).

## 4. Data model

- **Product**: id, name, description, category, price, imageUrls\[\],
stockQuantity, createdAt, updatedAt.
- **CartItem**: id, cartId (owner/shopper id), productId, quantity, unit
price (snapshot).
- **Cart**: id, ownerId (shopper user id), items\[\], updatedAt.
- **Order**: id, ownerId, status (pending/confirmed/failed), items\[\]
(productId, name, quantity, unitPrice), subtotal, shippingCost, tax,
total, shippingAddress, paymentReference, createdAt.
- **OrderItem**: orderId, productId, quantity, unitPrice, lineTotal.
- **ShippingAddress**: name, line1, line2, city, region, postalCode,
country, phone.

Relationships: a Product has many CartItems and OrderItems; a Cart (one per
shopper) has many CartItems; an Order (one per checkout) has many
OrderItems and one ShippingAddress.

## 5. Roles &amp; access

- **Shopper**: browses catalog, manages own cart, completes checkout, views
own order history. Identified by the signed-in user id; unauthenticated
visitors may browse but must sign in to check out.
- **Store Administrator**: everything a Shopper can do, plus create/update/
delete products and adjust stock. Determined by the signed-in user's role
group.

## 6. Interactions

- `ceramics-webapp -> ceramics-api`: all catalog, cart, checkout, order, and
admin operations.
- `ceramics-webapp -> user-auth` (Thunder): OIDC sign-in for shoppers and
administrators.
- `ceramics-api -> user-auth` (Thunder): the platform gateway validates the
caller's token and injects identity/role headers into every request.
- `ceramics-api -> payment-provider`: charges the order total during
checkout.

## 7. Data flow — checkout walkthrough

1. Shopper signs in via Thunder from `ceramics-webapp`.
2. Shopper browses/searches the catalog (served by `ceramics-api`), adds
 items to their cart; each add/update is validated against current stock.
3. Shopper proceeds to checkout, enters shipping details; `ceramics-api`
 computes the order summary (subtotal, shipping, tax, total).
4. Shopper confirms; `ceramics-api` re-validates stock, charges the total via
 the payment provider, and on success creates the Order record and
 decrements stock for each line item.
5. `ceramics-webapp` displays the order confirmation with an order
 reference; on payment or stock failure, the shopper sees a clear error
 and the cart is preserved unchanged.
6. The shopper can later view the order and its status in their order
 history.