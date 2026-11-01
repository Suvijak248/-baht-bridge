# BahtBridge Prototype

Mobile UX/UI prototype for a foreign-product order-management app. It demonstrates the core flow: multiple countries and currencies → exchange-rate API → THB conversion → total → customer confirmation.

## Run

Run the following in the project folder, then open `http://localhost:4173` in your browser:

```bash
npm start
```

No package installation is required. On a mobile-width screen it fills the viewport; on desktop it is shown in a phone frame.

## Files

- `index.html` — 7 presentation screens and content
- `styles.css` — BahtBridge visual design system and responsive styling
- `app.js` — screen navigation / API state demo behaviour
- `server.js` — zero-dependency local development server

## Prototype flow

Merchant Dashboard → Create Order → API Loading → Order Summary → Customer Order.

The **Orders** screen includes an API error-state preview; selecting **ลองอีกครั้ง** returns to the successful conversion path.
