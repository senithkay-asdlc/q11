# Requirements Specification: Handmade Ceramics Online Store

## 1. Overview

This project is an online store dedicated to selling handmade ceramics. The
platform allows shoppers to browse a catalog of ceramic products (e.g. mugs,
bowls, vases, plates), add items to a shopping cart, and complete a purchase
through a checkout flow. All catalog, cart, and order data is persisted in a
database so that information survives across sessions and server restarts.

## 2. Actors

- **Shopper (Customer)**: A visitor to the store who browses products, manages
a cart, and places orders. May be anonymous while browsing but must provide
contact and shipping/payment details at checkout.
- **Store Administrator**: A user responsible for managing the product
catalog (creating, updating, removing, and stocking ceramic items).

## 3. Functional Requirements

### 3.1 Product Catalog

- FR-1: The system shall display a list of ceramic products available for
sale, including name, description, price, product images, and available
stock quantity.
- FR-2: The system shall allow shoppers to view a single product's detail
page with full description, price, images, and stock availability.
- FR-3: The system shall allow shoppers to browse products by category (e.g.
mugs, bowls, vases, plates, decor).
- FR-4: The system shall allow shoppers to search products by name or
keyword.
- FR-5: The system shall allow a Store Administrator to create, update, and
delete product listings, including setting price, description, images,
category, and stock quantity.
- FR-6: The system shall prevent shoppers from adding out-of-stock products
to the cart, or shall clearly indicate an item is unavailable.

### 3.2 Shopping Cart

- FR-7: The system shall allow a shopper to add a product (with a chosen
quantity) to a shopping cart.
- FR-8: The system shall allow a shopper to view the contents of their cart,
including product details, quantity, unit price, and computed subtotal per
line item and overall cart total.
- FR-9: The system shall allow a shopper to update the quantity of an item in
the cart or remove an item entirely.
- FR-10: The system shall persist cart contents across browser sessions for
a signed-in shopper, so the cart is not lost if the shopper leaves and
returns.
- FR-11: The system shall validate that requested quantities do not exceed
available stock when items are added to or updated in the cart.

### 3.3 Checkout

- FR-12: The system shall allow a shopper to proceed from the cart to a
checkout flow.
- FR-13: The system shall collect shipping information (name, address,
contact details) from the shopper during checkout.
- FR-14: The system shall collect payment information and process payment
for the order during checkout.
- FR-15: The system shall calculate and display an order summary including
item subtotal, shipping cost, applicable taxes, and final total before the
shopper confirms the order.
- FR-16: The system shall create an order record upon successful checkout,
capturing the items purchased, quantities, prices, shipping details, and
payment confirmation.
- FR-17: The system shall decrement product stock quantities upon successful
order placement.
- FR-18: The system shall display an order confirmation to the shopper after
a successful checkout, including an order number/reference.
- FR-19: The system shall handle checkout failures (e.g. payment declined,
insufficient stock) gracefully, informing the shopper and preserving their
cart contents.

### 3.4 Order History &amp; Accounts

- FR-20: The system shall allow a shopper to create an account and sign in.
- FR-21: The system shall allow a signed-in shopper to view their past
orders and order statuses.

### 3.5 Data Persistence

- FR-22: The system shall use a database to persist all product catalog
data, cart data, order data, and account data, ensuring data is not lost
between sessions or after a service restart.

## 4. Non-Functional Requirements

- NFR-1 (Availability): The store shall be available for browsing and
purchasing during normal business operation with minimal downtime.
- NFR-2 (Performance): Catalog browsing and search shall return results
within a few seconds under normal load.
- NFR-3 (Data Integrity): Stock levels and order totals shall remain
consistent even under concurrent purchases (no overselling of stock).
- NFR-4 (Security): Payment and personal account information shall be
handled securely; access to administrative catalog-management functions
shall be restricted to authorized administrators.
- NFR-5 (Usability): The catalog, cart, and checkout flows shall be simple
and intuitive to use on both desktop and mobile web browsers.
- NFR-6 (Auditability): The system shall retain a durable record of orders
placed, including line items and totals, for customer support and
business reporting purposes.

## 5. Out of Scope

- Physical shipping/logistics integration with external carriers is not
required beyond capturing a shipping address.
- Multi-currency and multi-language support are not required for the
initial release.
- Wholesale/B2B ordering workflows are not required.

## 6. Assumptions

- A single storefront serving individual consumer shoppers (B2C), not a
multi-tenant marketplace of multiple sellers.
- Payment processing may integrate with a third-party payment provider
rather than the store handling raw card data directly.

