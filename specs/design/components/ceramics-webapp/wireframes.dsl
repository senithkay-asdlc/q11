// Handmade Ceramics Storefront — shopper + administrator screens

screen CatalogHome "Shoppers browse categories, search, and pick a product"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  row
    heading "Handmade Ceramics"
    right
    search "Search mugs, bowls, vases…"
  row
    badge "All" primary
    badge "Mugs"
    badge "Bowls"
    badge "Vases"
    badge "Plates"
    badge "Decor"
  row
    card "Speckled Stoneware Mug | $28 | In stock" -> ProductDetail
    card "Hand-thrown Serving Bowl | $54 | In stock" -> ProductDetail
    card "Tall Ribbed Vase | $76 | Only 2 left" -> ProductDetail
  row
    card "Matte Glaze Dinner Plate | $32 | In stock" -> ProductDetail
    card "Textured Planter | $45 | Out of stock" -> ProductDetail
    card "Minimalist Teapot | $89 | In stock" -> ProductDetail

screen ProductDetail "Shopper views full product detail and adds it to the cart"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  breadcrumb "Shop / Mugs / Speckled Stoneware Mug"
  split 60/40
    left
      image "Speckled Stoneware Mug" 480x320
      heading "Speckled Stoneware Mug"
      text "Hand-thrown in a small studio, finished with a speckled reactive glaze. Dishwasher safe, holds 12oz."
      text "Category: Mugs"
    right
      heading "$28.00"
      badge "In stock — 14 available" success
      select "Quantity: 1"
      button "Add to cart" primary -> Cart
      text "Free shipping on orders over $75"

screen Cart "Shopper reviews cart contents and totals before checkout"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  heading "Your Cart"
  table "Product | Unit price | Quantity | Subtotal"
    row "Speckled Stoneware Mug | $28.00 | 2 | $56.00"
    row "Tall Ribbed Vase | $76.00 | 1 | $76.00"
  row
    right
    text "Cart total: $132.00"
  row
    right
    button "Continue shopping" -> CatalogHome
    button "Proceed to checkout" primary -> Checkout

screen Checkout "Shopper enters shipping and payment details and confirms the order"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  heading "Checkout"
  split 60/40
    left
      heading "Shipping address"
      input "Full name"
      input "Address line 1"
      input "Address line 2 (optional)"
      row
        input "City"
        input "Postal code"
      select "Country: United States"
      heading "Payment"
      input "Card number"
      row
        input "Expiry"
        input "CVC"
    right
      card "Order summary"
        text "Subtotal: $132.00"
        text "Shipping: $6.00"
        text "Tax: $10.56"
        text "Total: $148.56"
      button "Place order" primary -> OrderConfirmation

screen OrderConfirmation "Shopper sees confirmation that their order was placed"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  heading "Order confirmed"
  badge "Confirmed" success
  text "Order #CM-10482 — thank you for your purchase!"
  text "A summary has been saved to your order history."
  table "Product | Quantity | Line total"
    row "Speckled Stoneware Mug | 2 | $56.00"
    row "Tall Ribbed Vase | 1 | $76.00"
  row
    right
    button "View order history" -> OrderHistory
    button "Continue shopping" primary -> CatalogHome

screen OrderHistory "Signed-in shopper reviews their past orders and statuses"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  heading "Your Orders"
  table "Order | Date | Total | Status" -> OrderConfirmation
    row "CM-10482 | Mar 3, 2025 | $148.56 | Confirmed"
    row "CM-10361 | Feb 18, 2025 | $54.00 | Confirmed"
    row "CM-10299 | Feb 2, 2025 | $32.00 | Failed"

screen AdminProductList "Administrator manages the catalog and stock levels"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  row
    heading "Manage Products"
    right
    button "New product" primary -> AdminProductForm
  table "Product | Category | Price | Stock | " -> AdminProductForm
    row "Speckled Stoneware Mug | Mugs | $28.00 | 14 | Edit →"
    row "Tall Ribbed Vase | Vases | $76.00 | 2 | Edit →"
    row "Textured Planter | Decor | $45.00 | 0 | Edit →"

screen AdminProductForm "Administrator creates or edits a product listing"
  navbar "Ceramics Co. | Shop | Cart | Orders | Admin"
  breadcrumb "Admin / Products / Speckled Stoneware Mug"
  heading "Edit Product"
  input "Name — e.g. Speckled Stoneware Mug"
  textarea "Description"
  row
    select "Category: Mugs"
    input "Price (USD)"
  input "Stock quantity"
  image "Product image" 320x200
  row
    right
    button "Delete" danger
    button "Save product" primary -> AdminProductList
