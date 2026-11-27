# Slice Studio: Pizza Delivery App (OIBSIP Level 3)

Full-stack app. **React** (front end, built with Vite), **Node.js + Express** (API), **MongoDB** (data), **Razorpay** (test-mode payments), **Nodemailer** (email).

What it does:
- Customer registration, login, **email verification**, **forgot / reset password**. The admin account is created from `.env` (never from sign-up) and logs in at `/admin-login`.
- **Pizza builder**: base, sauce, cheese, vegetables, with a **live price**. The server recalculates the price, so it cannot be changed from the browser.
- **Ready-made varieties** (Margherita, Garden Veggie, Spicy Barbecue) that prefill the builder; 5 bases, 5 sauces, cheeses and vegetables.
- **Order summary** step before payment.
- **Ready-made varieties** (Margherita, Garden Veggie, Spicy Barbecue) that prefill the builder, 5 bases, 5 sauces, 5 cheeses, vegetables.
- **Order summary** step before payment.
- **Razorpay test payment** (the order is marked paid only after the server checks Razorpay's signature).
- **Admin**: inventory (edit stock and low-stock level), **low-stock email alert**, order list with **status updates**. A **node-cron** job also checks stock on a schedule (`LOW_STOCK_CRON`, default every 30 minutes), in addition to the instant check after each order. A **node-cron** job also checks stock on a schedule (`LOW_STOCK_CRON`, default every 30 minutes), in addition to the instant check after each order.
- **User dashboard**: each order shows **Received, In the kitchen, Sent to delivery** (refreshes by itself).

## What you must install or create

| Needed | Required? | Where to get it |
|---|---|---|
| Node.js 18 or newer | yes | https://nodejs.org |
| MongoDB database | yes | Easiest: free MongoDB Atlas cluster at https://cloud.mongodb.com (create a cluster, add a database user, allow your IP under Network Access, copy the connection string). Or install MongoDB Community locally and use `mongodb://127.0.0.1:27017/pizza_app`. |
| Razorpay test keys | only for real payments | https://razorpay.com, sign up, switch Dashboard to **Test Mode**, Account & Settings, API Keys, Generate Test Key. Gives a Key Id (`rzp_test_...`) and a Key Secret. |
| SMTP email account | only for real emails | Gmail works: turn on 2-Step Verification, create an **App Password**, use `smtp.gmail.com`, port `587`, your Gmail address and the app password. |

Everything is set in **one file**: `.env`.

## Setup (5 steps)

```bash
# 1. open a terminal in this folder, then install everything
npm run install-all

# 2. create your settings file
cp .env.example .env          # on Windows: copy .env.example .env

# 3. open .env in a text editor and fill it in (every line is explained)
#    At minimum set MONGO_URI. JWT_SECRET should be your own random text.

# 4. build the front end
npm run build

# 5. start the app
npm start
```
Open **http://localhost:5000**. The first start fills the inventory with 20 ingredients.

## `.env` template

The same text is in `.env.example` with comments. Variables: `PORT`, `JWT_SECRET`, `APP_URL`, `MONGO_URI`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `LOW_STOCK_CRON`, `ADMIN_ALERT_EMAIL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `DEMO_SHOW_LINKS`, `ALLOW_UNPAID_DEMO_ORDERS`.

## What happens when something is not configured

The app still starts. A yellow **Setup notice** bar at the top tells you what is missing. Nothing is faked.

| Missing | Behaviour |
|---|---|
| MongoDB | Server starts, shows "Database is NOT connected", retries every 10 s. |
| Razorpay keys | Order is saved as **UNPAID (demo, no payment taken)**, shown in red/orange everywhere, never as paid. Set `ALLOW_UNPAID_DEMO_ORDERS=false` to block ordering instead. |
| SMTP | No email is sent and the screen says **"Email was NOT sent"**. With `DEMO_SHOW_LINKS=true` the verification / reset link is shown on screen so you can still continue. Low-stock alerts are saved on the admin page with "Email NOT sent". |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | No admin account is created (the server log says so). Password must be 8+ characters. |

For a real deployment set `DEMO_SHOW_LINKS=false` and `ALLOW_UNPAID_DEMO_ORDERS=false`.

## Demo script for the submission video (about 5 minutes)

Use two browser windows (or one normal and one private) so you can show customer and admin side by side. First set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`. First set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`.

1. **Start** the app (`npm start`) and open http://localhost:5000. Point out the setup notice bar.
2. **Admin account.** Show that Register has no admin option. The admin already exists from `.env`. Open `/admin-login`.
3. **Log in as admin** at `/admin-login`. You land on the Admin page. Show the Inventory table. Set **Mozzarella** low-stock level to a number just under its stock (for example stock 60, level 59) and click **Save**.
4. **Register a customer** in the other window: Account type **Customer**. Try to **Log in before verifying** to show it is refused ("Please verify your email first"). Then verify using the email link (or demo link) and log in.
5. **Forgot password** (optional, 30 s): Log out, click **Forgot password?**, enter the email, open the link, set a new password, log in again.
6. **Build a pizza.** Click **Cheese Burst**, **Spicy Arrabbiata**, **Mozzarella**, then **Mushroom** and **Capsicum**. Watch the **Live price** change. Set quantity 2. Click **Add to order**. Add a second pizza (Thin Crust, Tomato Basil, Cheddar, Onion). Show the order total.
7. **Pay.** Type a delivery address. Click **Pay with Razorpay**. In the Razorpay test window use test card `4111 1111 1111 1111`, any future expiry, any CVV, and for OTP/bank pages choose Success. (Razorpay's current test card list: https://razorpay.com/docs/payments/payments/test-card-details/)
8. You land on **My orders**: the order shows **Received** and **Paid (Razorpay)**.
9. **Admin window.** Reload. Show the order, then show the **Low-stock alerts** box (Mozzarella) and, if SMTP is set, the email in the admin's inbox. Change the order status to **In the kitchen**.
10. **Customer window.** Within a few seconds the dashboard shows **In the kitchen**. Back in admin set **Sent to delivery**. Show the customer dashboard turn to **Sent to delivery**.
11. Show the **Inventory** table: stock went down for each used ingredient.

## Project layout

```
.env.example         settings template (copy to .env)
server/              Express API (auth, ingredients, orders, payments, admin)
client/              React app (src/pages: Auth, Account, Builder, Dashboard, Admin)
```
`npm run dev:server` and `npm run dev:client` run the two parts separately for development (client on http://localhost:5173).

## Notes

- Money is in Indian rupees because Razorpay test mode uses INR.
- Never push your real `.env` to GitHub (`.gitignore` already excludes it).
- Order stock is taken only once per order, when payment is verified (or, in demo mode, when the unpaid demo order is created).
